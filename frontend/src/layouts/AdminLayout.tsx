import React from 'react';
import { useAuth } from '../store/AuthContext';
import { Shield, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminUser, adminLogout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await adminLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white flex flex-row items-center justify-between px-6 py-4 shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/20 p-2 rounded-xl border border-brand-500/50">
            <Shield className="h-6 w-6 text-brand-500" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg leading-tight tracking-tight">Admin System</h2>
            <p className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Secure Zone</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Main Site
          </Link>
          <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
            <img 
              src={adminUser?.profileImage || 'https://res.cloudinary.com/default-avatar.png'} 
              alt="Admin" 
              className="w-7 h-7 rounded-full border border-slate-600"
            />
            <div className="hidden sm:block">
              <p className="text-xs font-semibold truncate max-w-[100px]">{adminUser?.name}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="ml-2 flex justify-center items-center p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};
