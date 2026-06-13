import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, CornerDownRight } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import api from '../../services/api';

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  blogId: string;
  onCommentAdded: () => void;
}

export const CommentDrawer: React.FC<CommentDrawerProps> = ({ isOpen, onClose, blogId, onCommentAdded }) => {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Reply State
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, blogId]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/blogs/${blogId}/comments`);
      setComments(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !isAuthenticated) return;
    
    // Optimistic insert
    const tempId = Date.now().toString();
    const optimisticComment = {
      _id: tempId,
      content: commentContent,
      author: {
        _id: user?._id,
        name: user?.name,
        profileImage: user?.profileImage
      },
      createdAt: new Date().toISOString(),
      replies: [],
      likesCount: 0
    };
    
    setComments([optimisticComment, ...comments]);
    setCommentContent('');
    onCommentAdded(); // Increment parent counter

    try {
      const res = await api.post(`/blogs/${blogId}/comments`, { content: optimisticComment.content });
      // Replace optimistic with real
      setComments(prev => prev.map(c => c._id === tempId ? { ...res.data.data, replies: [] } : c));
    } catch (err) {
      console.error(err);
      // Revert if failed
      setComments(prev => prev.filter(c => c._id !== tempId));
    }
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyContent.trim() || !isAuthenticated) return;

    try {
      const res = await api.post(`/blogs/${blogId}/comments`, {
        content: replyContent,
        parentComment: commentId,
      });

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
      onCommentAdded(); // Increment parent counter
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl h-[80vh] flex flex-col md:w-[600px] md:mx-auto md:bottom-4 md:rounded-3xl md:h-[600px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-display font-bold text-lg text-slate-900">Comments</h3>
              <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {isLoading ? (
                <p className="text-center text-slate-400 text-sm py-10">Loading comments...</p>
              ) : comments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-500 text-sm">No comments yet. Be the first to start the discussion!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id} className="space-y-3">
                    <div className="flex gap-3">
                      <img src={comment.author.profileImage} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                      <div className="flex-1 bg-slate-50 p-3 rounded-2xl rounded-tl-none">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-800">{comment.author.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                    
                    {/* Reply Action */}
                    <div className="ml-11">
                      <button 
                        onClick={() => setReplyToId(replyToId === comment._id ? null : comment._id)}
                        className="text-xs font-bold text-slate-500 hover:text-brand-500 flex items-center gap-1 transition"
                      >
                        <CornerDownRight className="h-3 w-3" />
                        Reply
                      </button>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-11 space-y-3 mt-3 border-l-2 border-slate-100 pl-4">
                        {comment.replies.map((reply: any) => (
                          <div key={reply._id} className="flex gap-3">
                            <img src={reply.author.profileImage} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                            <div className="flex-1 bg-slate-50/50 p-2.5 rounded-xl rounded-tl-none">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs text-slate-800">{reply.author.name}</span>
                              </div>
                              <p className="text-sm text-slate-600 whitespace-pre-wrap">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Input */}
                    {replyToId === comment._id && isAuthenticated && (
                      <div className="ml-11 mt-2 flex gap-2">
                        <input
                          type="text"
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 text-sm bg-slate-100 border-none rounded-full px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddReply(comment._id);
                          }}
                        />
                        <button
                          onClick={() => handleAddReply(comment._id)}
                          disabled={!replyContent.trim()}
                          className="p-2 bg-brand-500 text-white rounded-full disabled:opacity-50 hover:bg-brand-600 transition"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Main Input Area */}
            {isAuthenticated ? (
              <form onSubmit={handleAddComment} className="p-4 border-t border-slate-100 bg-white md:rounded-b-3xl pb-8 md:pb-4">
                <div className="flex items-center gap-3">
                  <img src={user?.profileImage} alt="" className="h-10 w-10 rounded-full object-cover shrink-0 border border-slate-100" />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full bg-slate-100 border-transparent rounded-full pl-5 pr-12 py-3 text-sm focus:border-brand-500 focus:ring-brand-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!commentContent.trim()}
                      className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center bg-brand-500 text-white rounded-full disabled:opacity-50 hover:bg-brand-600 transition"
                    >
                      <Send className="h-4 w-4 ml-0.5" />
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-center md:rounded-b-3xl pb-8 md:pb-4">
                <p className="text-sm text-slate-600 font-medium">Log in to join the conversation.</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
