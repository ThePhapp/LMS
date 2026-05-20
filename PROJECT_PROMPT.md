# 📚 LMS - Lớp Học Đổi Mới | Project Prompt

## 📌 Tổng Quan Dự Án

**Tên:** Lớp Học Đổi Mới (Innovative Classroom LMS)  
**Loại:** Learning Management System (LMS)  
**Mục đích:** Hệ thống quản lý học tập trực tuyến toàn diện cho giáo viên và học viên  
**Ngôn ngữ:** Tiếng Việt & Tiếng Anh (Multi-language)

---

## 🏗️ Tech Stack

### Backend
- **Runtime:** Node.js (v16+)
- **Framework:** Express.js
- **Database:** MySQL/PostgreSQL
- **Authentication:** JWT (JSON Web Tokens)
- **Port:** 5000

### Frontend
- **Library:** React 18
- **Build Tool:** Vite
- **State Management:** Context API (Auth, Lang)
- **Icons:** Lucide React
- **Styling:** CSS (custom)
- **Port:** 5173

### AI & Integration
- **AI API:** Google Gemini 2.5 Flash
- **Gemini API Key:** Required (VITE_GEMINI_API_KEY)

### Deployment
- **Frontend:** Vercel
- **Backend:** Node.js Server

---

## ✨ Chức Năng Chính

### 1. **Xác Thực & Phân Quyền** (Auth)
- ✅ Đăng ký (Register)
- ✅ Đăng nhập (Login)
- ✅ JWT tokens (Access & Refresh)
- ✅ Phân quyền: Student, Instructor, Admin
- ✅ Bảo vệ routes

### 2. **Quản Lý Khóa Học** (Courses)
- ✅ Tạo khóa học (Instructor)
- ✅ Liệt kê khóa học
- ✅ Chi tiết khóa học
- ✅ Chỉnh sửa khóa học
- ✅ Xóa khóa học
- ✅ Upload hình ảnh đại diện

### 3. **Nội Dung Học Tập** (Chapters & Lessons)
- ✅ Tạo chương (Chapter) trong khóa học
- ✅ Tạo bài học (Lesson) trong chương
- ✅ Nội dung bài học (text, video, tài liệu)
- ✅ Sắp xếp bài học

### 4. **Bài Tập & Đánh Giá** (Assignments)
- ✅ Tạo bài tập
- ✅ Giao bài tập cho học viên
- ✅ Nộp bài tập
- ✅ Chấm điểm bài tập
- ✅ Feedback từ giáo viên
- ✅ Theo dõi tiến độ

### 5. **Ghi Danh Khóa Học** (Enrollment)
- ✅ Học viên ghi danh khóa học
- ✅ Quản lý danh sách học viên
- ✅ Xem trạng thái ghi danh

### 6. **Bảng Điểm** (Gradebook)
- ✅ Xem bảng điểm tổng hợp
- ✅ Lọc theo khóa học
- ✅ Export bảng điểm

### 7. **Hỗ Trợ AI** (AI Chat)
- ✅ Chatbot sử dụng Google Gemini
- ✅ Hỏi về khóa học, lập trình, học tập
- ✅ Hỗ trợ tiếng Việt & Anh
- ✅ Lịch sử cuộc trò chuyện
- ✅ Floating chat button

### 8. **Dashboard** (Dashboard)
- ✅ Dashboard cho Instructor
  - Tổng quan khóa học
  - Danh sách học viên
  - Bài tập chưa chấm
  - Thống kê
- ✅ Dashboard cho Student
  - Khóa học đang học
  - Tiến độ học tập
  - Bài tập sắp tới
  - Điểm số

### 9. **Khác**
- ✅ Forum thảo luận
- ✅ Event tracking
- ✅ Interaction logging
- ✅ Lịch học (Timetable)
- ✅ Hồ sơ người dùng
- ✅ Đổi ngôn ngữ giao diện

---

## 📁 Cấu Trúc Thư Mục

