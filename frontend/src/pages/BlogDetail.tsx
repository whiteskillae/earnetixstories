import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import api from '../services/api';
import DOMPurify from 'dompurify';
import { 
  Heart, Bookmark, MessageSquare, Share2, Calendar, 
  Trash2, Send, CornerDownRight, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Helmet } from 'react-helmet-async';

export const BlogDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [blog, setBlog] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Comments input
  const [commentContent, setCommentContent] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchBlogData = async () => {
      setIsLoading(true);
      try {
        const blogRes = await api.get(`/blogs/slug/${slug}`);
        const data = blogRes.data.data;
        setBlog(data);
        
        // Fetch comments
        const commentsRes = await api.get(`/blogs/${data._id}/comments`);
        setComments(commentsRes.data.data);

        if (isAuthenticated && user) {
          setIsLiked(data.isLiked || false);
          setIsSaved(data.isSaved || false);
          
          // Check following
          const followingRes = await api.get(`/users/${user._id}/following`);
          const followingList = followingRes.data.data || [];
          setIsFollowing(followingList.some((f: any) => f._id === data.author._id));
        }
      } catch (err) {
        console.error('Failed to fetch blog:', err);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogData();
  }, [slug, isAuthenticated, user, navigate]);

  const handleLike = async () => {
    if (!isAuthenticated) return navigate('/login');
    try {
      if (isLiked) {
        await api.delete(`/blogs/${blog._id}/like`);
        setBlog({ ...blog, likesCount: Math.max(0, blog.likesCount - 1) });
        setIsLiked(false);
      } else {
        await api.post(`/blogs/${blog._id}/like`);
        setBlog({ ...blog, likesCount: blog.likesCount + 1 });
        setIsLiked(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) return navigate('/login');
    try {
      if (isSaved) {
        await api.delete(`/blogs/${blog._id}/save`);
        setIsSaved(false);
      } else {
        await api.post(`/blogs/${blog._id}/save`);
        setIsSaved(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated) return navigate('/login');
    try {
      if (isFollowing) {
        await api.delete(`/users/${blog.author._id}/follow`);
        setIsFollowing(false);
      } else {
        await api.post(`/users/${blog.author._id}/follow`);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    try {
      const res = await api.post(`/blogs/${blog._id}/comments`, { content: commentContent });
      // Insert new comment at beginning of stack
      setComments([{ ...res.data.data, replies: [] }, ...comments]);
      setCommentContent('');
      setBlog({ ...blog, commentsCount: blog.commentsCount + 1 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyContent.trim()) return;
    try {
      const res = await api.post(`/blogs/${blog._id}/comments`, {
        content: replyContent,
        parentComment: commentId,
      });

      // Update local state by finding parent comment
      setComments(
        comments.map((c) => {
          if (c._id === commentId) {
            return { ...c, replies: [...(c.replies || []), res.data.data] };
          }
          return c;
        })
      );
      setReplyContent('');
      setReplyToId(null);
      setBlog({ ...blog, commentsCount: blog.commentsCount + 1 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId: string, parentId?: string) => {
    try {
      await api.delete(`/blogs/comments/${commentId}`);
      if (parentId) {
        // Reply deleted
        setComments(
          comments.map((c) => {
            if (c._id === parentId) {
              return {
                ...c,
                replies: c.replies.filter((r: any) => r._id !== commentId),
              };
            }
            return c;
          })
        );
      } else {
        // Main comment deleted
        setComments(comments.filter((c) => c._id !== commentId));
      }
      setBlog({ ...blog, commentsCount: Math.max(0, blog.commentsCount - 1) });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentLike = async (commentId: string, isReply = false, parentId?: string) => {
    if (!isAuthenticated) return navigate('/login');
    try {
      // Basic implementation: Toggles likes directly
      const commentObj = isReply
        ? comments.find((c) => c._id === parentId)?.replies.find((r: any) => r._id === commentId)
        : comments.find((c) => c._id === commentId);

      const hasLiked = commentObj?.likes.includes(user?._id);

      if (hasLiked) {
        await api.delete(`/blogs/comments/${commentId}/like`);
        // update local likes
        updateCommentLikesLocal(commentId, hasLiked, isReply, parentId);
      } else {
        await api.post(`/blogs/comments/${commentId}/like`);
        updateCommentLikesLocal(commentId, hasLiked, isReply, parentId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateCommentLikesLocal = (commentId: string, hasLiked: boolean, isReply: boolean, parentId?: string) => {
    if (isReply && parentId) {
      setComments(
        comments.map((c) => {
          if (c._id === parentId) {
            return {
              ...c,
              replies: c.replies.map((r: any) => {
                if (r._id === commentId) {
                  const newLikes = hasLiked
                    ? r.likes.filter((id: string) => id !== user?._id)
                    : [...r.likes, user?._id];
                  return { ...r, likes: newLikes };
                }
                return r;
              }),
            };
          }
          return c;
        })
      );
    } else {
      setComments(
        comments.map((c) => {
          if (c._id === commentId) {
            const newLikes = hasLiked
              ? c.likes.filter((id: string) => id !== user?._id)
              : [...c.likes, user?._id];
            return { ...c, likes: newLikes };
          }
          return c;
        })
      );
    }
  };

  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-8">
        <Skeleton width={120} height={24} borderRadius="1rem" />
        <Skeleton height={48} />
        <div className="flex gap-4 items-center">
          <Skeleton circle width={48} height={48} />
          <div className="space-y-2">
            <Skeleton width={100} height={16} />
            <Skeleton width={150} height={12} />
          </div>
        </div>
        <Skeleton height={384} borderRadius="1rem" />
        <Skeleton count={10} />
      </div>
    );
  }

  if (!blog) return null;

  const sanitizedContent = DOMPurify.sanitize(blog.content, { ADD_ATTR: ['class', 'draggable'] });
  const formattedDate = new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-3xl mx-auto py-4"
    >
      <Helmet>
        <title>{blog.title} | Earnetix Blogs</title>
        <meta name="description" content={blog.content.replace(/<[^>]+>/g, '').substring(0, 160) + '...'} />
      </Helmet>

      {/* Blog category and dates */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          to={`/search?category=${blog.category.slug}`}
          className="text-xs font-bold text-brand-500 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-wider"
        >
          {blog.category.name}
        </Link>
        <span className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
          <Calendar className="h-3.5 w-3.5" />
          {formattedDate}
        </span>
      </div>

      <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
        {blog.title}
      </h1>

      {/* Author Card Info */}
      <div className="flex items-center justify-between border-y border-slate-200/80 py-4 mb-8">
        <div className="flex items-center gap-3">
          <img
            src={blog.author.profileImage}
            alt={blog.author.name}
            className="h-12 w-12 rounded-full object-cover border border-slate-100"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm sm:text-base">{blog.author.name}</span>
              {isAuthenticated && user?._id !== blog.author._id && (
                <button
                  onClick={handleFollow}
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                    isFollowing
                      ? 'border-slate-300 text-slate-500 hover:bg-slate-50'
                      : 'border-brand-500 text-brand-500 hover:bg-brand-50'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 line-clamp-1 max-w-[250px] sm:max-w-none">
              {blog.author.bio || 'Author has no bio yet.'}
            </p>
          </div>
        </div>

        {/* Actions header toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            className={`rounded-full p-2.5 border transition-colors ${
              isLiked
                ? 'bg-rose-50 border-rose-100 text-rose-500'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleSave}
            className={`rounded-full p-2.5 border transition-colors ${
              isSaved
                ? 'bg-brand-50 border-brand-100 text-brand-500'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="rounded-full p-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Cover image */}
      <div className="w-full overflow-hidden rounded-2xl bg-slate-100 mb-8 border border-slate-100 max-h-[400px]">
        <img
          src={blog.coverImage}
          alt={blog.title}
          className="w-full h-full object-cover max-h-[400px]"
        />
      </div>

      {/* Main Content Area */}
      <article
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        className="content prose max-w-none mb-12"
      />

      {/* Tags Block */}
      {blog.tags && blog.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10 pb-8 border-b border-slate-200">
          {blog.tags.map((tag: string) => (
            <Link
              key={tag}
              to={`/search?q=${encodeURIComponent(tag)}`}
              className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Comments Section */}
      <div className="mt-12 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <MessageSquare className="h-5 w-5 text-brand-500" />
          <h2 className="font-display font-extrabold text-xl text-slate-800">
            Comments ({blog.commentsCount})
          </h2>
        </div>

        {/* Comment creator */}
        {isAuthenticated ? (
          <form onSubmit={handleAddComment} className="flex gap-4 items-start bg-white p-4 border border-slate-100 rounded-2xl">
            <img
              src={user?.profileImage}
              alt={user?.name}
              className="h-10 w-10 rounded-full object-cover border shrink-0"
            />
            <div className="flex-1 space-y-3">
              <textarea
                placeholder="Share your thoughts on this story..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                className="w-full border border-slate-100 rounded-xl p-3 text-sm placeholder-slate-400 focus:border-brand-500 outline-none min-h-[90px] resize-y"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-600 shadow-md shadow-brand-500/10"
                >
                  Post Comment
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
            <p className="text-slate-600 text-sm font-medium">
              Want to join the discussion?{' '}
              <Link to="/login" className="text-brand-500 font-bold hover:underline">
                Log in
              </Link>{' '}
              to leave a comment.
            </p>
          </div>
        )}

        {/* Comments tree display */}
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment._id} className="space-y-4">
              {/* Parent Comment */}
              <div className="flex gap-4 items-start group">
                <img
                  src={comment.author.profileImage}
                  alt={comment.author.name}
                  className="h-10 w-10 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 bg-white border border-slate-100 p-4 rounded-2xl relative">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold text-slate-800 text-sm">{comment.author.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium ml-2">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Delete actions */}
                    {(user?._id === comment.author._id || user?.role === 'admin' || user?._id === blog.author._id) && (
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{comment.content}</p>

                  <div className="flex items-center gap-4 mt-3 border-t border-slate-50 pt-2 text-xs">
                    <button
                      onClick={() => handleCommentLike(comment._id)}
                      className={`flex items-center gap-1 font-semibold ${
                        comment.likes.includes(user?._id) ? 'text-brand-500' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Heart className="h-3.5 w-3.5" />
                      Like ({comment.likes.length})
                    </button>
                    {isAuthenticated && (
                      <button
                        onClick={() => setReplyToId(replyToId === comment._id ? null : comment._id)}
                        className="text-slate-400 font-semibold hover:text-slate-600"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies Container */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-12 space-y-4">
                  {comment.replies.map((reply: any) => (
                    <div key={reply._id} className="flex gap-3 items-start group">
                      <CornerDownRight className="h-4 w-4 text-slate-300 shrink-0 mt-2" />
                      <img
                        src={reply.author.profileImage}
                        alt={reply.author.name}
                        className="h-8 w-8 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 bg-white border border-slate-100 p-3.5 rounded-2xl relative">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="font-semibold text-slate-800 text-xs">{reply.author.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium ml-2">
                              {new Date(reply.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {(user?._id === reply.author._id || user?.role === 'admin' || user?._id === blog.author._id) && (
                            <button
                              onClick={() => handleDeleteComment(reply._id, comment._id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-500 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">{reply.content}</p>

                        <div className="flex items-center gap-4 mt-2.5 border-t border-slate-50 pt-1.5 text-[10px]">
                          <button
                            onClick={() => handleCommentLike(reply._id, true, comment._id)}
                            className={`flex items-center gap-1 font-semibold ${
                              reply.likes.includes(user?._id) ? 'text-brand-500' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            <Heart className="h-3 w-3" />
                            Like ({reply.likes.length})
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              <AnimatePresence>
                {replyToId === comment._id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-12"
                  >
                    <div className="flex gap-3 bg-white p-3 border border-slate-100 rounded-2xl">
                      <input
                        type="text"
                        placeholder={`Reply to ${comment.author.name}...`}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="flex-1 bg-slate-50 rounded-xl px-4 py-2 text-sm outline-none focus:bg-slate-100 transition-colors"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddReply(comment._id)}
                        className="bg-brand-500 text-white rounded-xl p-2 hover:bg-brand-600 transition-colors shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Share Link Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          >
            <div className="fixed inset-0" onClick={() => setShowShareModal(false)} />
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm border border-slate-100 z-10"
            >
              <h3 className="font-display font-extrabold text-lg text-slate-900 mb-4">Share this story</h3>
              
              <div className="flex gap-2 items-center bg-slate-50 border border-slate-150 p-2 rounded-xl mb-4">
                <input
                  type="text"
                  readOnly
                  value={window.location.href}
                  className="bg-transparent text-xs text-slate-500 outline-none flex-1 truncate px-2 select-all"
                />
                <button
                  onClick={copyLinkToClipboard}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    copySuccess
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {copySuccess ? <Check className="h-3 w-3" /> : null}
                  {copySuccess ? 'Copied' : 'Copy'}
                </button>
              </div>

              <button
                onClick={() => setShowShareModal(false)}
                className="w-full bg-slate-100 text-slate-700 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Close Dialog
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
