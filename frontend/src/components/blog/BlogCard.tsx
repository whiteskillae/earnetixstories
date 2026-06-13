import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, MessageSquare, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface Author {
  _id: string;
  name: string;
  profileImage: string;
}

interface Category {
  name: string;
  slug: string;
}

interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  publishedAt?: string;
  createdAt: string;
  author: Author;
  category: Category;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
}

interface BlogCardProps {
  blog: Blog;
  layout?: 'grid' | 'list';
}

import { useAuth } from '../../store/AuthContext';
import api from '../../services/api';
import { Share2, Repeat2, Bookmark } from 'lucide-react';
import { CommentDrawer } from './CommentDrawer';

// ... (in component)
export const BlogCard: React.FC<BlogCardProps> = ({ blog, layout = 'grid' }) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [isLiked, setIsLiked] = React.useState((blog as any).isLiked || false);
  const [isSaved, setIsSaved] = React.useState((blog as any).isSaved || false);
  const [likesCount, setLikesCount] = React.useState(blog.likesCount);
  const [commentsCount, setCommentsCount] = React.useState(blog.commentsCount);
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = React.useState(false);

  const formattedDate = new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return alert('Please login to follow.');
    try {
      if (isFollowing) {
        await api.delete(`/users/${blog.author._id}/follow`);
        setIsFollowing(false);
      } else {
        await api.post(`/users/${blog.author._id}/follow`);
        setIsFollowing(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return alert('Please login to like.');
    try {
      if (isLiked) {
        await api.delete(`/blogs/${blog._id}/like`);
        setIsLiked(false);
        setLikesCount(c => Math.max(0, c - 1));
      } else {
        await api.post(`/blogs/${blog._id}/like`);
        setIsLiked(true);
        setLikesCount(c => c + 1);
      }
    } catch (e) { console.error(e); }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return alert('Please login to save stories.');
    try {
      if (isSaved) {
        await api.delete(`/blogs/${blog._id}/save`);
        setIsSaved(false);
      } else {
        await api.post(`/blogs/${blog._id}/save`);
        setIsSaved(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}/blog/${blog.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: blog.title, text: blog.excerpt, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Story link copied.');
      }
    } catch (e) { console.error(e); }
  };

  if (layout === 'list') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className="flex flex-col bg-white/70 backdrop-blur-md border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden mb-8"
      >
        {/* Instagram style Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <img
              src={blog.author.profileImage}
              alt={blog.author.name}
              loading="lazy"
              className="h-10 w-10 rounded-full object-cover border border-slate-100"
            />
            <div>
              <span className="text-sm font-bold text-slate-800">
                {blog.author.name}
              </span>
              <p className="text-[10px] text-slate-400 font-medium">{formattedDate}</p>
            </div>
          </div>
          {user?._id !== blog.author._id && (
            <button
              onClick={handleFollow}
              className={`text-xs font-bold px-4 py-1.5 rounded-full transition-colors ${
                isFollowing 
                  ? 'bg-slate-100 text-slate-600' 
                  : 'bg-brand-500 text-white hover:bg-brand-600'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* Big Cover Image */}
        <Link to={`/blog/${blog.slug}`} className="block w-full aspect-video sm:aspect-[4/3] bg-slate-100 relative">
          <img
            src={blog.coverImage}
            alt={blog.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </Link>

        {/* Action Bar */}
        <div className="px-4 pt-4 flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-4">
            <button onClick={handleLike} className={`hover:text-brand-500 transition-colors ${isLiked ? 'text-brand-500' : ''}`}>
              <Heart className={`h-6 w-6 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button onClick={() => setIsCommentDrawerOpen(true)} className="hover:text-brand-500 transition-colors">
              <MessageSquare className="h-6 w-6" />
            </button>
            <button onClick={handleShare} className="hover:text-brand-500 transition-colors">
              <Share2 className="h-6 w-6" />
            </button>
          </div>
          <div>
            <button onClick={handleSave} className={`hover:text-brand-500 transition-colors ${isSaved ? 'text-brand-500' : ''}`}>
              <Bookmark className={`h-6 w-6 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Likes Count */}
        <div className="px-4 pt-2">
          <span className="text-sm font-bold text-slate-800">{likesCount} likes</span>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 pt-1">
          <Link to={`/blog/${blog.slug}`} className="group">
            <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-500 transition-colors line-clamp-1">
              {blog.title}
            </h3>
          </Link>
          <p className="text-sm text-slate-600 mt-1 line-clamp-2 leading-relaxed">
            <span className="font-bold text-slate-800 mr-2">{blog.author.name}</span>
            {blog.excerpt}
          </p>
          {blog.commentsCount > 0 && (
            <Link to={`/blog/${blog.slug}#comments`} className="text-sm text-slate-400 mt-1 block hover:text-slate-600">
              View all {blog.commentsCount} comments
            </Link>
          )}
        </div>
        <CommentDrawer
          isOpen={isCommentDrawerOpen}
          onClose={() => setIsCommentDrawerOpen(false)}
          blogId={blog._id}
          onCommentAdded={() => setCommentsCount(c => c + 1)}
        />
      </motion.div>
    );
  }

  // Grid Layout
  return (
    <motion.article
      whileHover={{ y: -6 }}
      className="flex flex-col bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <Link to={`/blog/${blog.slug}`} className="block aspect-[16/9] w-full overflow-hidden bg-slate-100 relative">
        <img
          src={blog.coverImage}
          alt={blog.title}
          loading="lazy"
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4">
          <Link
            to={`/search?category=${blog.category.slug}`}
            className="text-[10px] font-bold text-brand-500 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm"
          >
            {blog.category.name}
          </Link>
        </div>
      </Link>

      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-3">
            <Calendar className="h-3 w-3" />
            {formattedDate}
          </span>
          <Link to={`/blog/${blog.slug}`} className="block group">
            <h3 className="text-lg font-display font-bold text-slate-900 group-hover:text-brand-500 transition-colors line-clamp-2 leading-snug">
              {blog.title}
            </h3>
          </Link>
          <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {blog.excerpt}
          </p>
        </div>

        <div className="flex items-center justify-between mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <img
              src={blog.author.profileImage}
              alt={blog.author.name}
              loading="lazy"
              className="h-6 w-6 rounded-full object-cover"
            />
            <span className="text-xs font-semibold text-slate-600 line-clamp-1">{blog.author.name}</span>
          </div>

          <div className="flex items-center gap-3.5 text-slate-400">
            <span className="flex items-center gap-1 text-xs font-medium">
              <Eye className="h-3.5 w-3.5" />
              {blog.viewsCount}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium">
              <Heart className="h-3.5 w-3.5" />
              {likesCount}
            </span>
            <button onClick={() => setIsCommentDrawerOpen(true)} className="flex items-center gap-1 text-xs font-medium hover:text-brand-500 transition">
              <MessageSquare className="h-3.5 w-3.5" />
              {commentsCount}
            </button>
          </div>
        </div>
      </div>
      <CommentDrawer
        isOpen={isCommentDrawerOpen}
        onClose={() => setIsCommentDrawerOpen(false)}
        blogId={blog._id}
        onCommentAdded={() => setCommentsCount(c => c + 1)}
      />
    </motion.article>
  );
};
