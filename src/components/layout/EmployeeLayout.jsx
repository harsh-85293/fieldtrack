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

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Top header */}
      <header className="flex items-center justify-between px-4 py-3 bg-primary-800 text-white sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary-300" />
          <span className="text-lg font-bold">FieldTrack</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg hover:bg-primary-700 transition-colors"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 scrollbar-thin">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 shadow-lg z-30">
        <div className="flex items-center justify-around">
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
  );
}
