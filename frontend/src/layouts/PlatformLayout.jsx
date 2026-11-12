import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { Building2, LayoutDashboard, UserRound } from 'lucide-react';

export default function PlatformLayout() {
  const items = [
    { to: '/platform', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/platform/academies', label: 'Academies', icon: Building2 },
    { to: '/platform/developer', label: 'Developer profile', icon: UserRound },
  ];
  return (
    <div className="flex min-h-screen">
      <Sidebar title="Platform Owner" items={items} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar subtitle="Platform administration" />
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
