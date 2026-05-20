-- Update Assignments table for new features
ALTER TABLE assignments 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS time_limit INT,
  ADD COLUMN IF NOT EXISTS max_attempts INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS allow_resubmit BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500);

-- Update Assignment Questions for new types
ALTER TABLE assignment_questions 
  ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'essay')),
  ADD COLUMN IF NOT EXISTS correct_answer TEXT,
  ADD COLUMN IF NOT EXISTS question_order INT DEFAULT 0;

-- Update Assignment Submissions for attempt tracking
ALTER TABLE assignment_submissions 
  ADD COLUMN IF NOT EXISTS attempt_number INT DEFAULT 1;

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('assignment_posted', 'quiz_posted', 'submission_received', 'grade_posted')),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  reference_id INT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
