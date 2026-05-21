const db = require('../config/db');
const path = require('path');
const fs = require('fs');

exports.getCourses = async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : '%';
    const category = req.query.category;
    const level = req.query.level;
    const priceFilter = req.query.priceFilter; // 'free' or 'paid'

    let query = `
      SELECT c.*, u.name as lecturer_name,
        COUNT(DISTINCT e.id) as student_count,
        COUNT(DISTINCT l.id) as lesson_count
      FROM courses c
      JOIN users u ON c.lecturer_id = u.id
      LEFT JOIN enrollments e ON e.course_id = c.id
      LEFT JOIN lessons l ON l.course_id = c.id
      WHERE (c.title ILIKE ? OR c.description ILIKE ? OR u.name ILIKE ?)
    `;
    const params = [search, search, search];

    if (category && category !== 'All') {
      query += ' AND c.category = ?';
      params.push(category);
    }
    if (level && level !== 'All') {
      query += ' AND c.level = ?';
      params.push(level);
    }
    if (priceFilter === 'free') {
      query += ' AND c.price = 0';
    } else if (priceFilter === 'paid') {
      query += ' AND c.price > 0';
    }

    query += ' GROUP BY c.id, u.name ORDER BY c.created_at DESC';

    const [courses] = await db.query(query, params);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const [courses] = await db.query(`
      SELECT c.*, u.name as lecturer_name,
        COUNT(DISTINCT e.id) as student_count
      FROM courses c
      JOIN users u ON c.lecturer_id = u.id
      LEFT JOIN enrollments e ON e.course_id = c.id
      WHERE c.id = ?
      GROUP BY c.id, u.name
    `, [req.params.id]);

    if (courses.length === 0) return res.status(404).json({ message: 'Course not found' });

    const [chapters] = await db.query(
      'SELECT * FROM chapters WHERE course_id = ? ORDER BY chapter_order ASC, id ASC',
      [req.params.id]
    );

    const [lessons] = await db.query(
      'SELECT * FROM lessons WHERE course_id = ? ORDER BY lesson_order ASC, id ASC',
      [req.params.id]
    );

    const [assignments] = await db.query(
      'SELECT id, course_id, chapter_id, title, description, type, total_points, due_date FROM assignments WHERE course_id = ?',
      [req.params.id]
    );

    // Group items by chapter
    const chaptersWithLessons = chapters.map(ch => ({
      ...ch,
      lessons: lessons.filter(l => l.chapter_id === ch.id),
      assignments: assignments.filter(a => a.chapter_id === ch.id)
    }));

    // Handle items without chapter
    const uncatLessons = lessons.filter(l => !l.chapter_id);
    const uncatAssignments = assignments.filter(a => !a.chapter_id);
    if (uncatLessons.length > 0 || uncatAssignments.length > 0) {
      chaptersWithLessons.push({
        id: 'uncategorized',
        title: 'Uncategorized',
        lessons: uncatLessons,
        assignments: uncatAssignments
      });
    }

    res.json({ ...courses[0], chapters: chaptersWithLessons, lessons, assignments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCourse = async (req, res) => {
  const { title, description, category, price, level } = req.body;
  let thumbnail_url = null;
  if (req.file) {
    const { uploadToStorage } = require('../config/storage');
    const path = require('path');
    const ext = path.extname(req.file.originalname).toLowerCase();
    thumbnail_url = await uploadToStorage(req.file.buffer, 'avatars', `thumb-${Date.now()}${ext}`, req.file.mimetype);
  }
  try {
    const [result] = await db.query(
      'INSERT INTO courses (title, description, category, thumbnail_url, lecturer_id, price, level) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [title, description, category || 'General', thumbnail_url, req.user.id, price || 0, level || 'Beginner']
    );
    res.status(201).json({ id: result[0].id, title, description, category, thumbnail_url, lecturer_id: req.user.id, price, level });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  const { title, description, category, price, level } = req.body;
  try {
    const [course] = await db.query('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    if (course.length === 0) return res.status(404).json({ message: 'Course not found' });
    if (course[0].lecturer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let thumbnail_url = course[0].thumbnail_url;
    if (req.file) {
      const { uploadToStorage } = require('../config/storage');
      const path = require('path');
      const ext = path.extname(req.file.originalname).toLowerCase();
      thumbnail_url = await uploadToStorage(req.file.buffer, 'avatars', `thumb-${Date.now()}${ext}`, req.file.mimetype);
    }

    await db.query(
      'UPDATE courses SET title=?, description=?, category=?, thumbnail_url=?, price=?, level=? WHERE id=?',
      [
        title || course[0].title, 
        description || course[0].description, 
        category || course[0].category, 
        thumbnail_url, 
        price !== undefined ? price : course[0].price,
        level || course[0].level,
        req.params.id
      ]
    );
    
    res.json({ 
      message: 'Course updated',
      id: req.params.id,
      title: title || course[0].title,
      description: description || course[0].description,
      category: category || course[0].category,
      thumbnail_url,
      price: price !== undefined ? price : course[0].price,
      level: level || course[0].level
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const [course] = await db.query('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    if (course.length === 0) return res.status(404).json({ message: 'Course not found' });
    if (course[0].lecturer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this course' });
    }
    await db.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
