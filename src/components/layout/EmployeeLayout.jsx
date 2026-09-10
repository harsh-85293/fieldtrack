import React, { useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, MapPinned, Clock, User, MapPin, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { formatDate } from '../../utils/format.js';

const navItems = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/visits', label: 'Visits', icon: MapPinned },
  { to: '/app/attendance', label: 'Attendance', icon: Clock },
  { to: '/app/profile', label: 'Profile', icon: User },
];

function NavLinks({ className = '', onNavigate }) {
  return (
    <nav className={className}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-primary-100/90 hover:bg-primary-800 hover:text-white'
            }`
          }
        >
          <item.icon className="w-5 h-5 shrink-0" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function usePageMeta(displayName) {
  const { pathname } = useLocation();
  const firstName = displayName.split(' ')[0] || 'there';

  return useMemo(() => {
    if (pathname.startsWith('/app/change-password')) {
      return { title: 'Change Password', subtitle: 'Update your account password' };
    }
    if (pathname.startsWith('/app/profile')) {
      return { title: 'My Profile', subtitle: 'Manage your profile information' };
    }
    if (pathname.startsWith('/app/visits')) {
      return { title: 'Visits', subtitle: 'Your store visit history' };
    }
    if (pathname.startsWith('/app/attendance')) {
      return { title: 'Attendance', subtitle: 'Your session history' };
    }
    if (pathname.startsWith('/app/map')) {
      return { title: 'Live Map', subtitle: 'Active session tracking' };
    }
    return {
      title: `Hello, ${firstName}`,
      subtitle: 'Field employee workspace',
    };
  }, [pathname, firstName]);
}

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.name || 'Employee';
  const page = usePageMeta(displayName);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-slate-100 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)]">
      <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-[100dvh] bg-primary-900 text-white">
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-primary-800">
          <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-primary-200" />
          </div>
          <span className="text-base font-bold tracking-tight">FieldTrack</span>
        </div>

        <NavLinks className="flex-1 overflow-y-auto p-2.5 space-y-1" />

        <div className="border-t border-primary-800 p-3">
          <div className="flex items-center gap-2.5 px-1.5 py-1.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-semibold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-[11px] text-primary-300 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-primary-200 hover:bg-primary-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-col min-h-[100dvh] min-w-0 w-full">
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 bg-primary-900 text-white shadow-md">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-5 h-5 text-primary-300 shrink-0" />
            <span className="text-base font-bold truncate">FieldTrack</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-primary-800 transition-colors shrink-0"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <header className="hidden lg:flex sticky top-0 z-20 items-center justify-between gap-4 px-5 xl:px-7 py-2.5 bg-white border-b border-slate-200">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-900 truncate">{page.title}</h1>
            <p className="text-xs text-slate-500 truncate">{page.subtitle}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <p className="hidden xl:block text-xs text-slate-500">
              {formatDate(new Date(), 'EEEE, MMM d, yyyy')}
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 w-full min-w-0 pb-24 lg:pb-6">
          <div className="w-full max-w-none px-4 sm:px-5 lg:px-5 xl:px-7 py-4 sm:py-5">
            <Outlet />
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-4 w-full max-w-lg mx-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-colors ${
                    isActive ? 'text-primary-700' : 'text-slate-500'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[11px] font-medium leading-none">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
