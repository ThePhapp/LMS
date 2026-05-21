import React, { createContext, useContext, useState } from 'react';

const translations = {
  vi: {
    // Navbar
    nav_courses: 'Khóa học',
    nav_timetable: 'Thời gian biểu',
    nav_forum: 'Diễn đàn',
    nav_guide: 'Hướng dẫn',
    nav_login: 'Đăng nhập',
    nav_logout: 'Đăng xuất',
    nav_dashboard: 'Dashboard',
    nav_profile: 'Thông tin cá nhân',
    nav_instructor: 'Quản lý giảng dạy',
    nav_create_course: 'Tạo khóa học',

    // Common
    save: 'Lưu',
    cancel: 'Hủy',
    delete: 'Xóa',
    edit: 'Chỉnh sửa',
    create: 'Tạo mới',
    loading: 'Đang tải...',
    search: 'Tìm kiếm...',
    back: 'Quay lại',
    enroll: 'Đăng ký',
    continue_learning: 'Tiếp tục học',
    free: 'Mở đăng ký',
    today: 'Hôm nay',

    // Profile Page
    profile_title: 'Thông tin cá nhân',
    profile_subtitle: 'Quản lý hồ sơ và mật khẩu của bạn',
    profile_name: 'Họ và tên',
    profile_email: 'Email',
    profile_role: 'Vai trò',
    profile_avatar: 'Ảnh đại diện',
    profile_change_avatar: 'Thay đổi ảnh',
    profile_password_section: 'Đổi mật khẩu',
    profile_current_password: 'Mật khẩu hiện tại',
    profile_new_password: 'Mật khẩu mới',
    profile_confirm_password: 'Xác nhận mật khẩu mới',
    profile_save_success: 'Cập nhật thành công!',
    profile_password_mismatch: 'Mật khẩu mới không khớp',
    profile_password_wrong: 'Mật khẩu hiện tại không đúng',
    profile_leave_blank: '(để trống nếu không muốn đổi mật khẩu)',

    // Course
    course_catalog: 'Khóa học',
    course_subtitle: 'Tìm kiếm và chọn lựa các khóa học phù hợp với bạn',
    course_filter: 'Bộ lọc',
    course_category: 'Chủ đề',
    course_level: 'Cấp độ',
    course_price: 'Giá',
    course_all: 'Tất cả',
    course_paid: 'Có phí',
    course_lessons: 'bài',
    course_students: 'học viên',
    course_no_result: 'Không tìm thấy khóa học',
    course_no_result_sub: 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.',

    // Timetable
    timetable_title: 'Lịch Học & Sự Kiện',
    timetable_subtitle: 'Quản lý thời gian, xem deadline và tham gia buổi học',
    timetable_create: 'Tạo Lịch',
    timetable_by_course: 'Theo Môn Học',
    timetable_by_type: 'Loại Sự Kiện',
    timetable_lecture: 'Bài giảng',
    timetable_livestream: 'Livestream',
    timetable_deadline: 'Bài tập / Deadline',

    // Guide
    guide_need_help: 'Cần thêm hỗ trợ?',
    guide_help_desc: 'Nếu bạn gặp khó khăn, hãy đặt câu hỏi tại diễn đàn cộng đồng.',
    guide_go_forum: 'Đến Diễn đàn',

    // Dashboard
    dashboard_welcome: 'Chào mừng trở lại',
    dashboard_my_courses: 'Khóa học của tôi',
    dashboard_progress: 'Tiến độ học tập',
    dashboard_continue: 'Tiếp tục học',
    dashboard_completed: 'Đã hoàn thành',
    dashboard_enrolled: 'Đã đăng ký',
    dashboard_no_courses: 'Chưa có khóa học',
    dashboard_no_courses_sub: 'Hãy khám phá và đăng ký khóa học đầu tiên của bạn!',
    dashboard_browse: 'Khám phá khóa học',

    // Instructor
    instructor_dashboard: 'Quản lý giảng dạy',
    instructor_courses: 'Khóa học của tôi',
    instructor_create: 'Tạo khóa học mới',
    instructor_students: 'Học viên',
    instructor_no_courses: 'Chưa có khóa học nào. Hãy tạo khóa học đầu tiên của bạn!',
    instructor_edit: 'Chỉnh sửa',
    instructor_delete: 'Xóa',
    instructor_total_students: 'Tổng học viên',
    instructor_total_courses: 'Tổng khóa học',
    instructor_total_lessons: 'Tổng bài giảng',

    // Course Editor
    editor_title: 'Tạo / Chỉnh sửa khóa học',
    editor_course_title: 'Tên khóa học',
    editor_course_desc: 'Mô tả',
    editor_category: 'Chủ đề',
    editor_level: 'Cấp độ',
    editor_price: 'Giá (0 = Mở đăng ký)',
    editor_thumbnail: 'Ảnh bìa',
    editor_chapters: 'Danh sách chương',
    editor_add_chapter: 'Thêm chương',
    editor_add_lesson: 'Thêm bài giảng',
    editor_add_quiz: 'Thêm bài kiểm tra',
    editor_lesson_title: 'Tiêu đề bài giảng',
    editor_lesson_content: 'Nội dung',
    editor_video_url: 'Link video (YouTube)',
    editor_duration: 'Thời lượng',
    editor_publish: 'Xuất bản',
    editor_unpublish: 'Hủy xuất bản',
    editor_save: 'Lưu thay đổi',

    // Forum
    forum_title: 'Diễn đàn thảo luận',
    forum_new_topic: 'Tạo chủ đề mới',
    forum_all_courses: 'Tất cả khóa học',
    forum_replies: 'trả lời',
    forum_no_topics: 'Chưa có chủ đề nào',
    forum_be_first: 'Hãy là người đầu tiên tạo chủ đề thảo luận!',

    // Gradebook
    gradebook_title: 'Bảng điểm',
    gradebook_assignment: 'Bài tập / Bài kiểm tra',
    gradebook_score: 'Điểm',
    gradebook_submitted: 'Ngày nộp',
    gradebook_status: 'Trạng thái',
    gradebook_graded: 'Đã chấm',
    gradebook_pending: 'Chờ chấm',
    gradebook_not_submitted: 'Chưa nộp',

    // Assignment
    assignment_quiz: 'Bài kiểm tra',
    assignment_essay: 'Bài tự luận',
    assignment_submit: 'Nộp bài',
    assignment_submitted: 'Đã nộp',
    assignment_score: 'Điểm số',
    assignment_feedback: 'Nhận xét',
    assignment_deadline: 'Hạn nộp',
    assignment_retry: 'Làm lại',

    // Level labels
    level_beginner: 'Cơ bản',
    level_intermediate: 'Trung cấp',
    level_advanced: 'Nâng cao',

    // AI Chat
    ai_chat_title: 'AI chat',
    ai_chat_placeholder: 'Hỏi bất cứ điều gì... (Enter để gửi)',
    ai_chat_typing: 'Đang soạn...',
    ai_chat_online: 'Trực tuyến',
    ai_chat_clear: 'Xóa lịch sử',
    ai_chat_empty_title: 'Tôi có thể giúp gì cho bạn?',
    ai_chat_empty_sub: 'Hãy hỏi về khóa học, bài tập hoặc bất kỳ chủ đề học thuật nào.',
  },
  en: {
    // Navbar
    nav_courses: 'Courses',
    nav_timetable: 'Timetable',
    nav_forum: 'Forum',
    nav_guide: 'Guide',
    nav_login: 'Log In',
    nav_logout: 'Log Out',
    nav_dashboard: 'Dashboard',
    nav_profile: 'My Profile',
    nav_instructor: 'Instructor Panel',
    nav_create_course: 'Create Course',

    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    loading: 'Loading...',
    search: 'Search...',
    back: 'Back',
    enroll: 'Enroll',
    continue_learning: 'Continue Learning',
    free: 'Free',
    today: 'Today',

    // Profile Page
    profile_title: 'My Profile',
    profile_subtitle: 'Manage your personal information and password',
    profile_name: 'Full Name',
    profile_email: 'Email',
    profile_role: 'Role',
    profile_avatar: 'Avatar',
    profile_change_avatar: 'Change Photo',
    profile_password_section: 'Change Password',
    profile_current_password: 'Current Password',
    profile_new_password: 'New Password',
    profile_confirm_password: 'Confirm New Password',
    profile_save_success: 'Profile updated successfully!',
    profile_password_mismatch: 'New passwords do not match',
    profile_password_wrong: 'Current password is incorrect',
    profile_leave_blank: '(leave blank to keep current password)',

    // Course
    course_catalog: 'Courses',
    course_subtitle: 'Discover and enroll in courses that match your goals',
    course_filter: 'Filters',
    course_category: 'Category',
    course_level: 'Level',
    course_price: 'Price',
    course_all: 'All',
    course_paid: 'Paid',
    course_lessons: 'lessons',
    course_students: 'students',
    course_no_result: 'No courses found',
    course_no_result_sub: 'Try changing your search or filter settings.',

    // Timetable
    timetable_title: 'Timetable & Events',
    timetable_subtitle: 'Manage your schedule, deadlines and join live classes',
    timetable_create: 'New Event',
    timetable_by_course: 'Filter by Course',
    timetable_by_type: 'Event Type',
    timetable_lecture: 'Lecture',
    timetable_livestream: 'Livestream',
    timetable_deadline: 'Assignment / Deadline',

    // Guide
    guide_need_help: 'Need more help?',
    guide_help_desc: 'Post a question in the community forum — lecturers and students are happy to help!',
    guide_go_forum: 'Visit Forum',

    // Dashboard
    dashboard_welcome: 'Welcome back',
    dashboard_my_courses: 'My Courses',
    dashboard_progress: 'Learning Progress',
    dashboard_continue: 'Continue',
    dashboard_completed: 'Completed',
    dashboard_enrolled: 'Enrolled',
    dashboard_no_courses: 'No courses yet',
    dashboard_no_courses_sub: 'Browse and enroll in your first course!',
    dashboard_browse: 'Browse Courses',

    // Instructor
    instructor_dashboard: 'Instructor Panel',
    instructor_courses: 'My Courses',
    instructor_create: 'Create Course',
    instructor_students: 'Students',
    instructor_no_courses: 'No courses yet. Create your first course!',
    instructor_edit: 'Edit',
    instructor_delete: 'Delete',
    instructor_total_students: 'Total Students',
    instructor_total_courses: 'Total Courses',
    instructor_total_lessons: 'Total Lessons',

    // Course Editor
    editor_title: 'Create / Edit Course',
    editor_course_title: 'Course Title',
    editor_course_desc: 'Description',
    editor_category: 'Category',
    editor_level: 'Level',
    editor_price: 'Price (0 = Free)',
    editor_thumbnail: 'Thumbnail',
    editor_chapters: 'Chapters',
    editor_add_chapter: 'Add Chapter',
    editor_add_lesson: 'Add Lesson',
    editor_add_quiz: 'Add Quiz',
    editor_lesson_title: 'Lesson Title',
    editor_lesson_content: 'Content',
    editor_video_url: 'Video URL (YouTube)',
    editor_duration: 'Duration',
    editor_publish: 'Publish',
    editor_unpublish: 'Unpublish',
    editor_save: 'Save Changes',

    // Forum
    forum_title: 'Discussion Forum',
    forum_new_topic: 'New Topic',
    forum_all_courses: 'All Courses',
    forum_replies: 'replies',
    forum_no_topics: 'No topics yet',
    forum_be_first: 'Be the first to start a discussion!',

    // Gradebook
    gradebook_title: 'Gradebook',
    gradebook_assignment: 'Assignment / Quiz',
    gradebook_score: 'Score',
    gradebook_submitted: 'Submitted',
    gradebook_status: 'Status',
    gradebook_graded: 'Graded',
    gradebook_pending: 'Pending',
    gradebook_not_submitted: 'Not submitted',

    // Assignment
    assignment_quiz: 'Quiz',
    assignment_essay: 'Essay',
    assignment_submit: 'Submit',
    assignment_submitted: 'Submitted',
    assignment_score: 'Score',
    assignment_feedback: 'Feedback',
    assignment_deadline: 'Deadline',
    assignment_retry: 'Retry',

    // Level labels
    level_beginner: 'Beginner',
    level_intermediate: 'Intermediate',
    level_advanced: 'Advanced',

    // AI Chat
    ai_chat_title: 'AI Assistant',
    ai_chat_placeholder: 'Ask anything... (Enter to send)',
    ai_chat_typing: 'Typing...',
    ai_chat_online: 'Online',
    ai_chat_clear: 'Clear chat',
    ai_chat_empty_title: 'How can I help you?',
    ai_chat_empty_sub: 'Ask me about your courses, assignments, or any academic topic.',
  },
};

export const LangContext = createContext();

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'vi');

  const switchLang = (l) => {
    setLang(l);
    localStorage.setItem('lang', l);
  };

  const t = (key) => translations[lang]?.[key] ?? translations['vi'][key] ?? key;

  return (
    <LangContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