```
LMS/
├── backend/
│   ├── config/
│   │   ├── db.js           # Database connection
│   │   └── storage.js      # File storage config
│   ├── controllers/        # Business logic
│   │   ├── authController.js
│   │   ├── courseController.js
│   │   ├── chapterController.js
│   │   ├── lessonController.js
│   │   ├── assignmentController.js
│   │   ├── enrollmentController.js
│   │   ├── eventController.js
│   │   ├── interactionController.js
│   │   └── ...
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verification
│   ├── routes/             # API endpoints
│   │   ├── auth.js
│   │   ├── courses.js
│   │   ├── chapters.js
│   │   ├── lessons.js
│   │   ├── assignments.js
│   │   ├── enrollments.js
│   │   ├── events.js
│   │   ├── interactions.js
│   │   └── ...
│   ├── uploads/            # File uploads
│   ├── server.js           # Express app entry
│   ├── package.json
│   ├── init_db.js          # Database initialization
│   ├── migrate.js          # Database migrations
│   ├── seed.js             # Seed data
│   └── check_db.js         # Database check
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── Navbar.jsx
│   │   │   ├── AiChat.jsx
│   │   │   ├── AssignmentViewer.jsx
│   │   │   ├── LessonAiChat.jsx
│   │   │   └── ...
│   │   ├── contexts/       # React contexts
│   │   │   ├── AuthContext.jsx    # Auth state
│   │   │   └── LangContext.jsx    # Language state
│   │   ├── pages/          # Page components
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CourseList.jsx
│   │   │   ├── CourseDetail.jsx
│   │   │   ├── CourseLearning.jsx
│   │   │   ├── AssignmentDetail.jsx
│   │   │   ├── AssignmentGrading.jsx
│   │   │   ├── Gradebook.jsx
│   │   │   ├── InstructorDashboard.jsx
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.js      # API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json
│
└── PROJECT_PROMPT.md       # This file

```

---

## 🚀 Hướng Dẫn Setup (Từ Đầu)

### 1. **Chuẩn Bị Môi Trường**
```bash
# Cài đặt Node.js (v16 trở lên)
node --version
npm --version

# Clone hoặc tạo dự án
git clone <repo> LMS
cd LMS
```

### 2. **Setup Backend**
```bash
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env
# Nội dung:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=yourpassword
# DB_NAME=lms_db
# JWT_SECRET=your-secret-key
# PORT=5000

# Khởi tạo database
npm run init-db

# Seed dữ liệu mẫu
npm run seed

# Chạy backend
npm start
# Server chạy tại http://localhost:5000
```

### 3. **Setup Frontend**
```bash
cd frontend

# Cài đặt dependencies
npm install

# Tạo file .env.local
# Nội dung:
# VITE_API_URL=http://localhost:5000
# VITE_GEMINI_API_KEY=your-gemini-api-key

# Chạy frontend dev server
npm run dev
# Frontend chạy tại http://localhost:5173
```

### 4. **Kiểm Tra Kết Nối**
```bash
# Test API health check
curl http://localhost:5000/health

# Test database connection
npm run check-db (từ backend folder)
```

---

## 📊 Luồng Dữ Liệu

### User Flow
```
1. Landing Page
   ↓
2. Login/Register
   ↓
3. Dashboard (Instructor or Student)
   ↓
4. Browse/Create Courses
   ↓
5. View Lessons & Chapters
   ↓
6. Submit Assignments
   ↓
7. View Grades
   ↓
8. AI Chat Support
```

### API Architecture
```
Client (React)
    ↓
API Routes (Express)
    ↓
Controllers (Business Logic)
    ↓
Database (MySQL/PostgreSQL)
```

---

## 🔑 API Endpoints (Chính)

### Authentication
```
POST   /api/auth/register        # Đăng ký
POST   /api/auth/login           # Đăng nhập
POST   /api/auth/logout          # Đăng xuất
POST   /api/auth/refresh         # Làm mới token
```

### Courses
```
GET    /api/courses              # Lấy tất cả khóa học
POST   /api/courses              # Tạo khóa học (Instructor)
GET    /api/courses/:id          # Chi tiết khóa học
PUT    /api/courses/:id          # Cập nhật khóa học
DELETE /api/courses/:id          # Xóa khóa học
```

### Chapters
```
GET    /api/chapters             # Lấy tất cả chương
POST   /api/chapters             # Tạo chương
GET    /api/chapters/:id         # Chi tiết chương
PUT    /api/chapters/:id         # Cập nhật chương
DELETE /api/chapters/:id         # Xóa chương
```

