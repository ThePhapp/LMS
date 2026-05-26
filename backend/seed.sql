-- Demo data for elementary school LMS
-- Run this after init_db.js creates the tables

-- Clear all existing data and reset sequences
TRUNCATE users, courses, chapters, lessons, enrollments, lesson_progress, 
         notes, comments, forum_topics, forum_replies, assignments, 
         assignment_questions, assignment_submissions, events CASCADE;

ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE courses_id_seq RESTART WITH 1;
ALTER SEQUENCE chapters_id_seq RESTART WITH 1;
ALTER SEQUENCE lessons_id_seq RESTART WITH 1;
ALTER SEQUENCE enrollments_id_seq RESTART WITH 1;
ALTER SEQUENCE lesson_progress_id_seq RESTART WITH 1;
ALTER SEQUENCE notes_id_seq RESTART WITH 1;
ALTER SEQUENCE comments_id_seq RESTART WITH 1;
ALTER SEQUENCE forum_topics_id_seq RESTART WITH 1;
ALTER SEQUENCE forum_replies_id_seq RESTART WITH 1;
ALTER SEQUENCE assignments_id_seq RESTART WITH 1;
ALTER SEQUENCE assignment_questions_id_seq RESTART WITH 1;
ALTER SEQUENCE assignment_submissions_id_seq RESTART WITH 1;
ALTER SEQUENCE events_id_seq RESTART WITH 1;

-- Insert demo users (passwords are hashed version of "123456")
INSERT INTO users (name, email, password, role) VALUES
('Cô Nguyễn Mai', 'mai.nguyen@school.edu.vn', '$2b$10$7IawqaWG4akgaMQmlcm22OdXOL9XIa7YlKQeJpMiGN7WjSDltGSbm', 'lecturer'),
('Thầy Trần Minh', 'minh.tran@school.edu.vn', '$2b$10$7IawqaWG4akgaMQmlcm22OdXOL9XIa7YlKQeJpMiGN7WjSDltGSbm', 'lecturer'),
('Cô Lê Hương', 'huong.le@school.edu.vn', '$2b$10$7IawqaWG4akgaMQmlcm22OdXOL9XIa7YlKQeJpMiGN7WjSDltGSbm', 'lecturer'),
('Bé An', 'an@student.edu.vn', '$2b$10$7IawqaWG4akgaMQmlcm22OdXOL9XIa7YlKQeJpMiGN7WjSDltGSbm', 'student'),
('Bé Bình', 'binh@student.edu.vn', '$2b$10$7IawqaWG4akgaMQmlcm22OdXOL9XIa7YlKQeJpMiGN7WjSDltGSbm', 'student'),
('Bé Chi', 'chi@student.edu.vn', '$2b$10$7IawqaWG4akgaMQmlcm22OdXOL9XIa7YlKQeJpMiGN7WjSDltGSbm', 'student'),
('Admin', 'admin@school.edu.vn', '$2b$10$7IawqaWG4akgaMQmlcm22OdXOL9XIa7YlKQeJpMiGN7WjSDltGSbm', 'admin');

-- Insert courses
INSERT INTO courses (title, description, category, lecturer_id, price, level) VALUES
('Toán lớp 3 - Học kỳ 1', 'Các phép tính cộng, trừ, nhân, chia trong phạm vi 10000. Đo lường độ dài, khối lượng, thời gian.', 'Science', 1, 0, 'Beginner'),
('Tiếng Việt lớp 2', 'Tập đọc, viết chính tả, đánh vần. Các bài tập kể chuyện và tả cảnh.', 'Language', 1, 0, 'Beginner'),
('Khoa học tự nhiên lớp 4', 'Tìm hiểu về cơ thể người, động vật, thực vật và thiên nhiên xung quanh.', 'Science', 2, 0, 'Intermediate'),
('Âm nhạc lớp 1', 'Học hát các bài hát thiếu nhi, nhận biết nhịp điệu và giai điệu đơn giản.', 'Arts', 3, 0, 'Beginner'),
('Mỹ thuật lớp 3', 'Vẽ tranh theo chủ đề, tô màu, cắt dán và làm đồ thủ công.', 'Arts', 3, 0, 'Beginner');

-- Insert chapters for Toán lớp 3
INSERT INTO chapters (course_id, title, chapter_order) VALUES
(1, 'Chương 1: Số và chữ số', 0),
(1, 'Chương 2: Phép cộng và phép trừ', 1),
(1, 'Chương 3: Phép nhân và phép chia', 2),
(1, 'Chương 4: Hình học cơ bản', 3);

