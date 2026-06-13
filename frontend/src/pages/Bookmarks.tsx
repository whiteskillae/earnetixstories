import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BlogCard } from '../components/blog/BlogCard';
import { Bookmark } from 'lucide-react';

export const Bookmarks: React.FC = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSavedBlogs = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/users/profile');
        setBlogs((res.data.data.savedBlogs || []).filter((blog: any) => typeof blog === 'object' && blog !== null));
      } catch (err) {
        console.error('Failed to load saved blogs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedBlogs();
  }, []);

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Bookmark className="h-7 w-7 text-brand-500" />
        <div>
          <h1 className="font-display text-3xl font-black text-slate-900 tracking-tight">Your Reading List</h1>
          <p className="text-sm text-slate-500 mt-1">Stories you saved to read later.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((n) => (
            <div key={n} className="animate-pulse bg-white border p-5 rounded-2xl h-48" />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl">
          <Bookmark className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Your reading list is empty</h3>
          <p className="text-sm text-slate-500 mt-1">
            Tap the bookmark icon on any story to save it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {blogs.map((blog: any) => (
            <BlogCard key={blog._id} blog={blog} />
          ))}
        </div>
      )}
    </div>
  );
};
