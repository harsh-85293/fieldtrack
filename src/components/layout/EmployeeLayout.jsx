import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, MapPinned, Clock, User, MapPin, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

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

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.name || 'Employee';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-slate-100 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      {/* Desktop / large tablet sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-[100dvh] bg-primary-900 text-white">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-primary-800">
          <div className="w-9 h-9 rounded-lg bg-primary-700 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-primary-200" />
          </div>
          <span className="text-lg font-bold tracking-tight">FieldTrack</span>
        </div>

        <NavLinks className="flex-1 overflow-y-auto p-3 space-y-1" />

        <div className="border-t border-primary-800 p-3">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-semibold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-primary-300 truncate">{user?.email}</p>
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

      {/* Main column — always full remaining width */}
      <div className="flex flex-col min-h-[100dvh] min-w-0 w-full">
        {/* Mobile / tablet top header */}
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

        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-20 items-center justify-between gap-4 px-6 xl:px-8 py-3.5 bg-white border-b border-slate-200">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              Hello, {displayName.split(' ')[0]}
            </h1>
            <p className="text-xs text-slate-500">Field employee workspace</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </header>

        <main className="flex-1 w-full min-w-0 pb-24 lg:pb-6">
          <div className="w-full max-w-none px-4 sm:px-5 lg:px-6 xl:px-8 py-4 sm:py-5">
            <Outlet />
          </div>
        </main>

        {/* Mobile / tablet bottom tabs */}
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
