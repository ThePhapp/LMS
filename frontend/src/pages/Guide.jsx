import React, { useState } from 'react';
import { 
  BookOpen, GraduationCap, Calendar, MessageSquare, 
  PlayCircle, CheckCircle2, ChevronRight, Star, Users, HelpCircle, Zap
} from 'lucide-react';

const sections = [
  {
    id: 'getting-started',
    icon: <Zap size={22} />,
    color: '#6366f1',
    title: 'Bắt đầu sử dụng',
    steps: [
      { 
        title: '1. Tạo tài khoản', 
        content: 'Truy cập trang đăng ký tại menu góc trên bên phải. Điền đầy đủ họ tên, email và mật khẩu. Bạn có thể chọn vai trò là Học viên (Student) hoặc Giáo viên (Lecturer).'
      },
      { 
        title: '2. Đăng nhập', 
        content: 'Sử dụng email và mật khẩu vừa đăng ký để đăng nhập. Sau khi đăng nhập, bạn sẽ được chuyển hướng về Dashboard cá nhân.'
      },
      { 
        title: '3. Cập nhật hồ sơ', 
        content: 'Nhấn vào tên hoặc avatar ở góc trên bên phải để chỉnh sửa thông tin cá nhân như tên hiển thị và avatar.'
      },
    ]
  },
  {
    id: 'courses',
    icon: <BookOpen size={22} />,
    color: '#0ea5e9',
    title: 'Tìm kiếm & Đăng ký Khóa học',
    steps: [
      { 
        title: 'Duyệt danh sách khóa học', 
        content: 'Vào mục "Khóa học" trên thanh điều hướng. Bạn sẽ thấy danh sách các khóa học được hiển thị dạng thẻ (card). Sử dụng thanh tìm kiếm hoặc bộ lọc ở Sidebar để lọc theo Chủ đề, Cấp độ (Beginner / Intermediate / Advanced) hoặc Giá (Miễn phí / Có phí).'
      },
      { 
        title: 'Xem chi tiết khóa học', 
        content: 'Nhấn vào thẻ khóa học để xem trang chi tiết. Trang này gồm mô tả đầy đủ, giáo viên phụ trách, danh sách chương & bài học và widget Đăng ký ở cột bên phải.'
      },
      { 
        title: 'Đăng ký (Enroll)', 
        content: 'Nhấn nút "Đăng ký ngay" ở cột phải để đăng ký tham gia khóa học. Sau khi đăng ký, khóa học sẽ xuất hiện trong Timetable (nếu có lịch học) và Dashboard của bạn.'
      },
    ]
  },
  {
    id: 'learning',
    icon: <PlayCircle size={22} />,
    color: '#10b981',
    title: 'Học trực tuyến',
    steps: [
      { 
        title: 'Vào giao diện học tập', 
        content: 'Từ trang chi tiết khóa học, nhấn "Tiếp tục học" (Continue) để vào không gian học tập chuyên biệt. Giao diện chia thành 2 vùng: trình phát nội dung (Video/Tài liệu) ở bên trái và danh sách bài học (Syllabus) ở bên phải.'
      },
      { 
        title: 'Điều hướng bài học', 
        content: 'Nhấn vào tên bài học ở Sidebar bên phải để chuyển sang bài đó. Các bài đã hoàn thành sẽ có dấu tích xanh (✔). Bạn cũng có thể dùng nút "Tiếp tục →" ở cuối nội dung để đi bài tiếp theo.'
      },
      { 
        title: 'Đánh dấu hoàn thành', 
        content: 'Sau khi xem xong một bài học, nhấn nút "Đánh dấu hoàn thành" ở góc trên bên phải vùng nội dung. Thanh tiến độ (Progress Bar) sẽ cập nhật tự động.'
      },
      { 
        title: 'Ghi chú & Hỏi đáp', 
        content: 'Ở bên dưới Video, sử dụng tab "Ghi chú" để lưu ghi chú cá nhân riêng tư, hoặc tab "Hỏi đáp (Q&A)" để thảo luận, đặt câu hỏi với giáo viên và học viên khác.'
      },
    ]
  },
  {
    id: 'timetable',
    icon: <Calendar size={22} />,
    color: '#f59e0b',
    title: 'Thời gian biểu',
    steps: [
      { 
        title: 'Xem lịch học', 
        content: 'Vào mục "Thời gian biểu" trên Navbar. Lịch được hiển thị theo Tuần (Week). Các sự kiện từ khóa học bạn đã đăng ký sẽ tự động xuất hiện trên lịch.'
      },
      { 
        title: 'Lọc theo môn/loại', 
        content: 'Sử dụng Sidebar bên trái để ẩn/hiện các môn học hoặc lọc theo loại sự kiện: Bài giảng (xanh), Livestream (vàng), Deadline/Bài tập (đỏ).'
      },
      { 
        title: 'Xem chi tiết sự kiện', 
        content: 'Nhấn vào một ô lịch để xem popup chi tiết, gồm tên buổi học, thời gian, nút tham gia phòng học Online (Zoom/Meet) và nút truy cập thẳng vào khóa học.'
      },
    ]
  },
  {
    id: 'forum',
    icon: <MessageSquare size={22} />,
    color: '#ec4899',
    title: 'Diễn đàn (Forum)',
    steps: [
      { 
        title: 'Truy cập Forum', 
        content: 'Vào mục "Forum" trên Navbar. Đây là không gian thảo luận chung cho tất cả học viên và giáo viên trong hệ thống.'
      },
      { 
        title: 'Đọc & Tạo chủ đề', 
        content: 'Bạn có thể đọc các chủ đề đang có. Nhấn "Tạo chủ đề mới" để mở bài thảo luận. Điền tiêu đề, nội dung và gắn với khóa học liên quan nếu muốn.'
      },
      { 
        title: 'Trả lời & Tương tác', 
        content: 'Nhấn vào một chủ đề để đọc và viết phần trả lời (Reply). Diễn đàn hỗ trợ hiển thị tên và thời gian đăng để dễ theo dõi luồng hội thoại.'
      },
    ]
  },
  {
    id: 'lecturer',
    icon: <GraduationCap size={22} />,
    color: '#8b5cf6',
    title: 'Dành cho Giáo viên',
    steps: [
      { 
        title: 'Instructor Dashboard', 
        content: 'Sau khi đăng nhập với tài khoản Giáo viên, vào Dashboard để xem tổng quan: số khóa học, học viên, và doanh thu ước tính.'
      },
      { 
        title: 'Tạo khóa học mới', 
        content: 'Nhấn "Tạo khóa học mới" và điền thông tin qua 4 Tab: (1) Thông tin cơ bản, (2) Chương trình học, (3) Định giá & Cấp độ, (4) Xuất bản.'
      },
      { 
        title: 'Quản lý lịch giảng', 
        content: 'Vào "Thời gian biểu" và dùng nút "+ Lên lịch" để thêm buổi học, livestream kèm link Zoom/Google Meet cho từng khóa học bạn phụ trách.'
      },
    ]
  },
];