-- Insert chapters for Tiếng Việt lớp 2
INSERT INTO chapters (course_id, title, chapter_order) VALUES
(2, 'Tuần 1: Tập đọc - Chú ếch con', 0),
(2, 'Tuần 2: Tập viết - Gia đình tôi', 1),
(2, 'Tuần 3: Chính tả - Các từ có vần ươ, ươi', 2);

-- Insert chapters for Khoa học tự nhiên lớp 4
INSERT INTO chapters (course_id, title, chapter_order) VALUES
(3, 'Bài 1: Cơ thể người', 0),
(3, 'Bài 2: Thế giới động vật', 1),
(3, 'Bài 3: Thế giới thực vật', 2);

-- Insert lessons for Toán lớp 3 - Chương 1
INSERT INTO lessons (course_id, chapter_id, title, content, lesson_order, duration) VALUES
(1, 1, 'Bài 1: Đọc và viết các số đến 1000', E'**Mục tiêu bài học:**\n- Biết đọc, viết các số từ 0 đến 1000\n- Nhận biết giá trị các chữ số trong số đã cho\n\n**Ví dụ:**\nSố 456 đọc là: Bốn trăm năm mươi sáu\n- Chữ số 4 ở hàng trăm có giá trị là 400\n- Chữ số 5 ở hàng chục có giá trị là 50\n- Chữ số 6 ở hàng đơn vị có giá trị là 6', 0, '45 phút'),
(1, 1, 'Bài 2: So sánh các số trong phạm vi 1000', E'**So sánh hai số:**\n1. So sánh số chữ số: Số nào có nhiều chữ số hơn thì lớn hơn\n2. Nếu bằng nhau, so từ trái sang phải\n\n**Ví dụ:**\n- 567 > 234 (vì 5 > 2)\n- 456 < 654 (vì 4 < 6)\n- 789 > 78 (789 có 3 chữ số, 78 có 2 chữ số)', 1, '45 phút'),
(1, 1, 'Bài 3: Luyện tập đọc viết số', E'**Bài tập:**\n1. Đọc các số: 305, 420, 678, 900\n2. Viết số có:\n   - 5 trăm, 3 chục, 7 đơn vị\n   - 8 trăm, 0 chục, 9 đơn vị\n3. Sắp xếp các số theo thứ tự tăng dần: 456, 123, 789, 234', 2, '45 phút');

-- Insert lessons for Toán lớp 3 - Chương 2
INSERT INTO lessons (course_id, chapter_id, title, content, lesson_order, duration) VALUES
(1, 2, 'Bài 4: Phép cộng không nhớ', E'**Cộng hai số không nhớ:**\n\nVí dụ: 234 + 152 = ?\n\n```\n  234\n+ 152\n-----\n  386\n```\n\n**Cách làm:**\n1. Cộng hàng đơn vị: 4 + 2 = 6\n2. Cộng hàng chục: 3 + 5 = 8\n3. Cộng hàng trăm: 2 + 1 = 3\n\nKết quả: 386', 0, '45 phút'),
(1, 2, 'Bài 5: Phép cộng có nhớ', E'**Cộng có nhớ:**\n\nVí dụ: 378 + 156 = ?\n\n```\n  ¹¹\n  378\n+ 156\n-----\n  534\n```\n\n**Cách làm:**\n1. Cộng hàng đơn vị: 8 + 6 = 14 (viết 4, nhớ 1)\n2. Cộng hàng chục: 7 + 5 + 1(nhớ) = 13 (viết 3, nhớ 1)\n3. Cộng hàng trăm: 3 + 1 + 1(nhớ) = 5', 1, '45 phút');

-- Insert lessons for Tiếng Việt lớp 2
INSERT INTO lessons (course_id, chapter_id, title, content, lesson_order, duration) VALUES
(2, 5, 'Đọc: Chú ếch con', E'**Chú ếch con**\n\nChú ếch con màu xanh lá cây\nNhảy lên bờ đọc sách cả ngày\nChú học bài giỏi, chú ngoan\nCô giáo khen chú học hành chăm chỉ\n\n**Từ vựng:**\n- ếch: con vật sống ở ao, có 4 chân, nhảy giỏi\n- chăm chỉ: rất cố gắng, siêng năng\n\n**Câu hỏi:**\n1. Chú ếch màu gì?\n2. Chú ếch làm gì trên bờ?\n3. Cô giáo khen chú ếch vì sao?', 0, '35 phút'),
(2, 6, 'Viết: Gia đình tôi', E'**Hướng dẫn viết đoạn văn:**\n\n**Bài mẫu:**\nGia đình tôi có 4 người: bố, mẹ, anh trai và tôi. Bố tôi là công nhân. Mẹ tôi là giáo viên. Anh trai tôi đang học lớp 5. Tôi rất yêu gia đình mình.\n\n**Yêu cầu:**\n1. Viết 4-5 câu về gia đình\n2. Giới thiệu từng thành viên\n3. Viết cảm nghĩ của em về gia đình', 0, '35 phút');

