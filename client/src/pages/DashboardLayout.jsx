import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Lightbulb, Bot, LogOut, Menu, X, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/generate', label: 'Generate Ideas', icon: Lightbulb },
  { to: '/mentor', label: 'AI Mentor', icon: Bot },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = () => {
    logout();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5 font-semibold text-white">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 to-fuchsia-400">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        ProjectMentor
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-indigo-500/15 text-indigo-200' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`
            }
          >
            <n.icon className="h-5 w-5" /> {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-2 text-sm">
          <div className="font-medium text-gray-200">{user?.name}</div>
          <div className="truncate text-xs text-gray-500">{user?.email}</div>
        </div>
        <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-gray-200">
          <LogOut className="h-5 w-5" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-black/30 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2 font-semibold text-white">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 to-fuchsia-400">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          ProjectMentor
        </div>
        <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-6 w-6 text-gray-300" /></button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-white/10 bg-[#0d0d18]">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 text-gray-400"><X className="h-5 w-5" /></button>
            <SidebarContent />
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