const GuideSection = ({ section }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="card" style={{ marginBottom: '1rem', overflow: 'hidden' }}>
      <button 
        onClick={() => setOpen(!open)}
        style={{ 
          width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left'
        }}>
        <div style={{ 
          width: 44, height: 44, borderRadius: '12px', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', background: `${section.color}20`, color: section.color, flexShrink: 0
        }}>
          {section.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>{section.title}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{section.steps.length} bước hướng dẫn</div>
        </div>
        <div style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <ChevronRight size={20} />
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.5rem 1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {section.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ 
                  width: 28, height: 28, borderRadius: '50%', background: `${section.color}20`, 
                  color: section.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.85rem', flexShrink: 0, marginTop: 2
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text)' }}>{step.title}</div>
                  <div style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>{step.content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Guide = () => {
  return (
    <div className="main-content">
      {/* Header Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
        color: '#fff',
        borderRadius: 'var(--radius)',
        padding: '3rem 2.5rem',
        marginBottom: '2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '2rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <HelpCircle size={28} />
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Hướng dẫn sử dụng</h1>
          </div>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '500px', lineHeight: 1.6 }}>
            Tìm hiểu cách sử dụng VanAnh LMS — từ việc đăng ký khóa học, theo dõi tiến độ học tập đến tham gia các buổi học trực tuyến.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[
            { icon: <BookOpen size={20}/>, label: '100+ Khóa học' },
            { icon: <Users size={20}/>, label: 'Học mọi nơi' },
            { icon: <Star size={20}/>, label: 'Chứng chỉ hoàn thành' },
            { icon: <CheckCircle2 size={20}/>, label: 'Theo dõi tiến độ' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.15)', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Nav */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {sections.map(s => (
          <a key={s.id} href={`#${s.id}`} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem',
              borderRadius: '99px', border: `1px solid ${s.color}40`, color: s.color, 
              fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none',
              background: `${s.color}10`, transition: 'var(--transition)'
            }}>
            {s.icon}
            {s.title}
          </a>
        ))}
      </div>

      {/* Sections */}
      <div>
        {sections.map(section => (
          <div key={section.id} id={section.id}>
            <GuideSection section={section} />
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="card" style={{ padding: '2rem', textAlign: 'center', marginTop: '1.5rem', background: 'var(--surface-2)' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem' }}>Cần thêm hỗ trợ?</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Nếu bạn gặp khó khăn, hãy đặt câu hỏi tại diễn đàn cộng đồng — các giáo viên và học viên sẵn sàng giúp đỡ!</p>
        <a href="/forum" className="btn btn-primary">Đến Diễn đàn</a>
      </div>
    </div>
  );
};

export default Guide;
