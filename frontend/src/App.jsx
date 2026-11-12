import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Loader from './components/Loader';

import Landing from './pages/Landing';
import RegisterAcademy from './pages/RegisterAcademy';
import PlatformLogin from './pages/PlatformLogin';
import AcademyLogin from './pages/AcademyLogin';
import AcademyRegister from './pages/AcademyRegister';
import AboutDeveloper from './pages/AboutDeveloper';
import NotFound from './pages/NotFound';

import PlatformDashboard from './pages/platform/PlatformDashboard';
import PlatformAcademies from './pages/platform/PlatformAcademies';
import PlatformDeveloper from './pages/platform/PlatformDeveloper';
import PlatformLayout from './layouts/PlatformLayout';

import TeacherLayout from './layouts/TeacherLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherStudents from './pages/teacher/TeacherStudents';
import TeacherShare from './pages/teacher/TeacherShare';
import TeacherBatches from './pages/teacher/TeacherBatches';
import TeacherBatchDetail from './pages/teacher/TeacherBatchDetail';
import TeacherNotes from './pages/teacher/TeacherNotes';
import TeacherPayments from './pages/teacher/TeacherPayments';
import TeacherReports from './pages/teacher/TeacherReports';
import TeacherAnnouncements from './pages/teacher/TeacherAnnouncements';
import TeacherBranding from './pages/teacher/TeacherBranding';
import TeacherSettings from './pages/teacher/TeacherSettings';

import StudentLayout from './layouts/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentBatches from './pages/student/StudentBatches';
import StudentNotes from './pages/student/StudentNotes';
import StudentNoteViewer from './pages/student/StudentNoteViewer';
import StudentFees from './pages/student/StudentFees';
import StudentAnnouncements from './pages/student/StudentAnnouncements';
import StudentProfile from './pages/student/StudentProfile';

function RequireAuth({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function Redirector() {
  const { user, loading, academy } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Landing />;
  if (user.role === 'platform_owner') return <Navigate to="/platform" replace />;
  if (user.role === 'teacher') return <Navigate to="/app" replace />;
  if (user.role === 'student' && academy) return <Navigate to={`/a/${academy.slug}/dashboard`} replace />;
  return <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Redirector />} />
      <Route path="/register-academy" element={<RegisterAcademy />} />
      <Route path="/login" element={<PlatformLogin />} />
      <Route path="/about-developer" element={<AboutDeveloper />} />

      {/* Academy-branded public routes */}
      <Route path="/a/:slug/login" element={<AcademyLogin />} />
      <Route path="/a/:slug/register" element={<AcademyRegister />} />

      {/* Platform owner */}
      <Route
        path="/platform"
        element={
          <RequireAuth role="platform_owner">
            <PlatformLayout />
          </RequireAuth>
        }
      >
        <Route index element={<PlatformDashboard />} />
        <Route path="academies" element={<PlatformAcademies />} />
        <Route path="developer" element={<PlatformDeveloper />} />
      </Route>

      {/* Teacher */}
      <Route
        path="/app"
        element={
          <RequireAuth role="teacher">
            <TeacherLayout />
          </RequireAuth>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="share" element={<TeacherShare />} />
        <Route path="batches" element={<TeacherBatches />} />
        <Route path="batches/:id" element={<TeacherBatchDetail />} />
        <Route path="notes" element={<TeacherNotes />} />
        <Route path="payments" element={<TeacherPayments />} />
        <Route path="reports" element={<TeacherReports />} />
        <Route path="announcements" element={<TeacherAnnouncements />} />
        <Route path="branding" element={<TeacherBranding />} />
        <Route path="settings" element={<TeacherSettings />} />
      </Route>

      {/* Student — nested under academy slug */}
      <Route
        path="/a/:slug"
        element={
          <RequireAuth role="student">
            <StudentLayout />
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="batches" element={<StudentBatches />} />
        <Route path="notes" element={<StudentNotes />} />
        <Route path="notes/:id" element={<StudentNoteViewer />} />
        <Route path="fees" element={<StudentFees />} />
        <Route path="announcements" element={<StudentAnnouncements />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
