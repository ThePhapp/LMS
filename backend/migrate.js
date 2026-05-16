require('dotenv').config();
const mysql = require('mysql2/promise');

async function addColumnIfMissing(conn, table, column, definition) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME, table, column]
  );
  if (cols.length === 0) {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`  + Added: ${table}.${column}`);
  } else {
    console.log(`  - Skip : ${table}.${column} already exists`);
  }
}

async function migrate() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('Running migrations...\n');

    // users table
    await addColumnIfMissing(conn, 'users', 'avatar_url', 'VARCHAR(500) NULL');

    // courses table
    await addColumnIfMissing(conn, 'courses', 'category', "VARCHAR(100) DEFAULT 'General'");
    await addColumnIfMissing(conn, 'courses', 'thumbnail_url', 'VARCHAR(500)');
    await addColumnIfMissing(conn, 'courses', 'price', 'DECIMAL(10,2) DEFAULT 0.00');
    await addColumnIfMissing(conn, 'courses', 'level', "VARCHAR(50) DEFAULT 'Beginner'");
    await addColumnIfMissing(conn, 'courses', 'rating', 'DECIMAL(2,1) DEFAULT 4.0');
    await addColumnIfMissing(conn, 'courses', 'rating_count', 'INT DEFAULT 1');

    // lessons table - new columns
    await addColumnIfMissing(conn, 'lessons', 'file_name', 'VARCHAR(255)');
    await addColumnIfMissing(conn, 'lessons', 'file_type', 'VARCHAR(50)');
    await addColumnIfMissing(conn, 'lessons', 'lesson_order', 'INT DEFAULT 0');
    await addColumnIfMissing(conn, 'lessons', 'duration', 'VARCHAR(50)');
    await addColumnIfMissing(conn, 'lessons', 'chapter_id', 'INT NULL');

    // chapters table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        chapter_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);
    console.log('  + chapters table ready.');

    // notes table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lesson_id INT NOT NULL,
        content TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        UNIQUE(user_id, lesson_id)
      )
    `);
    console.log('  + notes table ready.');

    // comments table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lesson_id INT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
      )
    `);
    console.log('  + comments table ready.');

    // forum_topics table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS forum_topics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  + forum_topics table ready.');

    // forum_replies table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS forum_replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        topic_id INT NOT NULL,
        user_id INT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  + forum_replies table ready.');

    // assignments table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        chapter_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type ENUM('quiz', 'essay') NOT NULL DEFAULT 'quiz',
        total_points INT DEFAULT 100,
        due_date DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
      )
    `);
    console.log('  + assignments table ready.');

    // New assignment columns for enhanced features
    await addColumnIfMissing(conn, 'assignments', 'status', "ENUM('draft','published','archived') DEFAULT 'published'");
    await addColumnIfMissing(conn, 'assignments', 'shuffle_questions', 'BOOLEAN DEFAULT FALSE');
    await addColumnIfMissing(conn, 'assignments', 'shuffle_options', 'BOOLEAN DEFAULT FALSE');
    await addColumnIfMissing(conn, 'assignments', 'time_limit', 'INT NULL COMMENT \'Time limit in minutes\'');
    await addColumnIfMissing(conn, 'assignments', 'max_attempts', 'INT DEFAULT 1');
    await addColumnIfMissing(conn, 'assignments', 'allow_resubmit', 'BOOLEAN DEFAULT FALSE');
    await addColumnIfMissing(conn, 'assignments', 'attachment_url', 'VARCHAR(500) NULL');

    // assignment_questions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS assignment_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT NOT NULL,
        question_text TEXT NOT NULL,
        options JSON NOT NULL,
        correct_option INT NOT NULL,
        points INT DEFAULT 10,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
      )
    `);
    console.log('  + assignment_questions table ready.');

    // New question columns
    await addColumnIfMissing(conn, 'assignment_questions', 'question_type', "ENUM('multiple_choice','true_false','fill_blank','essay') DEFAULT 'multiple_choice'");
    await addColumnIfMissing(conn, 'assignment_questions', 'correct_answer', "TEXT NULL COMMENT 'For fill_blank and essay: text answer'");
    await addColumnIfMissing(conn, 'assignment_questions', 'question_order', 'INT DEFAULT 0');

    // assignment_submissions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT NOT NULL,
        student_id INT NOT NULL,
        content TEXT,
        answers JSON,
        score INT,
        feedback TEXT,
        file_url VARCHAR(500),
        status ENUM('submitted', 'graded') DEFAULT 'submitted',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  + assignment_submissions table ready.');
    
    // Add file_url column if missing (for existing tables)
    await addColumnIfMissing(conn, 'assignment_submissions', 'file_url', 'VARCHAR(500) NULL');
    await addColumnIfMissing(conn, 'assignment_submissions', 'attempt_number', 'INT DEFAULT 1');

    // notifications table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('assignment_posted','quiz_posted','submission_received','grade_posted') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        reference_id INT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  + notifications table ready.');

    // lesson_progress table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        lesson_id INT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        UNIQUE(student_id, lesson_id)
      )
    `);
    console.log('  + lesson_progress table ready.');

    // lesson_progress table ready above
    
    // events table for Timetable
    await conn.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        lecturer_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        event_type ENUM('lecture', 'deadline', 'livestream', 'other') DEFAULT 'lecture',
        meeting_link VARCHAR(500),
        status ENUM('upcoming', 'completed', 'cancelled') DEFAULT 'upcoming',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  + events table ready.');

    console.log('\nAll migrations completed successfully!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

migrate();
