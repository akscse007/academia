import { Outlet, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, BookOpen, FileText, Wallet, Megaphone, UserRound } from 'lucide-react';

export default function StudentLayout() {
  const { slug } = useParams();
  const { academy } = useAuth();
  const items = [
    { to: `/a/${slug}/dashboard`, label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: `/a/${slug}/batches`, label: 'My Batches', icon: BookOpen },
    { to: `/a/${slug}/notes`, label: 'Study Materials', icon: FileText },
    { to: `/a/${slug}/fees`, label: 'Fees & Payments', icon: Wallet },
    { to: `/a/${slug}/announcements`, label: 'Announcements', icon: Megaphone },
    { to: `/a/${slug}/profile`, label: 'My Profile', icon: UserRound },
  ];
  return (
    <div className="flex min-h-screen">
      <Sidebar title={academy?.name || 'Student'} logoUrl={academy?.logoUrl} items={items} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar subtitle="Student portal" />
        <main className="flex-1 p-3 sm:p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
