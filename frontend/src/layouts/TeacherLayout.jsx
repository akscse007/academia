import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Wallet,
  BarChart3,
  Megaphone,
  Palette,
  Settings,
  Share2,
  CalendarCheck,
  FileQuestion,
} from 'lucide-react';

export default function TeacherLayout() {
  const { academy } = useAuth();
  const items = [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/share', label: 'Share with students', icon: Share2 },
    { to: '/app/students', label: 'Students', icon: Users },
    { to: '/app/batches', label: 'Batches', icon: BookOpen },
    { to: '/app/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/app/exams', label: 'Exams & tests', icon: FileQuestion },
    { to: '/app/notes', label: 'Study materials', icon: FileText },
    { to: '/app/payments', label: 'Fees & payments', icon: Wallet },
    { to: '/app/reports', label: 'Financial reports', icon: BarChart3 },
    { to: '/app/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/app/branding', label: 'Branding', icon: Palette },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ];
  return (
    <div className="flex min-h-screen">
      <Sidebar title={academy?.name || 'Academy'} logoUrl={academy?.logoUrl} items={items} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar subtitle="Teacher dashboard" />
        <main className="flex-1 p-3 sm:p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
