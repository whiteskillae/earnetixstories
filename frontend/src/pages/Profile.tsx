import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import api from '../services/api';
import { ImageIcon, Heart, MessageCircle, Bookmark, Grid } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'liked' | 'followers' | 'following'>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [savedBlogs, setSavedBlogs] = useState<any[]>([]);
  const [likedBlogs, setLikedBlogs] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [country, setCountry] = useState(user?.country || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '');
  const [gender, setGender] = useState(user?.gender || '');
  const [portfolioWebsite, setPortfolioWebsite] = useState(user?.portfolioWebsite || '');
  const [isLoading, setIsLoading] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [postsRes, savedRes, likedRes, followersRes, followingRes] = await Promise.all([
        api.get(`/blogs/user/${user?._id}`),
        api.get('/users/profile/saved-blogs'),
        api.get('/users/profile/liked-blogs'),
        api.get(`/users/${user?._id}/followers`),
        api.get(`/users/${user?._id}/following`),
      ]);
      setPosts(postsRes.data.data || []);
      setSavedBlogs(savedRes.data.data || []);
      setLikedBlogs(likedRes.data.data || []);
      setFollowers(followersRes.data.data || []);
      setFollowing(followingRes.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      if (avatarFile) {
        const avatarData = new FormData();
        avatarData.append('avatar', avatarFile);
        const uploadRes = await api.put('/users/profile/avatar', avatarData, {
          headers: { 'Content-Type': undefined },
        });
        updateUser({ profileImage: uploadRes.data.data.profileImage });
        setAvatarFile(null);
      }

      const res = await api.put('/users/profile', { 
        name, username, bio, country, dateOfBirth, gender, portfolioWebsite 
      });
      updateUser(res.data.data);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setIsEditing(true);
    }
  };

  const handleUnfollow = async (id: string) => {
    try {
      await api.delete(`/users/${id}/follow`);
      setFollowing(following.filter(f => f._id !== id));
    } catch (err) {
      alert('Failed to unfollow');
    }
  };

  const handleRemoveFollower = async (id: string) => {
    try {
      await api.delete(`/users/${id}/follower`);
      setFollowers(followers.filter(f => f._id !== id));
    } catch (err) {
      alert('Failed to remove follower');
    }
  };

  const renderBlogGrid = (blogs: any[]) => (
    <div className="mt-8 grid grid-cols-3 gap-1 sm:gap-4">
      {blogs.map((post) => (
        <Link to={`/blog/${post.slug}`} key={post._id} className="relative aspect-square group bg-slate-100 overflow-hidden rounded-md sm:rounded-xl block">
          <img 
            src={post.coverImage} 
            alt={post.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/60 transition-colors flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-2 sm:p-4 text-center">
            <p className="text-white font-bold text-xs sm:text-sm line-clamp-2 mb-2">{post.title}</p>
            <div className="flex gap-4 text-white font-semibold text-xs sm:text-sm">
              <span className="flex items-center gap-1"><Heart className="h-4 w-4 fill-white" /> {post.likesCount || 0}</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4 fill-white" /> {post.commentsCount || 0}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 pb-8 border-b border-slate-200">
        <div className="relative group rounded-full overflow-hidden h-32 w-32 sm:h-40 sm:w-40 border-4 border-white shadow-lg bg-slate-50 flex-shrink-0">
          <img
            src={avatarPreview || user?.profileImage}
            alt={user?.name}
            className="h-full w-full object-cover"
          />
          {isEditing && (
            <label className="absolute inset-0 bg-slate-900/40 flex items-center justify-center cursor-pointer transition-opacity z-10">
              <ImageIcon className="h-6 w-6 text-white" />
              <input type="file" onChange={handleAvatarChange} accept="image/*" className="hidden" />
            </label>
          )}
        </div>

        <div className="flex-1 w-full">
          {isEditing ? (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Username (Max 12 changes lifetime)</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full border p-2 rounded resize-none" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Country</label>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date of Birth</label>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full border p-2 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full border p-2 rounded bg-white">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Website</label>
                  <input type="url" value={portfolioWebsite} onChange={(e) => setPortfolioWebsite(e.target.value)} className="w-full border p-2 rounded" placeholder="https://" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex-1">Cancel</button>
                <button onClick={handleUpdateProfile} disabled={isLoading} className="px-4 py-2 text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 rounded-lg transition-colors flex-1">{isLoading ? 'Saving...' : 'Save Profile'}</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{user?.name}</h1>
                <button onClick={() => setIsEditing(true)} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg transition-colors">Edit Profile</button>
              </div>
              <p className="text-sm text-slate-500 mb-4 font-medium">@{user?.username}</p>
              
              <div className="flex gap-6 mb-6">
                <button onClick={() => setActiveTab('posts')} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 hover:text-brand-500">
                  <span className="font-bold text-slate-900">{posts.length}</span> <span className="text-sm text-slate-600">posts</span>
                </button>
                <button onClick={() => setActiveTab('followers')} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 hover:text-brand-500">
                  <span className="font-bold text-slate-900">{followers.length}</span> <span className="text-sm text-slate-600">followers</span>
                </button>
                <button onClick={() => setActiveTab('following')} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 hover:text-brand-500">
                  <span className="font-bold text-slate-900">{following.length}</span> <span className="text-sm text-slate-600">following</span>
                </button>
              </div>
              
              <div>
                <p className="font-semibold text-sm text-slate-900 mb-1">{user?.bio}</p>
                {user?.portfolioWebsite && (
                  <a href={user.portfolioWebsite} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline mb-2 block">{user.portfolioWebsite}</a>
                )}
                {user?.country && <p className="text-sm text-slate-500">{user.country}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!isEditing && (
        <>
          <div className="flex justify-center border-b border-slate-200 mt-4">
            <div className="flex gap-8">
              <button onClick={() => setActiveTab('posts')} className={`flex items-center gap-2 py-4 text-xs font-semibold uppercase tracking-wider border-t-2 ${activeTab === 'posts' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Grid size={14} /> Posts</button>
              <button onClick={() => setActiveTab('saved')} className={`flex items-center gap-2 py-4 text-xs font-semibold uppercase tracking-wider border-t-2 ${activeTab === 'saved' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Bookmark size={14} /> Saved</button>
              <button onClick={() => setActiveTab('liked')} className={`flex items-center gap-2 py-4 text-xs font-semibold uppercase tracking-wider border-t-2 ${activeTab === 'liked' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Heart size={14} /> Liked</button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'posts' && renderBlogGrid(posts)}
          {activeTab === 'saved' && renderBlogGrid(savedBlogs)}
          {activeTab === 'liked' && renderBlogGrid(likedBlogs)}
          
          {(activeTab === 'followers' || activeTab === 'following') && (
            <div className="mt-8 max-w-2xl mx-auto">
              <h2 className="text-xl font-bold mb-6">{activeTab === 'followers' ? 'Followers' : 'Following'}</h2>
              <div className="space-y-4">
                {(activeTab === 'followers' ? followers : following).map((u) => (
                  <div key={u._id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <img src={u.profileImage} alt={u.name} className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <p className="font-semibold text-slate-900">{u.name}</p>
                        <p className="text-sm text-slate-500">@{u.username || u.name.toLowerCase().replace(/\s/g, '')}</p>
                      </div>
                    </div>
                    {activeTab === 'followers' ? (
                      <button onClick={() => handleRemoveFollower(u._id)} className="px-4 py-1.5 text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg">Remove</button>
                    ) : (
                      <button onClick={() => handleUnfollow(u._id)} className="px-4 py-1.5 text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg">Unfollow</button>
                    )}
                  </div>
                ))}
                {(activeTab === 'followers' ? followers : following).length === 0 && (
                  <div className="text-center py-12 text-slate-500 border border-slate-100 rounded-xl bg-slate-50">
                    No {activeTab} yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