### Lessons
```
GET    /api/lessons              # Lấy tất cả bài học
POST   /api/lessons              # Tạo bài học
GET    /api/lessons/:id          # Chi tiết bài học
PUT    /api/lessons/:id          # Cập nhật bài học
DELETE /api/lessons/:id          # Xóa bài học
```

### Assignments
```
GET    /api/assignments          # Lấy bài tập
POST   /api/assignments          # Tạo bài tập
GET    /api/assignments/:id      # Chi tiết bài tập
POST   /api/assignments/:id/submit # Nộp bài tập
POST   /api/assignments/:id/grade  # Chấm điểm bài tập
```

### Enrollments
```
POST   /api/enrollments          # Ghi danh khóa học
GET    /api/enrollments          # Xem ghi danh
DELETE /api/enrollments/:id      # Hủy ghi danh
```

### Gradebook
```
GET    /api/gradebook            # Xem bảng điểm
GET    /api/gradebook/:courseId  # Bảng điểm của khóa học
```

---

## 🎨 Frontend Components

### Layouts
- **Navbar:** Navigation bar chính
- **Sidebar:** Bảng điều hướng phụ
- **Footer:** Chân trang

### Page Components
- **Landing Page:** Giới thiệu, tính năng
- **Login/Register:** Xác thực người dùng
- **Dashboard:** Trang chủ theo role
- **Course List:** Danh sách khóa học
- **Course Detail:** Thông tin chi tiết khóa học
- **Course Learning:** Giao diện học tập
- **Assignment Viewer:** Xem bài tập
- **Assignment Grading:** Chấm điểm bài tập
- **Gradebook:** Bảng điểm
- **Forum:** Diễn đàn thảo luận
- **Profile:** Hồ sơ người dùng
- **Timetable:** Lịch học
- **Guide:** Hướng dẫn sử dụng

### Components
- **AiChat:** Chatbot AI (Gemini)
- **FunElements:** Phần tử giao diện vui nhộn
- **LessonAiChat:** AI chat trong bài học

---

## 🔐 Authentication & Authorization

### User Roles
1. **Student** - Học viên
   - Ghi danh khóa học
   - Xem bài học
   - Nộp bài tập
   - Xem bảng điểm

2. **Instructor** - Giáo viên
   - Tạo & quản lý khóa học
   - Tạo nội dung (chương, bài học)
   - Giao bài tập
   - Chấm điểm bài tập
   - Xem danh sách học viên

3. **Admin** - Quản trị viên
   - Quản lý tất cả người dùng
   - Quản lý tất cả khóa học
   - Thống kê & báo cáo

### JWT Token
```javascript
// Access Token (ngắn hạn - 1 giờ)
{
  userId: "123",
  email: "user@example.com",
  role: "student"
}

// Refresh Token (dài hạn - 7 ngày)
{
  userId: "123"
}
```

---

## 🌐 Multi-Language Support

### Supported Languages
- **vi** - Tiếng Việt (mặc định)
- **en** - Tiếng Anh

### Implementation
```javascript
// Context API cho language
<LangContext.Provider value={{ lang: 'vi', t: translation }}>
  ...
</LangContext.Provider>

// Sử dụng trong component
const { t, lang } = useContext(LangContext);
<h1>{t('welcome')}</h1>
```

---

## 🤖 AI Chat Integration (Gemini)

### Cấu Hình
```javascript
// Frontend (.env.local)
VITE_GEMINI_API_KEY=your-api-key

// Gemini Model
Model: gemini-2.5-flash
Max Tokens: 2048
Temperature: 0.7
```

### System Prompt
```
Bạn là trợ lý AI thông minh của hệ thống học trực tuyến Lớp Học Đổi Mới. 
Hãy giúp học viên và giáo viên với các câu hỏi về khóa học, học tập, 
lập trình, và các vấn đề học thuật. Trả lời ngắn gọn, dễ hiểu, thân thiện 
và chính xác. Hỗ trợ cả tiếng Việt và tiếng Anh.
```

---

## 🧪 Testing Credentials

### Test Users (sau seed)
```
Student:
Email: student@example.com
Password: student123
Role: Student

Instructor:
Email: instructor@example.com
Password: instructor123
Role: Instructor

Admin:
Email: admin@example.com
Password: admin123
Role: Admin
```

---

## 📈 Development Roadmap

