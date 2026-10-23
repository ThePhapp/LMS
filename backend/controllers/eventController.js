const db = require('../config/db');

const EVENT_TYPES = new Set(['lecture', 'deadline', 'livestream', 'other']);
const EVENT_STATUSES = new Set(['upcoming', 'completed', 'cancelled']);

function parseDateRange(start, end, { optional = false } = {}) {
  if (optional && start === undefined && end === undefined) return {};
  if (typeof start !== 'string' || typeof end !== 'string') {
    return { error: 'Both start and end times are required' };
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: 'Start and end times must be valid dates' };
  }
  if (endDate <= startDate) {
    return { error: 'End time must be after start time' };
  }

  return { start: startDate.toISOString(), end: endDate.toISOString() };
}

function validateEventInput(body = {}, { partial = false } = {}) {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const result = {};

  if (!partial || input.title !== undefined) {
    result.title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!result.title || result.title.length > 255) {
      return { error: 'Title is required and must be at most 255 characters' };
    }
  }

  if (!partial || input.start_time !== undefined || input.end_time !== undefined) {
    if (partial && (input.start_time === undefined || input.end_time === undefined)) {
      return { error: 'Start and end times must be updated together' };
    }
    const range = parseDateRange(input.start_time, input.end_time);
    if (range.error) return range;
    result.start_time = range.start;
    result.end_time = range.end;
  }

  if (!partial || input.event_type !== undefined) {
    result.event_type = input.event_type || 'lecture';
    if (!EVENT_TYPES.has(result.event_type)) return { error: 'Invalid event type' };
  }

  if (partial && input.status !== undefined) {
    if (!EVENT_STATUSES.has(input.status)) return { error: 'Invalid event status' };
    result.status = input.status;
  }

  if (!partial || input.meeting_link !== undefined) {
    if (input.meeting_link !== undefined && input.meeting_link !== null && typeof input.meeting_link !== 'string') {
      return { error: 'Meeting link must be text' };
    }
    result.meeting_link = typeof input.meeting_link === 'string'
      ? input.meeting_link.trim() || null
      : null;
    if (result.meeting_link && result.meeting_link.length > 500) {
      return { error: 'Meeting link must be at most 500 characters' };
    }
    if (result.meeting_link) {
      try {
        const url = new URL(result.meeting_link);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return { error: 'Meeting link must use HTTP or HTTPS' };
        }
      } catch (_) {
        return { error: 'Meeting link must be a valid absolute URL' };
      }
    }
  }

  return result;
}

function addDatePredicates(predicates, params, column, range) {
  if (!range.start) return;
  predicates.push(`${column} >= ?`, `${column} <= ?`);
  params.push(range.start, range.end);
}

exports.getEvents = async (req, res) => {
  const { startDetail, endDetail } = req.query;
  const range = parseDateRange(startDetail, endDetail, { optional: true });
  if (range.error) return res.status(400).json({ message: range.error });

  try {
    const predicates = [];
    const params = [];

    if (req.user.role === 'student') {
      predicates.push('en.student_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'lecturer') {
      predicates.push('c.lecturer_id = ?');
      params.push(req.user.id);
    }
    addDatePredicates(predicates, params, 'e.start_time', range);

    const enrollmentJoin = req.user.role === 'student'
      ? 'JOIN enrollments en ON en.course_id = c.id'
      : '';
    const whereClause = predicates.length > 0 ? `WHERE ${predicates.join(' AND ')}` : '';
    const [events] = await db.query(`
      SELECT e.*, c.title AS course_title, c.category AS course_category
      FROM events e
      JOIN courses c ON e.course_id = c.id
      ${enrollmentJoin}
      ${whereClause}
      ORDER BY e.start_time ASC
    `, params);

    let deadlines = [];
    if (req.user.role === 'student' || req.user.role === 'lecturer') {
      const deadlinePredicates = ['a.due_date IS NOT NULL', 'a.status = ?'];
      const deadlineParams = ['published'];
      let deadlineJoin = '';

      if (req.user.role === 'student') {
        deadlineJoin = 'JOIN enrollments en ON en.course_id = c.id';
        deadlinePredicates.push('en.student_id = ?');
      } else {
        deadlinePredicates.push('c.lecturer_id = ?');
      }
      deadlineParams.push(req.user.id);
      addDatePredicates(deadlinePredicates, deadlineParams, 'a.due_date', range);

      const [assignmentData] = await db.query(`
        SELECT a.id, a.title, a.due_date, c.title AS course_title, c.id AS course_id
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        ${deadlineJoin}
        WHERE ${deadlinePredicates.join(' AND ')}
      `, deadlineParams);

      deadlines = assignmentData.map((assignment) => ({
        id: `assignment_${assignment.id}`,
        course_id: assignment.course_id,
        course_title: assignment.course_title,
        title: assignment.title,
        start_time: assignment.due_date,
        end_time: assignment.due_date,
        event_type: 'deadline',
        status: 'upcoming',
      }));
    }

    return res.json([...events, ...deadlines]);
  } catch (error) {
    console.error('Event list failed');
    return res.status(500).json({ message: 'Unable to load events' });
  }
};

exports.createEvent = async (req, res) => {
  const courseId = Number(req.body?.course_id);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return res.status(400).json({ message: 'A valid course_id is required' });
  }
  const event = validateEventInput(req.body);
  if (event.error) return res.status(400).json({ message: event.error });

  try {
    const [courses] = await db.query('SELECT id, lecturer_id FROM courses WHERE id = ?', [courseId]);
    if (courses.length === 0) return res.status(404).json({ message: 'Course not found' });
    const course = courses[0];
    if (req.user.role !== 'admin' && Number(course.lecturer_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized for this course' });
    }

    const [result] = await db.query(
      'INSERT INTO events (course_id, lecturer_id, title, start_time, end_time, event_type, meeting_link) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [courseId, course.lecturer_id, event.title, event.start_time, event.end_time, event.event_type, event.meeting_link],
    );

    return res.status(201).json({
      id: result[0].id,
      course_id: courseId,
      lecturer_id: course.lecturer_id,
      ...event,
    });
  } catch (error) {
    console.error('Event creation failed');
    return res.status(500).json({ message: 'Unable to create event' });
  }
};

exports.updateEvent = async (req, res) => {
  const updates = validateEventInput(req.body, { partial: true });
  if (updates.error) return res.status(400).json({ message: updates.error });
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'At least one event field is required' });
  }

  try {
    const [events] = await db.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (events.length === 0) return res.status(404).json({ message: 'Event not found' });
    const existing = events[0];
    if (req.user.role !== 'admin' && Number(existing.lecturer_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await db.query(
      'UPDATE events SET title=?, start_time=?, end_time=?, event_type=?, meeting_link=?, status=? WHERE id=?',
      [
        updates.title ?? existing.title,
        updates.start_time ?? existing.start_time,
        updates.end_time ?? existing.end_time,
        updates.event_type ?? existing.event_type,
        updates.meeting_link !== undefined ? updates.meeting_link : existing.meeting_link,
        updates.status ?? existing.status,
        req.params.id,
      ],
    );
    return res.json({ message: 'Event updated' });
  } catch (error) {
    console.error('Event update failed');
    return res.status(500).json({ message: 'Unable to update event' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const [events] = await db.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (events.length === 0) return res.status(404).json({ message: 'Event not found' });
    const event = events[0];
    if (req.user.role !== 'admin' && Number(event.lecturer_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Event deletion failed');
    return res.status(500).json({ message: 'Unable to delete event' });
  }
};

exports.parseDateRange = parseDateRange;
exports.validateEventInput = validateEventInput;