-- Insert lessons for Khoa học lớp 4
INSERT INTO lessons (course_id, chapter_id, title, content, lesson_order, duration, video_url) VALUES
(3, 8, 'Các bộ phận của cơ thể', E'**Cơ thể con người gồm:**\n\n1. **Đầu:** Não, mắt, mũi, miệng, tai\n2. **Thân:** Tim, phổi, dạ dày, gan\n3. **Tay:** Xương, cơ, khớp\n4. **Chân:** Xương, cơ, khớp\n\n**Chức năng:**\n- Mắt giúp ta nhìn\n- Tai giúp ta nghe\n- Mũi giúp ta ngửi\n- Lưỡi giúp ta nếm\n- Da giúp ta cảm nhận', 0, '40 phút', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
(3, 9, 'Các loài động vật quen thuộc', E'**Phân loại động vật:**\n\n**1. Động vật có xương sống:**\n- Chim: Chim sẻ, đại bàng, vẹt\n- Cá: Cá rô, cá chép, cá voi\n- Thú: Chó, mèo, voi, hổ\n\n**2. Động vật không xương sống:**\n- Côn trùng: Bướm, ong, kiến\n- Giun: Giun đất\n- Ốc: Ốc sên\n\n**Đặc điểm:**\n- Động vật sinh sản bằng cách đẻ trứng hoặc đẻ con\n- Cần ăn, uống, thở và vận động', 0, '40 phút', NULL);

-- Insert assignments (quiz)
INSERT INTO assignments (course_id, chapter_id, title, description, type, total_points, due_date) VALUES
(1, 1, 'Kiểm tra: Số và chữ số', 'Bài kiểm tra cuối chương 1 - Số và chữ số', 'quiz', 100, NOW() + INTERVAL '7 days'),
(1, 2, 'Bài tập: Phép cộng', 'Luyện tập phép cộng có nhớ và không nhớ', 'quiz', 50, NOW() + INTERVAL '3 days'),
(2, 5, 'Trắc nghiệm: Chú ếch con', 'Câu hỏi về bài đọc Chú ếch con', 'quiz', 30, NOW() + INTERVAL '2 days'),
(3, 8, 'Kiểm tra: Cơ thể người', 'Trắc nghiệm về các bộ phận cơ thể', 'quiz', 40, NOW() + INTERVAL '5 days');

-- Insert quiz questions for "Kiểm tra: Số và chữ số"
INSERT INTO assignment_questions (assignment_id, question_text, options, correct_option, points) VALUES
(1, 'Số 456 được đọc là gì?', '["Bốn năm sáu", "Bốn trăm năm sáu", "Bốn trăm năm mươi sáu", "Bốn mươi năm sáu"]', 2, 20),
(1, 'Trong số 789, chữ số 7 có giá trị là bao nhiêu?', '["7", "70", "700", "7000"]', 2, 20),
(1, 'Số nào lớn nhất trong các số sau: 456, 654, 546, 465?', '["456", "654", "546", "465"]', 1, 20),
(1, 'Số có 3 trăm, 0 chục, 5 đơn vị được viết là?', '["35", "305", "350", "3005"]', 1, 20),
(1, 'So sánh: 567 ... 576', '["567 > 576", "567 < 576", "567 = 576", "Không so sánh được"]', 1, 20);

-- Insert quiz questions for "Bài tập: Phép cộng"
INSERT INTO assignment_questions (assignment_id, question_text, options, correct_option, points) VALUES
(2, '234 + 152 = ?', '["386", "286", "376", "486"]', 0, 25),
(2, '378 + 156 = ?', '["524", "534", "544", "554"]', 1, 25);

-- Insert quiz questions for "Trắc nghiệm: Chú ếch con"
INSERT INTO assignment_questions (assignment_id, question_text, options, correct_option, points) VALUES
(3, 'Chú ếch con màu gì?', '["Vàng", "Đỏ", "Xanh lá cây", "Nâu"]', 2, 10),
(3, 'Chú ếch làm gì trên bờ?', '["Chơi", "Ngủ", "Đọc sách", "Bắt côn trùng"]', 2, 10),
(3, 'Cô giáo khen chú ếch vì điều gì?', '["Nhảy cao", "Học hành chăm chỉ", "Hát hay", "Chạy nhanh"]', 1, 10);

-- Insert quiz questions for "Kiểm tra: Cơ thể người"
INSERT INTO assignment_questions (assignment_id, question_text, options, correct_option, points) VALUES
(4, 'Bộ phận nào giúp ta nhìn?', '["Tai", "Mắt", "Mũi", "Miệng"]', 1, 10),
(4, 'Bộ phận nào giúp ta nghe?', '["Mắt", "Mũi", "Tai", "Lưỡi"]', 2, 10),
(4, 'Tim và phổi nằm ở đâu?', '["Đầu", "Tay", "Thân", "Chân"]', 2, 10),
(4, 'Bộ phận nào giúp ta nếm vị?', '["Mũi", "Lưỡi", "Mắt", "Da"]', 1, 10);

-- Insert enrollments
INSERT INTO enrollments (student_id, course_id) VALUES
(4, 1), -- Bé An học Toán lớp 3
(4, 2), -- Bé An học Tiếng Việt lớp 2
(5, 1), -- Bé Bình học Toán lớp 3
(5, 3), -- Bé Bình học Khoa học lớp 4
(6, 2), -- Bé Chi học Tiếng Việt lớp 2
(6, 3), -- Bé Chi học Khoa học lớp 4
(6, 4); -- Bé Chi học Âm nhạc lớp 1

-- Insert some progress
INSERT INTO lesson_progress (student_id, lesson_id, completed, completed_at) VALUES
(4, 1, true, NOW() - INTERVAL '2 days'),
(4, 2, true, NOW() - INTERVAL '1 day'),
(4, 3, true, NOW()),
(5, 1, true, NOW() - INTERVAL '3 days'),
(6, 6, true, NOW() - INTERVAL '1 day');

-- Insert some notes
INSERT INTO notes (user_id, lesson_id, content) VALUES
(4, 1, 'Cần nhớ: Số có 3 chữ số, chữ số đầu tiên là hàng trăm!'),
(5, 1, 'Chú ý khi so sánh số: So từ trái sang phải');

-- Insert some comments
INSERT INTO comments (user_id, lesson_id, content) VALUES
(4, 1, 'Cô ơi, em không hiểu cách đọc số 305 ạ!'),
(1, 1, 'Số 305 đọc là: Ba trăm linh năm (hoặc Ba trăm lẻ năm) nhé các em!'),
(5, 4, 'Bài này dễ quá cô ơi!');

-- Insert a forum topic
INSERT INTO forum_topics (course_id, user_id, title, content, views) VALUES
(1, 4, 'Cách nhớ bảng nhân?', 'Các bạn có mẹo gì để nhớ bảng nhân không? Mình hay quên lắm!', 15),
(2, 6, 'Cách viết chữ đẹp?', 'Làm sao để viết chữ đẹp như cô giáo vậy các bạn?', 23);

-- Insert forum replies
INSERT INTO forum_replies (topic_id, user_id, content) VALUES
(1, 5, 'Mình thường đọc to ra và lặp lại nhiều lần, vậy là nhớ liền!'),
(1, 1, 'Các em nên tập viết bảng nhân mỗi ngày 10 phút, sau 1 tuần sẽ thuộc hết đấy!'),
(2, 4, 'Mình tập viết thật chậm và cẩn thận thì chữ sẽ đẹp hơn!');

-- Insert some events
INSERT INTO events (course_id, lecturer_id, title, start_time, end_time, event_type, status) VALUES
(1, 1, 'Kiểm tra giữa kỳ môn Toán', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '1 hour', 'deadline', 'upcoming'),
(2, 1, 'Buổi học trực tuyến - Tập viết', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '45 minutes', 'livestream', 'upcoming'),
(3, 2, 'Thí nghiệm: Quan sát cây xanh', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '1 hour', 'lecture', 'upcoming');

-- Sample assignment submission (student Bé An did quiz 3)
INSERT INTO assignment_submissions (assignment_id, student_id, answers, score, status) VALUES
(3, 4, '{"7": 2, "8": 2, "9": 1}', 30, 'graded');

SELECT 'Demo data inserted successfully!' as message;
