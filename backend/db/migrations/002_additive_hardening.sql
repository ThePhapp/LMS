ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'Beginner',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS chapter_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS lesson_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration VARCHAR(50),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE SET NULL;

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS time_limit INTEGER,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS allow_resubmit BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) DEFAULT 'multiple_choice',
  ADD COLUMN IF NOT EXISTS correct_answer TEXT,
  ADD COLUMN IF NOT EXISTS question_order INTEGER DEFAULT 0;

ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS file_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

WITH duplicate_attempts AS (
  SELECT assignment_id, student_id
  FROM assignment_submissions
  GROUP BY assignment_id, student_id
  HAVING COUNT(*) <> COUNT(DISTINCT attempt_number) OR BOOL_OR(attempt_number IS NULL)
), ranked_attempts AS (
  SELECT submission.id,
         ROW_NUMBER() OVER (
           PARTITION BY submission.assignment_id, submission.student_id
           ORDER BY submission.submitted_at, submission.id
         ) AS attempt_number
  FROM assignment_submissions submission
  JOIN duplicate_attempts duplicate
    ON duplicate.assignment_id = submission.assignment_id
   AND duplicate.student_id = submission.student_id
)
UPDATE assignment_submissions submission
SET attempt_number = ranked.attempt_number
FROM ranked_attempts ranked
WHERE submission.id = ranked.id;

ALTER TABLE assignment_submissions
  ALTER COLUMN attempt_number SET DEFAULT 1,
  ALTER COLUMN attempt_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS chapters_id_course_uidx ON chapters (id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS assignment_submissions_attempt_uidx
  ON assignment_submissions (assignment_id, student_id, attempt_number);

CREATE INDEX IF NOT EXISTS courses_lecturer_idx ON courses (lecturer_id);
CREATE INDEX IF NOT EXISTS chapters_course_order_idx ON chapters (course_id, chapter_order, id);
CREATE INDEX IF NOT EXISTS lessons_course_order_idx ON lessons (course_id, lesson_order, id);
CREATE INDEX IF NOT EXISTS lessons_chapter_idx ON lessons (chapter_id);
CREATE INDEX IF NOT EXISTS enrollments_course_student_idx ON enrollments (course_id, student_id);
CREATE INDEX IF NOT EXISTS lesson_progress_lesson_idx ON lesson_progress (lesson_id);
CREATE INDEX IF NOT EXISTS comments_lesson_created_idx ON comments (lesson_id, created_at);
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments (parent_id);
CREATE INDEX IF NOT EXISTS forum_topics_course_created_idx ON forum_topics (course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_replies_topic_created_idx ON forum_replies (topic_id, created_at);
CREATE INDEX IF NOT EXISTS assignments_course_status_due_idx ON assignments (course_id, status, due_date);
CREATE INDEX IF NOT EXISTS assignments_chapter_idx ON assignments (chapter_id);
CREATE INDEX IF NOT EXISTS assignment_questions_assignment_order_idx
  ON assignment_questions (assignment_id, question_order, id);
CREATE INDEX IF NOT EXISTS assignment_submissions_student_idx
  ON assignment_submissions (student_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS events_course_start_idx ON events (course_id, start_time);
CREATE INDEX IF NOT EXISTS events_lecturer_start_idx ON events (lecturer_id, start_time);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id, is_read, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lessons_chapter_course_fk') THEN
    ALTER TABLE lessons ADD CONSTRAINT lessons_chapter_course_fk
      FOREIGN KEY (chapter_id, course_id) REFERENCES chapters(id, course_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_chapter_course_fk') THEN
    ALTER TABLE assignments ADD CONSTRAINT assignments_chapter_course_fk
      FOREIGN KEY (chapter_id, course_id) REFERENCES chapters(id, course_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_price_nonnegative_check') THEN
    ALTER TABLE courses ADD CONSTRAINT courses_price_nonnegative_check CHECK (price >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_points_positive_check') THEN
    ALTER TABLE assignments ADD CONSTRAINT assignments_points_positive_check CHECK (total_points > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_attempts_nonnegative_check') THEN
    ALTER TABLE assignments ADD CONSTRAINT assignments_attempts_nonnegative_check CHECK (max_attempts >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_attempt_positive_check') THEN
    ALTER TABLE assignment_submissions ADD CONSTRAINT submissions_attempt_positive_check
      CHECK (attempt_number > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_time_order_check') THEN
    ALTER TABLE events ADD CONSTRAINT events_time_order_check CHECK (end_time > start_time) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_values_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_role_values_check
      CHECK (role IN ('student', 'lecturer', 'admin')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_type_values_check') THEN
    ALTER TABLE assignments ADD CONSTRAINT assignments_type_values_check
      CHECK (type IN ('quiz', 'essay')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_status_values_check') THEN
    ALTER TABLE assignments ADD CONSTRAINT assignments_status_values_check
      CHECK (status IN ('draft', 'published', 'archived')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_type_values_check') THEN
    ALTER TABLE assignment_questions ADD CONSTRAINT questions_type_values_check
      CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'essay')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_status_values_check') THEN
    ALTER TABLE assignment_submissions ADD CONSTRAINT submissions_status_values_check
      CHECK (status IN ('submitted', 'graded')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_type_values_check') THEN
    ALTER TABLE events ADD CONSTRAINT events_type_values_check
      CHECK (event_type IN ('lecture', 'deadline', 'livestream', 'other')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_status_values_check') THEN
    ALTER TABLE events ADD CONSTRAINT events_status_values_check
      CHECK (status IN ('upcoming', 'completed', 'cancelled')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_values_check') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_values_check
      CHECK (type IN ('assignment_posted', 'quiz_posted', 'submission_received', 'grade_posted')) NOT VALID;
  END IF;
END
$$;
