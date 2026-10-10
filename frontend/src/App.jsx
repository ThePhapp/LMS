import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import { lazy, Suspense, useContext } from 'react';
import { AuthContext } from './contexts/AuthContext';
import AiChat from './components/AiChat';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import {
  ADMIN_ROLES,
  AUTHENTICATED_ROLES,
  getRoleHomePath,
  hasAllowedRole,
  INSTRUCTOR_ROLES,
} from './routing/access';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CourseList = lazy(() => import('./pages/CourseList'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const CourseLearning = lazy(() => import('./pages/CourseLearning'));
const Timetable = lazy(() => import('./pages/Timetable'));
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'));
const CourseEditor = lazy(() => import('./pages/CourseEditor'));
const CourseStudents = lazy(() => import('./pages/CourseStudents'));
const StudentDetail = lazy(() => import('./pages/StudentDetail'));
const AssignmentGrading = lazy(() => import('./pages/AssignmentGrading'));
const Gradebook = lazy(() => import('./pages/Gradebook'));
const Forum = lazy(() => import('./pages/Forum'));
const Guide = lazy(() => import('./pages/Guide'));
const Profile = lazy(() => import('./pages/Profile'));
const AssignmentDetail = lazy(() => import('./pages/AssignmentDetail'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminCourses = lazy(() => import('./pages/AdminCourses'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));

function RouteFallback() {
  return <div className="main-content" role="status">Đang tải trang...</div>;
}

function PrivateRoute({ children, allowLearningLayout = false, allowedRoles = AUTHENTICATED_ROLES }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  
  if (loading) return <div className="main-content">Loading...</div>;
  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  if (!hasAllowedRole(user, allowedRoles)) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }
  
  if (allowLearningLayout) return children;
  return <div className="main-content">{children}</div>;
}

function AdminRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <div className="flex items-center justify-center h-screen w-screen"><div className="loader"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasAllowedRole(user, ADMIN_ROLES)) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }
  
  return <AdminLayout>{children}</AdminLayout>;
}

const pageVariants = {
  initial: { opacity: 0, y: 15 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -15 }
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3
};

function AnimatedPage({ children }) {
  return (
    <Motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
    >
      {children}
    </Motion.div>
  );
}

function AppContent() {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const isAdminRoute = /^\/admin(?:\/|$)/.test(location.pathname);

  if (isAdminRoute) {
    return (
      <AdminRoute>
        <AnimatePresence mode="wait">
          <Routes key={location.pathname} location={location}>
            <Route path="/admin" element={<AnimatedPage><AdminDashboard /></AnimatedPage>} />
            <Route path="/admin/courses" element={<AnimatedPage><AdminCourses /></AnimatedPage>} />
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </AnimatePresence>
      </AdminRoute>
    );
  }

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-layout">
        <AnimatePresence mode="wait">
          <Routes key={location.pathname} location={location}>
            <Route path="/" element={<AnimatedPage><Landing /></AnimatedPage>} />
            <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
            <Route path="/register" element={<AnimatedPage><Register /></AnimatedPage>} />
            <Route path="/dashboard" element={<PrivateRoute><AnimatedPage><Dashboard /></AnimatedPage></PrivateRoute>} />
            <Route path="/timetable" element={<PrivateRoute><AnimatedPage><Timetable /></AnimatedPage></PrivateRoute>} />
            <Route path="/courses" element={<PrivateRoute><AnimatedPage><CourseList /></AnimatedPage></PrivateRoute>} />
            <Route path="/courses/:id" element={<PrivateRoute><AnimatedPage><CourseDetail /></AnimatedPage></PrivateRoute>} />
            <Route path="/courses/:id/learn" element={<PrivateRoute allowLearningLayout={true}><AnimatedPage><CourseLearning /></AnimatedPage></PrivateRoute>} />
            
            {/* Instructor Routes */}
            <Route path="/instructor/dashboard" element={<PrivateRoute allowedRoles={INSTRUCTOR_ROLES}><AnimatedPage><InstructorDashboard /></AnimatedPage></PrivateRoute>} />
            <Route path="/instructor/course/create" element={<PrivateRoute allowedRoles={INSTRUCTOR_ROLES}><AnimatedPage><CourseEditor /></AnimatedPage></PrivateRoute>} />
            <Route path="/instructor/course/:id/edit" element={<PrivateRoute allowedRoles={INSTRUCTOR_ROLES}><AnimatedPage><CourseEditor /></AnimatedPage></PrivateRoute>} />
            <Route path="/instructor/course/:courseId/students" element={<PrivateRoute allowedRoles={INSTRUCTOR_ROLES}><AnimatedPage><CourseStudents /></AnimatedPage></PrivateRoute>} />
            <Route path="/instructor/course/:courseId/student/:studentId" element={<PrivateRoute allowedRoles={INSTRUCTOR_ROLES}><AnimatedPage><StudentDetail /></AnimatedPage></PrivateRoute>} />
            <Route path="/instructor/assignment/:assignmentId/grading" element={<PrivateRoute allowedRoles={INSTRUCTOR_ROLES}><AnimatedPage><AssignmentGrading /></AnimatedPage></PrivateRoute>} />

            {/* Assignment Routes */}
            <Route path="/assignments/:id" element={<PrivateRoute><AnimatedPage><AssignmentDetail /></AnimatedPage></PrivateRoute>} />

            <Route path="/courses/:id/gradebook" element={<PrivateRoute allowedRoles={INSTRUCTOR_ROLES}><AnimatedPage><Gradebook /></AnimatedPage></PrivateRoute>} />
            <Route path="/forum" element={<PrivateRoute><AnimatedPage><Forum /></AnimatedPage></PrivateRoute>} />
            <Route path="/guide" element={<PrivateRoute><AnimatedPage><Guide /></AnimatedPage></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><AnimatedPage><Profile /></AnimatedPage></PrivateRoute>} />
            <Route path="*" element={<Navigate to={getRoleHomePath(user?.role)} replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      <AiChat />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <AppContent />
      </Suspense>
    </Router>
  );
}

export default App;
