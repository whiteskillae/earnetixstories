import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Users, BookOpen, AlertOctagon, TrendingUp, Trash2, 
  Ban, ShieldAlert, Award, Plus, Layers, ShieldCheck,
  Info, X, ExternalLink
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Admin: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'analytics' | 'users' | 'categories' | 'reports' | 'requests' | 'live_blogs' | 'logs' | 'announcements'>('analytics');
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Data lists
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [pendingBlogs, setPendingBlogs] = useState<any[]>([]);
  const [liveBlogs, setLiveBlogs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<Record<string, any[]>>({});
  
  // Form states
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const newCatIcon = 'BookOpen';

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementType, setAnnouncementType] = useState('info');
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectBlogId, setRejectBlogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const defaultRejectReasons = [
    "Violates Community Guidelines",
    "Spam or Promotional Content",
    "Low Quality or Unreadable",
    "Plagiarism / Copied Content"
  ];

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchPanelData();
  }, [activePanel]);

  const fetchPanelData = async () => {
    setErrorMsg(null);
    try {
      if (activePanel === 'analytics') {
        const res = await api.get('/admin/analytics');
        setAnalytics(res.data.data);
      } else if (activePanel === 'users') {
        const res = await api.get('/admin/users');
        setUsers(res.data.data);
      } else if (activePanel === 'categories') {
        const res = await api.get('/categories');
        setCategories(res.data.data);
      } else if (activePanel === 'reports') {
        const res = await api.get('/admin/reports');
        setReports(res.data.data);
      } else if (activePanel === 'requests') {
        const res = await api.get('/admin/blogs?status=pending_review');
        setPendingBlogs(res.data.data);
      } else if (activePanel === 'live_blogs') {
        const res = await api.get('/admin/blogs?status=published&limit=100');
        setLiveBlogs(res.data.data);
      } else if (activePanel === 'logs') {
        const res = await api.get('/admin/logs');
        setLogs(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error?.message || 'Failed to fetch admin panel resources.');
    }
  };

  const handleUpdateStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await api.put(`/admin/users/${userId}/status`, { status: nextStatus });
      setUsers(users.map(u => u._id === userId ? { ...u, status: res.data.data.status } : u));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
      if (expandedUserId === userId) setExpandedUserId(null);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.response?.data?.error?.message || 'Failed to delete user.');
    }
  };

  const toggleExpandUser = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    // Fetch posts if we haven't already
    if (!userPosts[userId]) {
      try {
        const res = await api.get(`/blogs/user/${userId}`);
        setUserPosts(prev => ({ ...prev, [userId]: res.data.data }));
      } catch (err) {
        console.error('Failed to fetch user posts', err);
      }
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await api.post('/categories', {
        name: newCatName,
        description: newCatDesc,
        icon: newCatIcon,
      });
      setCategories([...categories, res.data.data]);
      setNewCatName('');
      setNewCatDesc('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to create category.');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!window.confirm('Delete category? Blogs matching this category might trigger errors.')) return;
    try {
      await api.delete(`/categories/${catId}`);
      setCategories(categories.filter(c => c._id !== catId));
      toast.success('Category deleted');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete category');
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      await api.put(`/admin/reports/${reportId}/resolve`, { status });
      setReports(reports.map(r => r._id === reportId ? { ...r, status } : r));
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveBlog = async (blogId: string) => {
    try {
      await api.put(`/admin/blogs/${blogId}/moderate`, { status: 'approved' });
      setPendingBlogs(pendingBlogs.filter(b => b._id !== blogId));
      toast.success('Blog approved and published!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to approve blog');
    }
  };

  const handleRejectBlog = async (blogId: string, isLive: boolean = false) => {
    try {
      if (isLive) {
        if (!window.confirm('Are you sure you want to completely delete this LIVE blog?')) return;
        await api.delete(`/admin/blogs/${blogId}`);
        setLiveBlogs(liveBlogs.filter(b => b._id !== blogId));
        toast.success('Live blog permanently deleted');
      } else {
        setRejectBlogId(blogId);
        setRejectModalOpen(true);
        setRejectReason('');
      }
    } catch (e) {
      console.error(e);
      toast.error('Operation failed');
    }
  };

  const submitRejectBlog = async () => {
    if (!rejectBlogId) return;
    if (!rejectReason.trim()) {
      toast.error('Please select or enter a rejection reason.');
      return;
    }

    try {
      await api.put(`/admin/blogs/${rejectBlogId}/moderate`, { 
        status: 'rejected',
        rejectionReason: rejectReason 
      }); 
      setPendingBlogs(pendingBlogs.filter(b => b._id !== rejectBlogId));
      setRejectModalOpen(false);
      setRejectBlogId(null);
      toast.success('Blog rejected');
    } catch (e) {
      console.error(e);
      toast.error('Failed to reject blog');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementContent.trim()) return;
    try {
      await api.post('/admin/announcements', {
        title: announcementTitle,
        content: announcementContent,
        type: announcementType,
      });
      toast.success('Announcement published!');
      setAnnouncementTitle('');
      setAnnouncementContent('');
    } catch (e) {
      console.error(e);
      toast.error('Failed to publish announcement');
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 py-4">
      <Toaster position="top-right" />
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 shrink-0 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900 tracking-tight">Admin Console</h1>
          <p className="text-xs text-slate-500 mt-1">Manage platform, users, and content</p>
        </div>

        <nav className="flex flex-col gap-1">
          <button
            onClick={() => setActivePanel('analytics')}
            className={`text-sm font-semibold px-4 py-2.5 rounded-xl transition-all text-left flex items-center gap-3 ${
              activePanel === 'analytics' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="h-4 w-4" /> Analytics
          </button>
          <button
            onClick={() => setActivePanel('users')}
            className={`text-sm font-semibold px-4 py-2.5 rounded-xl transition-all text-left flex items-center gap-3 ${
              activePanel === 'users' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" /> Users
          </button>
          <button
            onClick={() => setActivePanel('categories')}
            className={`text-sm font-semibold px-4 py-2.5 rounded-xl transition-all text-left flex items-center gap-3 ${
              activePanel === 'categories' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Layers className="h-4 w-4" /> Categories
          </button>
          <button
            onClick={() => setActivePanel('reports')}
            className={`text-sm font-semibold px-4 py-2.5 rounded-xl transition-all text-left flex items-center gap-3 ${
              activePanel === 'reports' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="h-4 w-4" /> Reports
          </button>
          <button
            onClick={() => setActivePanel('requests')}
            className={`text-sm font-semibold px-4 py-2.5 rounded-xl transition-all text-left flex items-center gap-3 ${
              activePanel === 'requests' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <AlertOctagon className="h-4 w-4" /> Blog Requests
          </button>
          <button
            onClick={() => setActivePanel('live_blogs')}
            className={`text-sm font-semibold px-4 py-2.5 rounded-xl transition-all text-left flex items-center gap-3 ${
              activePanel === 'live_blogs' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Live Blogs
          </button>
          <button
            onClick={() => setActivePanel('announcements')}
            className={`text-sm font-semibold px-4 py-2.5 rounded-xl transition-all text-left flex items-center gap-3 ${
              activePanel === 'announcements' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Award className="h-4 w-4" /> Announcements
          </button>
          <button
            onClick={() => setActivePanel('logs')}
            className={`text-sm font-semibold px-4 py-2.5 rounded-xl transition-all text-left flex items-center gap-3 ${
              activePanel === 'logs' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> System Logs
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">

      {errorMsg && (
        <div className="bg-red-50 border border-red-100 text-red-650 text-sm p-4 rounded-xl flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Analytics Panel */}
      {activePanel === 'analytics' && analytics && (
        <div className="space-y-8">
          {/* Quick Counter Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
                <Users className="h-5 w-5 text-brand-500" />
              </div>
              <p className="text-3xl font-display font-black text-slate-900">{analytics.summary.totalUsers}</p>
            </div>
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Published Stories</span>
                <BookOpen className="h-5 w-5 text-brand-500" />
              </div>
              <p className="text-3xl font-display font-black text-slate-900">{analytics.summary.totalBlogs}</p>
            </div>
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Views</span>
                <TrendingUp className="h-5 w-5 text-brand-500" />
              </div>
              <p className="text-3xl font-display font-black text-slate-900">{analytics.summary.totalViews}</p>
            </div>
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Reports</span>
                <AlertOctagon className="h-5 w-5 text-brand-500" />
              </div>
              <p className="text-3xl font-display font-black text-slate-900">{analytics.summary.totalReports}</p>
            </div>
          </div>

          {/* Traffic / Activity Chart */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h2 className="font-display font-extrabold text-md text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">
              Platform Activity (Last 7 Days)
            </h2>
            <div className="h-64 w-full">
              {/* Mock data for chart, ideally fetched from backend */}
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.userGrowth || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Leaderboard */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h2 className="font-display font-extrabold text-md text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">
                Topic Performance Leaderboard
              </h2>
              <div className="space-y-4">
                {analytics.categoryStats.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No topic stats available.</p>
                ) : (
                  analytics.categoryStats.map((cat: any) => (
                    <div key={cat._id} className="flex justify-between items-center text-sm">
                      <div>
                        <p className="font-semibold text-slate-800">{cat.name}</p>
                        <p className="text-[10px] text-slate-400">{cat.postsCount} published stories</p>
                      </div>
                      <span className="font-bold text-slate-600 bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg">
                        {cat.viewsCount} views
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* General System Config panel summary */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h2 className="font-display font-extrabold text-md text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">
                Draft Status Pipeline
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <span className="text-sm text-slate-550">Draft posts currently saved</span>
                  <span className="text-sm font-bold text-slate-800">{analytics.summary.totalDrafts}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <span className="text-sm text-slate-550">Scheduled publications pending</span>
                  <span className="text-sm font-bold text-slate-800">{analytics.summary.totalScheduled}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-550">Discussion comments posted</span>
                  <span className="text-sm font-bold text-slate-800">{analytics.summary.totalComments}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Panel */}
      {activePanel === 'users' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Profile Info</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4">Access Level</th>
                  <th className="p-4 pr-6 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((item) => (
                  <React.Fragment key={item._id}>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 flex items-center gap-3">
                        <img src={item.profileImage} alt={item.name} className="h-8 w-8 rounded-full object-cover border" />
                        <span className="font-semibold text-slate-800">{item.name}</span>
                      </td>
                      <td className="p-4 text-slate-500">{item.email}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${
                            item.status === 'active' 
                              ? 'bg-emerald-500' 
                              : item.status === 'suspended'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`} />
                          <span className="text-xs font-medium text-slate-600 capitalize">
                            {item.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                          item.role === 'admin' 
                            ? 'bg-brand-50 text-brand-600 border-brand-100' 
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {item.role}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right flex items-center justify-end gap-1.5 mt-1">
                        <button
                          onClick={() => toggleExpandUser(item._id)}
                          className={`p-1.5 rounded-lg border transition-all ${expandedUserId === item._id ? 'bg-brand-50 border-brand-200 text-brand-600' : 'border-slate-200 text-brand-500 hover:bg-brand-50'}`}
                          title="Toggle Info"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(item._id, item.status)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            item.status === 'active'
                              ? 'border-amber-200 text-amber-500 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={item.status === 'active' ? 'Suspend user' : 'Activate user'}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(item._id)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                          title="Permanently Delete User"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                    {/* Expandable Details Row */}
                    {expandedUserId === item._id && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={5} className="p-6 border-b border-slate-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-slate-600 mb-6">
                            <div>
                              <p className="font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Profile Data</p>
                              <p className="mb-1"><span className="font-semibold text-slate-700">Bio:</span> {item.bio || 'Not provided'}</p>
                              <p className="mb-1"><span className="font-semibold text-slate-700">Mobile:</span> {item.mobileNumber || 'Not provided'}</p>
                              <p className="mb-1"><span className="font-semibold text-slate-700">Country:</span> {item.country || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Activity Data</p>
                              <p className="mb-1"><span className="font-semibold text-slate-700">Registered:</span> {new Date(item.createdAt).toLocaleString()}</p>
                              <p className="mb-1"><span className="font-semibold text-slate-700">Last Login:</span> {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : 'Never'}</p>
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Telemetry / Hardware</p>
                              <p className="mb-1"><span className="font-semibold text-slate-700">IP Address:</span> <code className="bg-white px-1 py-0.5 rounded text-[10px] border border-slate-200 ml-1">{item.ipAddress || 'Unknown'}</code></p>
                              <p className="mb-1"><span className="font-semibold text-slate-700">Device:</span> {item.deviceInfo || 'Unknown'}</p>
                              <p className="mb-1"><span className="font-semibold text-slate-700">Browser:</span> {item.browserInfo || 'Unknown'}</p>
                            </div>
                          </div>
                          
                          {/* User Posts Section */}
                          <div>
                            <p className="font-bold text-slate-800 uppercase tracking-wider mb-3 border-b border-slate-200 pb-1 flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-brand-500" />
                              User's Posts ({userPosts[item._id]?.length || 0})
                            </p>
                            {!userPosts[item._id] ? (
                              <p className="text-slate-400 italic">Loading posts...</p>
                            ) : userPosts[item._id]?.length === 0 ? (
                              <p className="text-slate-400 italic">This user has not published any posts.</p>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {userPosts[item._id]?.map(post => (
                                  <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" key={post._id} className="relative aspect-square group bg-white border border-slate-200 overflow-hidden rounded-lg block">
                                    <img 
                                      src={post.coverImage} 
                                      alt={post.title} 
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/60 transition-colors flex flex-col justify-end opacity-0 group-hover:opacity-100 p-2">
                                      <p className="text-white font-bold text-[10px] line-clamp-2">{post.title}</p>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories Panel */}
      {activePanel === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Creator Form */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm h-fit">
            <h3 className="font-display font-extrabold text-md text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">
              Add New Category
            </h3>
            
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technology"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full text-sm text-slate-800 border border-slate-200 p-2.5 rounded-xl focus:border-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Description
                </label>
                <textarea
                  placeholder="Short description snippet..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full text-sm text-slate-800 border border-slate-200 p-2.5 rounded-xl focus:border-brand-500 outline-none h-[80px] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-brand-500 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-brand-600 transition-colors shadow-md shadow-brand-500/10"
              >
                <Plus className="h-4 w-4" />
                Create Topic
              </button>
            </form>
          </div>

          {/* List display */}
          <div className="md:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Topic Name</th>
                    <th className="p-4">Slug Identifier</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 pr-6 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {categories.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 font-semibold text-slate-800">{c.name}</td>
                      <td className="p-4 text-xs font-mono text-slate-400">{c.slug}</td>
                      <td className="p-4 text-slate-500 max-w-[200px] truncate">{c.description || 'No description.'}</td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleDeleteCategory(c._id)}
                          className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reports Panel */}
      {activePanel === 'reports' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          {reports.length === 0 ? (
            <div className="text-center py-16 text-slate-400 italic">No reports submitted.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Reporter</th>
                    <th className="p-4">Content Type</th>
                    <th className="p-4">Reason for reporting</th>
                    <th className="p-4">Resolution Status</th>
                    <th className="p-4 pr-6 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {reports.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <p className="font-semibold text-slate-800">{r.reporter.name}</p>
                        <p className="text-[10px] text-slate-400">{r.reporter.email}</p>
                      </td>
                      <td className="p-4 capitalize">
                        <span className="text-xs font-bold text-slate-650 bg-slate-50 px-2 py-0.5 border rounded-md">
                          {r.targetType}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">{r.reason}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          r.status === 'pending'
                            ? 'bg-amber-50 text-amber-600'
                            : r.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-100 text-slate-450'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right flex items-center justify-end gap-1.5 mt-1.5">
                        {r.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleResolveReport(r._id, 'resolved')}
                              className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all"
                              title="Resolve report"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleResolveReport(r._id, 'dismissed')}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-450 hover:bg-slate-50 transition-all"
                              title="Dismiss report"
                            >
                              <Layers className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Blog Requests Panel */}
      {activePanel === 'requests' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          {pendingBlogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 italic">No pending blogs to review.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Blog Details</th>
                    <th className="p-4">Author</th>
                    <th className="p-4">Date Submitted</th>
                    <th className="p-4 pr-6 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {pendingBlogs.map((blog) => (
                    <tr key={blog._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <p className="font-semibold text-slate-800 line-clamp-1 max-w-sm">{blog.title}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1 max-w-sm">{blog.excerpt}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <img src={blog.author?.profileImage || 'https://res.cloudinary.com/default-avatar.png'} alt={blog.author?.name || 'Unknown User'} className="h-6 w-6 rounded-full object-cover border" />
                          <span className="text-xs font-semibold text-slate-700">{blog.author?.name || 'Unknown User'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(blog.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 pr-6 text-right flex items-center justify-end gap-1.5 mt-1.5">
                        <a 
                          href={`/blog/${blog.slug}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-brand-200 text-brand-500 hover:bg-brand-50 transition-all flex items-center gap-1 text-xs font-semibold mr-2"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Read
                        </a>
                        <button
                          onClick={() => handleApproveBlog(blog._id)}
                          className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all"
                          title="Approve Blog"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRejectBlog(blog._id)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                          title="Reject and Delete Blog"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Live Blogs Panel */}
      {activePanel === 'live_blogs' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          {liveBlogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 italic">No live blogs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Blog Details</th>
                    <th className="p-4">Author</th>
                    <th className="p-4">Metrics</th>
                    <th className="p-4">Published At</th>
                    <th className="p-4 pr-6 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {liveBlogs.map((blog) => (
                    <tr key={blog._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <p className="font-semibold text-slate-800 line-clamp-1 max-w-sm">{blog.title}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1 max-w-sm">{blog.excerpt}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <img src={blog.author?.profileImage || 'https://res.cloudinary.com/default-avatar.png'} alt={blog.author?.name} className="h-6 w-6 rounded-full object-cover border" />
                          <span className="text-xs font-semibold text-slate-700">{blog.author?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                          <span className="flex items-center gap-1" title="Views"><TrendingUp className="h-3 w-3" /> {blog.viewsCount}</span>
                          <span className="flex items-center gap-1" title="Likes"><Award className="h-3 w-3" /> {blog.likesCount}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 pr-6 text-right flex items-center justify-end gap-1.5 mt-1.5">
                        <a 
                          href={`/blog/${blog.slug}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-brand-200 text-brand-500 hover:bg-brand-50 transition-all flex items-center gap-1 text-xs font-semibold mr-2"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Read
                        </a>
                        <button
                          onClick={() => handleRejectBlog(blog._id, true)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all shadow-sm"
                          title="Force Delete Live Blog"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Announcements Panel */}
      {activePanel === 'announcements' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm max-w-2xl mx-auto">
          <h2 className="font-display font-black text-2xl text-slate-800 mb-6">Create Announcement</h2>
          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                placeholder="Announcement Title"
                value={announcementTitle}
                onChange={e => setAnnouncementTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Message Content</label>
              <textarea
                placeholder="Type your message here..."
                value={announcementContent}
                onChange={e => setAnnouncementContent(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-brand-500 outline-none min-h-[120px] resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={announcementType}
                onChange={e => setAnnouncementType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-brand-500 outline-none bg-white"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-brand-500 text-white font-bold text-sm py-3 rounded-xl hover:bg-brand-600 transition-colors"
            >
              Publish Announcement
            </button>
          </form>
        </div>
      )}

      {/* System Logs Panel */}
      {activePanel === 'logs' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          {logs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 italic">No system logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Timestamp</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Details</th>
                    <th className="p-4 pr-6">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 font-semibold text-slate-700 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="p-4 text-slate-600">
                        {log.details}
                      </td>
                      <td className="p-4 pr-6 text-slate-500 text-xs">
                        {log.adminId ? (
                          <span>{log.adminId.name} <br/><span className="text-[10px]">{log.adminId.email}</span></span>
                        ) : 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setRejectModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display font-black text-xl text-slate-900 mb-4">Reject Blog Request</h3>
            <p className="text-sm text-slate-500 mb-4">Select a default reason or type your own. The author will see this reason.</p>
            
            <div className="flex flex-col gap-2 mb-4">
              {defaultRejectReasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                    rejectReason === reason 
                      ? 'bg-brand-50 border-brand-200 text-brand-600 font-semibold' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Or type a custom reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none mb-4 resize-y min-h-[80px]"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitRejectBlog}
                className="px-4 py-2 text-sm font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-md transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
};

