import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { Home, Compass, Bookmark, User, PenSquare } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Search', path: '/search', icon: Compass },
    { label: 'Write', path: '/write', icon: PenSquare, requiresAuth: true },
    { label: 'Saved', path: '/bookmarks', icon: Bookmark, requiresAuth: true },
    { label: 'Profile', path: '/profile', icon: User, requiresAuth: true },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 z-40 pb-safe">
      <nav className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          if (item.requiresAuth && !isAuthenticated) return null;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-brand-500' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </NavLink>
          );
        })}
        {!isAuthenticated && (
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-brand-500' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Log In</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
};
