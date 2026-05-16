require('dotenv').config();
const { Pool } = require('pg');

async function initializeDB() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    console.log('Connected to PostgreSQL (Supabase).');

    // Users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'lecturer', 'admin')),
        avatar_url VARCHAR(500)
      )
    `);

    // Courses
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'General',
        thumbnail_url VARCHAR(500),
        lecturer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        price NUMERIC(10,2) DEFAULT 0,
        level VARCHAR(50) DEFAULT 'Beginner',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Chapters
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id SERIAL PRIMARY KEY,
        course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        chapter_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Lessons
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        chapter_id INT REFERENCES chapters(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        video_url VARCHAR(500),
        file_url VARCHAR(500),
        file_name VARCHAR(255),
        file_type VARCHAR(50),
        lesson_order INT DEFAULT 0,
        duration VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Enrollments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(student_id, course_id)
      )
    `);

    // Lesson Progress
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id SERIAL PRIMARY KEY,
        student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMPTZ,
        UNIQUE(student_id, lesson_id)
      )
    `);

    // Notes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, lesson_id)
      )
    `);

    // Comments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        parent_id INT REFERENCES comments(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES comments(id) ON DELETE SET NULL`);

    // Forum Topics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forum_topics (
        id SERIAL PRIMARY KEY,
        course_id INT REFERENCES courses(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        views INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Forum Replies
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forum_replies (
        id SERIAL PRIMARY KEY,
        topic_id INT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Assignments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        chapter_id INT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(10) DEFAULT 'quiz' CHECK (type IN ('quiz', 'essay')),
        total_points INT DEFAULT 100,
        due_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Assignment Questions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignment_questions (
        id SERIAL PRIMARY KEY,
        assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_option INT NOT NULL,
        points INT DEFAULT 10
      )
    `);

    // Assignment Submissions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        answers JSONB,
        score INT,
        feedback TEXT,
        file_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded')),
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Events (Timetable)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lecturer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        event_type VARCHAR(20) DEFAULT 'lecture' CHECK (event_type IN ('lecture', 'deadline', 'livestream', 'other')),
        meeting_link VARCHAR(500),
        status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Update Assignments table for new features
    await pool.query(`
      ALTER TABLE assignments 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
        ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS time_limit INT,
        ADD COLUMN IF NOT EXISTS max_attempts INT DEFAULT 1,
        ADD COLUMN IF NOT EXISTS allow_resubmit BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500);
    `);

    // Update Assignment Questions for new types
    await pool.query(`
      ALTER TABLE assignment_questions 
        ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'essay')),
        ADD COLUMN IF NOT EXISTS correct_answer TEXT,
        ADD COLUMN IF NOT EXISTS question_order INT DEFAULT 0;
    `);

    // Update Assignment Submissions for attempt tracking
    await pool.query(`
      ALTER TABLE assignment_submissions 
        ADD COLUMN IF NOT EXISTS attempt_number INT DEFAULT 1;
    `);

    // Notifications Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('assignment_posted', 'quiz_posted', 'submission_received', 'grade_posted')),
        title VARCHAR(255) NOT NULL,
        message TEXT,
        reference_id INT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log('All tables created/updated successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

initializeDB();