### Phase 1: Setup & Core (Week 1)
- [ ] Database schema & initialization
- [ ] API endpoints cơ bản
- [ ] Frontend setup & routing
- [ ] Authentication system

### Phase 2: Courses & Content (Week 2)
- [ ] Course CRUD
- [ ] Chapter & Lesson management
- [ ] Course learning interface

### Phase 3: Assignments & Grading (Week 3)
- [ ] Assignment creation & submission
- [ ] Grading system
- [ ] Gradebook

### Phase 4: AI & Advanced (Week 4)
- [ ] Gemini AI integration
- [ ] Forum & discussions
- [ ] Event tracking & analytics

### Phase 5: Polish & Deploy (Week 5)
- [ ] UI/UX improvements
- [ ] Performance optimization
- [ ] Testing & bug fixes
- [ ] Deployment

---

## 🛠️ Development Commands

### Backend
```bash
npm start                    # Chạy server
npm run dev                  # Chạy với nodemon
npm run init-db             # Khởi tạo database
npm run migrate             # Chạy migrations
npm run seed                # Seed dữ liệu
npm run check-db            # Kiểm tra DB
```

### Frontend
```bash
npm run dev                 # Chạy dev server
npm run build               # Build production
npm run preview             # Preview build
npm run lint                # Kiểm tra code
```

---

## 📚 Database Schema (Tóm Tắt)

### Main Tables
```sql
-- Users
users (id, email, password, fullName, role, avatar, createdAt)

-- Courses
courses (id, title, description, image, instructorId, createdAt)

-- Chapters
chapters (id, courseId, title, order, createdAt)

-- Lessons
lessons (id, chapterId, title, content, video, order, createdAt)

-- Assignments
assignments (id, courseId, title, description, dueDate, createdAt)

-- Assignment Submissions
submissions (id, assignmentId, studentId, content, grade, feedback, submittedAt)

-- Enrollments
enrollments (id, courseId, studentId, enrolledAt)

-- Events & Interactions
events (id, userId, type, courseId, createdAt)
interactions (id, userId, courseId, lessonId, type, createdAt)
```

---

## ⚙️ Configuration Files

### Backend `.env`
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=lms_db
JWT_SECRET=your-secret-key-min-32-chars
NODE_ENV=development
PORT=5000
```

### Frontend `.env.local`
```
VITE_API_URL=http://localhost:5000
VITE_GEMINI_API_KEY=your-gemini-api-key
```

---

## 🎯 Key Features Implementation Tips

### 1. **Protected Routes**
```javascript
// Frontend - ProtectedRoute component
const ProtectedRoute = ({ element, requiredRole }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  if (requiredRole && user.role !== requiredRole) return <Unauthorized />;
  
  return element;
};
```

### 2. **API Call Pattern**
```javascript
// services/api.js
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getCourses = () => api.get('/courses');
export const createCourse = (data) => api.post('/courses', data);
```

### 3. **Context for Auth**
```javascript
// contexts/AuthContext.jsx
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
# Kết nối Vercel account
vercel deploy
```

### Backend (Node.js Server)
```bash
# Setup production environment
NODE_ENV=production
npm install --production

# Run with PM2 (recommended)
npm install -g pm2
pm2 start server.js --name "lms-backend"
pm2 save
```

---

## 📞 Troubleshooting

### Common Issues

**Issue:** Port 5000 đã được sử dụng
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

**Issue:** CORS error
```javascript
// backend/server.js
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

**Issue:** Gemini API không hoạt động
- Kiểm tra VITE_GEMINI_API_KEY trong .env.local
- Xác nhận API key hợp lệ từ Google Cloud Console
- Kiểm tra quota API

---

## 📖 Resources

- [Express.js Docs](https://expressjs.com)
- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Google Gemini API](https://ai.google.dev)
- [JWT Introduction](https://jwt.io)

---

## ✅ Checklist Before Going Live

- [ ] Tất cả API endpoints hoạt động
- [ ] Authentication & Authorization hoàn tất
- [ ] UI responsive trên mobile
- [ ] Performance optimization (Lazy loading, caching)
- [ ] Error handling & validation
- [ ] Logging & monitoring
- [ ] Database backup strategy
- [ ] Security (HTTPS, environment variables)
- [ ] Unit & integration tests
- [ ] Documentation hoàn tất

---

**Last Updated:** May 2026  
**Version:** 1.0
