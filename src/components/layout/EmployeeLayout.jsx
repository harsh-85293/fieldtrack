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

function NavItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-primary-700 text-white'
            : 'text-primary-100 hover:bg-primary-800 hover:text-white'
        }`
      }
    >
      <item.icon className="w-5 h-5 shrink-0" />
      {item.label}
    </NavLink>
  );
}

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 bg-primary-900 text-white fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-primary-800">
          <MapPin className="w-7 h-7 text-primary-300" />
          <span className="text-xl font-bold">FieldTrack</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>

        <div className="border-t border-primary-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-semibold">
              {(user?.fullName || user?.name)?.charAt(0)?.toUpperCase() || 'E'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName || user?.name || 'Employee'}</p>
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
      <div className="flex-1 md:ml-60 lg:ml-64 flex flex-col min-h-screen min-w-0">
        {/* Mobile top header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-primary-800 text-white sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary-300" />
            <span className="text-lg font-bold">FieldTrack</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-primary-700 transition-colors"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Desktop top bar */}
        <header className="hidden md:flex items-center justify-between px-6 lg:px-8 py-4 bg-white border-b border-gray-200 sticky top-0 z-20">
          <div>
            <p className="text-sm text-gray-500">Field employee</p>
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {user?.fullName || user?.name
                ? `Hello, ${(user.fullName || user.name).split(' ')[0]}`
                : 'Dashboard'}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-8 scrollbar-thin">
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 shadow-lg z-30">
          <div className="flex items-center justify-around max-w-lg mx-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-2 py-3 flex-1 transition-colors ${
                    isActive ? 'text-primary-700' : 'text-gray-500'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`w-6 h-6 ${isActive ? 'fill-primary-100' : ''}`}
                    />
                    <span className="text-xs font-medium">{item.label}</span>
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
