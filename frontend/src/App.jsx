import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CourseList from './pages/CourseList';
import CourseDetail from './pages/CourseDetail';
import CourseLearning from './pages/CourseLearning';
import Timetable from './pages/Timetable';
import InstructorDashboard from './pages/InstructorDashboard'; 
import CourseEditor from './pages/CourseEditor';
import CourseStudents from './pages/CourseStudents';
import StudentDetail from './pages/StudentDetail';
import AssignmentGrading from './pages/AssignmentGrading';
import Gradebook from './pages/Gradebook';
import Forum from './pages/Forum';
import Guide from './pages/Guide';
import Profile from './pages/Profile';
import AssignmentDetail from './pages/AssignmentDetail';
import { useContext } from 'react';
import { AuthContext } from './contexts/AuthContext';
import AiChat from './components/AiChat';
import AdminDashboard from './pages/AdminDashboard';
import AdminCourses from './pages/AdminCourses';
import AdminLayout from './components/AdminLayout';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import {
  ADMIN_ROLES,
  AUTHENTICATED_ROLES,
  getRoleHomePath,
  hasAllowedRole,
  INSTRUCTOR_ROLES,
} from './routing/access';

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
      <AppContent />
    </Router>
  );
}

export default App;
