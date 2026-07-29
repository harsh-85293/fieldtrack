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

function SidebarNav() {
  return (
    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-primary-100/90 hover:bg-primary-800 hover:text-white'
            }`
          }
        >
          <item.icon className="w-5 h-5 shrink-0" />
          {item.label}
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
    <div className="min-h-screen bg-slate-100 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 bg-primary-900 text-white sticky top-0 h-screen z-30">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-primary-800">
          <div className="w-9 h-9 rounded-lg bg-primary-700 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-200" />
          </div>
          <span className="text-lg font-bold tracking-tight">FieldTrack</span>
        </div>

        <SidebarNav />

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

      {/* Main column */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile top header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-primary-900 text-white sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-300" />
            <span className="text-base font-bold">FieldTrack</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-primary-800 transition-colors"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Desktop top bar — aligned with content padding */}
        <header className="hidden md:flex items-center justify-between gap-4 px-5 lg:px-8 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-20">
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

        <main className="flex-1 overflow-y-auto pb-24 md:pb-6">
          <div className="w-full px-4 sm:px-5 lg:px-8 py-4 md:py-5">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 safe-area-pb">
          <div className="flex items-center justify-around">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-2.5 flex-1 transition-colors ${
                    isActive ? 'text-primary-700' : 'text-slate-500'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.25]' : ''}`} />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
