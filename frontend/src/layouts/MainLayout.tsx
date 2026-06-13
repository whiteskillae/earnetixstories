import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { 
  Home, Search, PenSquare, BookOpen, User, LogOut, 
  Menu, X, Sparkles, Bookmark, Bell
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Footer } from '../components/common/Footer';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  React.useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get('/announcements');
        const data = res.data.data;
        setAnnouncements(data);
        
        if (data.length > 0) {
          const lastSeen = localStorage.getItem('lastSeenAnnouncement');
          if (!lastSeen || new Date(data[0].createdAt) > new Date(lastSeen)) {
            setHasUnread(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchAnnouncements();
  }, []);

  const handleOpenAnnouncements = () => {
    setIsAnnouncementsOpen(!isAnnouncementsOpen);
    if (!isAnnouncementsOpen && announcements.length > 0) {
      localStorage.setItem('lastSeenAnnouncement', announcements[0].createdAt);
      setHasUnread(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const menuItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Categories', icon: BookOpen, path: '/categories' },
    ...(isAuthenticated ? [
      { label: 'Write', icon: PenSquare, path: '/write' },
      { label: 'Bookmarks', icon: Sparkles, path: '/bookmarks' },
      { label: 'Profile', icon: User, path: '/profile' }
    ] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-transparent font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full glass-nav">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white font-display font-extrabold text-xl shadow-lg shadow-brand-500/20">
                E
              </span>
              <span className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Earnetix<span className="text-brand-500">Blogs</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-all hover:bg-brand-50 hover:text-brand-600 ${
                  location.pathname === item.path ? 'bg-brand-50 text-brand-600' : 'text-slate-600'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Announcements Bell */}
            <div className="relative">
              <button
                onClick={handleOpenAnnouncements}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 relative"
              >
                <Bell className="h-5 w-5" />
                {hasUnread && (
                  <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                )}
              </button>

              <AnimatePresence>
                {isAnnouncementsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setIsAnnouncementsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-xl z-40"
                    >
                      <h3 className="font-display font-black text-lg text-slate-900 mb-4 border-b border-slate-100 pb-2">Announcements</h3>
                      {announcements.length === 0 ? (
                        <p className="text-sm text-slate-400 italic text-center py-4">No recent announcements.</p>
                      ) : (
                        <div className="space-y-3">
                          {announcements.map(ann => (
                            <div key={ann._id} className={`p-3 rounded-xl border ${
                              ann.type === 'urgent' ? 'bg-red-50 border-red-100' :
                              ann.type === 'success' ? 'bg-emerald-50 border-emerald-100' :
                              ann.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                              'bg-brand-50 border-brand-100'
                            }`}>
                              <h4 className="font-bold text-sm text-slate-900 mb-1">{ann.title}</h4>
                              <p className="text-xs text-slate-600 mb-2 leading-relaxed">{ann.content}</p>
                              <span className="text-[10px] text-slate-400 font-semibold">{new Date(ann.createdAt).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/write"
                  className="hidden sm:flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all hover:-translate-y-0.5"
                >
                  <PenSquare className="h-4 w-4" />
                  Write
                </Link>
                <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 p-0.5 hover:shadow-md transition-shadow focus:outline-none"
                >
                  <img
                    src={user?.profileImage}
                    alt={user?.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                </button>

                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <>
                      {/* Click outside backdrop */}
                      <div 
                        className="fixed inset-0 z-30" 
                        onClick={() => setIsProfileDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-100 bg-white p-2 shadow-xl z-40"
                      >
                        <div className="px-3 py-2 border-b border-slate-100 mb-1">
                          <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                        </div>

                        <Link
                          to="/profile"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-500"
                        >
                          <User className="h-4 w-4" />
                          My Profile
                        </Link>

                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            logout();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Log Out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="hidden sm:inline-block rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600 shadow-md shadow-brand-500/20"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Drawer Sidebar for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/50"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed inset-y-0 left-0 z-50 w-[min(20rem,86vw)] bg-white p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <Link to="/" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white font-display font-bold">
                    E
                  </span>
                  <span className="font-display text-xl font-bold tracking-tight text-slate-900">
                    Earnetix<span className="text-brand-500">Blogs</span>
                  </span>
                </Link>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                      location.pathname === item.path 
                        ? 'bg-brand-50 text-brand-600' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </div>

              {isAuthenticated && (
                <div className="border-t border-slate-100 pt-4">
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-5 w-5" />
                    Log Out
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
          >
            <div className="fixed inset-0" onClick={() => setIsSearchOpen(false)} />
            
            <motion.div
              initial={{ y: -50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -50, scale: 0.95 }}
              className="relative w-full max-w-xl rounded-lg bg-white p-4 shadow-2xl border border-slate-100"
            >
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search titles, authors, categories, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 text-slate-800 placeholder-slate-400 outline-none text-base bg-transparent"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 pb-24 md:pb-8">
        {children}
      </main>

      <Footer />

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 glass-nav py-2 pb-safe md:hidden flex justify-around items-center px-4 rounded-t-3xl border-x border-slate-200/50">
        <Link 
          to="/" 
          className="relative flex flex-col items-center gap-1 p-2 group"
        >
          <motion.div whileTap={{ scale: 0.85 }} className={`p-1.5 rounded-2xl transition-colors ${location.pathname === '/' ? 'bg-brand-50 text-brand-600' : 'text-slate-500 group-hover:text-slate-800 group-hover:bg-slate-50'}`}>
            <Home className={`h-5 w-5 ${location.pathname === '/' ? 'fill-brand-100' : ''}`} />
          </motion.div>
          {location.pathname === '/' && <motion.div layoutId="nav-indicator" className="absolute -bottom-1 w-1 h-1 rounded-full bg-brand-500" />}
        </Link>

        <button 
          onClick={() => setIsSearchOpen(true)}
          className="relative flex flex-col items-center gap-1 p-2 group"
        >
          <motion.div whileTap={{ scale: 0.85 }} className="p-1.5 rounded-2xl text-slate-500 group-hover:text-slate-800 group-hover:bg-slate-50 transition-colors">
            <Search className="h-5 w-5" />
          </motion.div>
        </button>

        {isAuthenticated && (
          <>
            <Link 
              to="/write" 
              className="relative flex flex-col items-center -mt-6 p-2 group"
            >
              <motion.div whileTap={{ scale: 0.85 }} className="p-4 rounded-full bg-gradient-to-tr from-brand-500 to-brand-400 text-white shadow-lg shadow-brand-500/30 transition-transform group-hover:-translate-y-1">
                <PenSquare className="h-6 w-6" />
              </motion.div>
            </Link>

            <Link 
              to="/bookmarks" 
              className="relative flex flex-col items-center gap-1 p-2 group"
            >
              <motion.div whileTap={{ scale: 0.85 }} className={`p-1.5 rounded-2xl transition-colors ${location.pathname === '/bookmarks' ? 'bg-brand-50 text-brand-600' : 'text-slate-500 group-hover:text-slate-800 group-hover:bg-slate-50'}`}>
                <Bookmark className={`h-5 w-5 ${location.pathname === '/bookmarks' ? 'fill-brand-100' : ''}`} />
              </motion.div>
              {location.pathname === '/bookmarks' && <motion.div layoutId="nav-indicator" className="absolute -bottom-1 w-1 h-1 rounded-full bg-brand-500" />}
            </Link>
          </>
        )}

        <Link 
          to={isAuthenticated ? "/profile" : "/login"} 
          className="relative flex flex-col items-center gap-1 p-2 group"
        >
          <motion.div whileTap={{ scale: 0.85 }} className={`p-1.5 rounded-2xl transition-colors ${(location.pathname === '/profile' || location.pathname === '/login') ? 'bg-brand-50 text-brand-600' : 'text-slate-500 group-hover:text-slate-800 group-hover:bg-slate-50'}`}>
            <User className={`h-5 w-5 ${(location.pathname === '/profile' || location.pathname === '/login') ? 'fill-brand-100' : ''}`} />
          </motion.div>
          {(location.pathname === '/profile' || location.pathname === '/login') && <motion.div layoutId="nav-indicator" className="absolute -bottom-1 w-1 h-1 rounded-full bg-brand-500" />}
        </Link>
      </div>
    </div>
  );
};
