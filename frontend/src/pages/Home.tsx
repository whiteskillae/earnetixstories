import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { BlogCard } from '../components/blog/BlogCard';
import { useAuth } from '../store/AuthContext';
import { TrendingUp, Sparkles, Clock, Users, BookOpen, PenSquare, Search as SearchIcon } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

export const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'recommended' | 'latest' | 'following' | 'trending'>('recommended');
  const [blogs, setBlogs] = useState<any[]>([]);
  const [trendingBlogs, setTrendingBlogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        const trendingRes = await api.get('/blogs/trending');
        setTrendingBlogs(trendingRes.data.data);

        const categoriesRes = await api.get('/categories');
        setCategories(categoriesRes.data.data.slice(0, 8)); // Top 8
      } catch (err) {
        console.error('Failed to fetch sidebar widgets:', err);
      }
    };

    fetchSidebarData();
  }, []);

  useEffect(() => {
    const fetchFeed = async () => {
      setIsLoading(true);
      try {
        let endpoint = '/blogs';
        if (activeTab === 'recommended') {
          endpoint = '/blogs/recommended';
        } else if (activeTab === 'trending') {
          endpoint = '/blogs/trending';
        } else if (activeTab === 'following') {
          endpoint = '/blogs/feed';
        }

        const res = await api.get(endpoint);
        setBlogs(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch feed:', err);
        setBlogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();
  }, [activeTab]);

  const tabs = [
    { id: 'recommended', label: 'For You', icon: Sparkles },
    { id: 'latest', label: 'Latest', icon: Clock },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    ...(isAuthenticated ? [{ id: 'following', label: 'Following', icon: Users }] : []),
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <Helmet>
        <title>Earnetix Blogs | Premium Publishing Platform</title>
        <meta name="description" content="Read, write, save, and discuss stories without the clutter on Earnetix Blogs." />
      </Helmet>
      
      <section className="overflow-hidden rounded-lg border border-white/70 bg-white/80 shadow-sm shadow-slate-200/70 backdrop-blur-xl">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-brand-600">
              <Sparkles className="h-3.5 w-3.5" />
              Fresh stories, clean reading
            </div>
            <h1 className="max-w-3xl font-display text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Read, write, save, and discuss stories without the clutter.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Discover trending articles, follow writers, bookmark useful posts, and publish from a fast editor that works neatly on mobile.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to={isAuthenticated ? '/write' : '/register'} className="app-button-primary">
                <PenSquare className="h-4 w-4" />
                {isAuthenticated ? 'Write a Story' : 'Start Writing'}
              </Link>
              <Link to="/search" className="app-button-soft">
                <SearchIcon className="h-4 w-4" />
                Explore Stories
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Stories', value: blogs.length || trendingBlogs.length, icon: BookOpen },
              { label: 'Trending', value: trendingBlogs.length, icon: TrendingUp },
              { label: 'Topics', value: categories.length, icon: Sparkles },
              { label: 'Feed Mode', value: activeTab === 'recommended' ? 'For You' : tabs.find((tab) => tab.id === activeTab)?.label, icon: Clock },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <item.icon className="mb-3 h-5 w-5 text-brand-500" />
                <p className="font-display text-2xl font-black text-slate-900">{item.value}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Feed Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-display text-sm font-semibold whitespace-nowrap outline-none transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-500 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feed List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-100 p-5 rounded-2xl flex flex-col sm:flex-row gap-5">
                <div className="w-full sm:w-48 h-36 shrink-0">
                  <Skeleton height="100%" borderRadius="0.75rem" />
                </div>
                <div className="flex-1 space-y-3 py-1">
                  <Skeleton width={100} height={16} borderRadius="1rem" />
                  <Skeleton count={2} height={20} />
                  <Skeleton width="50%" height={16} />
                </div>
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">No stories found</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              {activeTab === 'following'
                ? "You aren't following anyone yet, or they haven't posted. Check trending stories instead!"
                : "We couldn't find any stories matching your preferences."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {blogs.map((blog) => (
              <BlogCard key={blog._id} blog={blog} layout="list" />
            ))}
          </div>
        )}
      </div>

      {/* Right Widgets Column */}
      <div className="space-y-8 lg:sticky lg:top-24 h-fit">
        {/* Trending Stories list */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <TrendingUp className="h-5 w-5 text-brand-500" />
            <h2 className="text-md font-display font-extrabold text-slate-800 uppercase tracking-wider">
              Trending on Earnetix Blogs
            </h2>
          </div>

          <div className="space-y-4">
            {trendingBlogs.slice(0, 5).map((blog, idx) => (
              <div key={blog._id} className="flex gap-4 items-start group">
                <span className="font-display font-black text-3xl text-slate-100 group-hover:text-brand-200 transition-colors w-8 text-right shrink-0">
                  {`0${idx + 1}`}
                </span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={blog.author.profileImage}
                      alt={blog.author.name}
                      loading="lazy"
                      className="h-4 w-4 rounded-full object-cover"
                    />
                    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">
                      {blog.author.name}
                    </span>
                  </div>
                  <Link
                    to={`/blog/${blog.slug}`}
                    className="font-display font-bold text-sm text-slate-900 hover:text-brand-500 transition-colors line-clamp-2 leading-snug"
                  >
                    {blog.title}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories tag cloud */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-md font-display font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">
            Recommended Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/search?category=${cat.slug}`}
                className="text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 px-3.5 py-1.5 rounded-full transition-colors border border-slate-100"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
      </div>
    </motion.div>
  );
};
