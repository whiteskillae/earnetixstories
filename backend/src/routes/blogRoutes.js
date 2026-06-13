const express = require('express');
const router = express.Router();
const apicache = require('apicache');
const cache = apicache.middleware;
const {
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogs,
  getBlogBySlug,
  likeBlog,
  unlikeBlog,
  saveBlog,
  unsaveBlog,
  getTrendingBlogs,
  getRecommendedBlogs,
  getFollowingFeed,
  uploadInlineImage,
  getUserBlogs,
} = require('../controllers/blogController');
const {
  getBlogComments,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
} = require('../controllers/commentController');
const { protect, optionalAuth } = require('../middlewares/auth');
const { uploadOptions } = require('../config/cloudinary');
const { postLimiter, commentLimiter } = require('../middlewares/rateLimiters');

// Feeds and discovery
router.get('/trending', cache('5 minutes'), getTrendingBlogs);
router.get('/recommended', cache('5 minutes'), getRecommendedBlogs);
router.get('/feed', protect, getFollowingFeed);

// User specific blogs
router.get('/user/:userId', optionalAuth, getUserBlogs);

// Inline editor uploads
router.post('/upload-inline', protect, uploadOptions.single('image'), uploadInlineImage);

// Core blog CRUD
router.route('/')
  .get(getBlogs)
  .post(protect, postLimiter, uploadOptions.single('coverImage'), createBlog);

router.route('/:id')
  .put(protect, uploadOptions.single('coverImage'), updateBlog)
  .delete(protect, deleteBlog);

// Get by slug
router.get('/slug/:slug', optionalAuth, getBlogBySlug);

// Likes and bookmarks
router.route('/:id/like')
  .post(protect, likeBlog)
  .delete(protect, unlikeBlog);

router.route('/:id/save')
  .post(protect, saveBlog)
  .delete(protect, unsaveBlog);

// Comments core
router.route('/:id/comments')
  .get(getBlogComments)
  .post(protect, commentLimiter, createComment);

// Nested Comment Actions
router.put('/comments/:id', protect, updateComment);
router.delete('/comments/:id', protect, deleteComment);
router.route('/comments/:id/like')
  .post(protect, likeComment)
  .delete(protect, unlikeComment);

module.exports = router;
