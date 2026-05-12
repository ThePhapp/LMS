import React from 'react';
import { Link } from 'react-router-dom';
import { MonitorPlay, BookOpen, Layers, Target, Edit3, MessageCircle } from 'lucide-react';

const Landing = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">NỀN TẢNG GIẢNG DẠY VÀ HỌC TẬP<br />CHUYÊN NGHIỆP - HIỆN ĐẠI - CÔNG NGHỆ CAO</h1>
          <ul className="hero-features">
            <li>Tổ chức giảng dạy linh hoạt Blended Learning</li>
            <li>Học trực tuyến trên mọi thiết bị</li>
            <li>Bài giảng tương tác</li>
            <li>Bài kiểm tra đánh giá đa dạng</li>
            <li>Kiểm soát và điều chỉnh tiến trình học tập theo chuẩn đầu ra</li>
            <li>Báo cáo kết quả người học</li>
          </ul>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">GIỚI THIỆU <span>LỚP HỌC ĐỔI MỚI</span></h2>
          <h3 className="section-subtitle">TÍNH NĂNG CHÍNH</h3>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrap"><MonitorPlay size={28} /></div>
            <span className="feature-text">Bài giảng điện tử</span>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><BookOpen size={28} /></div>
            <span className="feature-text">Đào tạo trực tuyến</span>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><Layers size={28} /></div>
            <span className="feature-text">Học tập kết hợp</span>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><Edit3 size={28} /></div>
            <span className="feature-text">Hệ thống quản lý bài tập</span>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><Target size={28} /></div>
            <span className="feature-text">Cá thể hóa học tập</span>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><MessageCircle size={28} /></div>
            <span className="feature-text">Lấy người học làm trung tâm</span>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="info-section">
        <div className="info-container">
          <div className="info-text">
            <h2>LỚP HỌC ĐỔI MỚI - HỆ THỐNG QUẢN LÝ HỌC TẬP TRỰC TUYẾN</h2>
            <h3>ĐƠN VỊ ĐI ĐẦU TRONG CHUYỂN ĐỔI SỐ</h3>
            <p>
              Sự bùng nổ về công nghệ đang mở ra một kỷ nguyên mới cho ngành giáo dục. Xu hướng giáo dục đang dần thay đổi: thông minh hơn, nhanh nhạy hơn và tốn ít chi phí hơn. Công nghệ số đã tác động đến từng lớp học và làm thay đổi cách người dạy tiếp cận với người học.
            </p>
            <ul>
              <li>Tạo môi trường giáo dục linh động</li>
              <li>Truy cập tài liệu học tập không giới hạn</li>
              <li>Tăng tính tương tác và trải nghiệm thực tế</li>
              <li>Nâng cao chất lượng giáo dục</li>
              <li>Giảm chi phí đào tạo</li>
            </ul>
          </div>
          <div className="info-image">
            <img src="public/education.jpg" alt="Education" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section">
        <div className="footer-grid">
          <div className="footer-col">
            <h4>LIÊN HỆ</h4>
            <p><strong>Lớp Học Đổi Mới</strong></p>
            <p>Địa chỉ: Hanoi, Vietnam</p>
            <p>Điện thoại: 0123.456.789</p>
            <p>Email: contact@lop-hoc-doi-moi.lms</p>
          </div>
          <div className="footer-col">
            <h4>LIÊN KẾT</h4>
            <ul>
              <li><a href="#">Trang chủ</a></li>
              <li><a href="#">Khóa học trực tuyến</a></li>
              <li><a href="#">Cộng đồng lập trình</a></li>
              <li><a href="#">Hỗ trợ học tập</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>HỖ TRỢ</h4>
            <ul>
              <li><a href="#">Câu hỏi thường gặp</a></li>
              <li><a href="#">Chính sách bảo mật</a></li>
              <li><a href="#">Điều khoản và điều kiện</a></li>
              <li><a href="#">Liên hệ</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Lớp Học Đổi Mới © 2026. Nền tảng học trực tuyến hàng đầu.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
