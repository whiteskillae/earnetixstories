const Blog = require('../models/Blog');
const Category = require('../models/Category');
const Like = require('../models/Like');
const Follow = require('../models/Follow');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Comment = require('../models/Comment');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const sanitizeHtml = require('sanitize-html');

const sanitizeConfig = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'u', 's', 'span']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    'img': ['src', 'alt', 'width', 'height', 'class'], // Removed draggable for safety
    'span': ['style'],
    'p': ['style'],
    'a': ['href', 'name', 'target', 'rel']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false, // Prevent SSRF / protocol manipulation
  allowedClasses: { '*': ['*'] },
  // Enforce secure target blanket
  transformTags: {
    'a': sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
  }
};

// @desc    Create a blog post
// @route   POST /api/blogs
// @access  Private
const createBlog = async (req, res, next) => {
  try {
    let { title, content, excerpt, tags, category, status, scheduledAt, seo } = req.body;

    if (!req.file && !req.body.coverImage) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide a cover image', code: 'COVER_IMAGE_REQUIRED' },
      });
    }

    // Handle parsed inputs if sent from multipart form
    if (tags && typeof tags === 'string') {
      try { tags = JSON.parse(tags); } catch (e) { tags = tags.split(',').map(t => t.trim()); }
    }
    if (seo && typeof seo === 'string') {
      try { seo = JSON.parse(seo); } catch (e) { seo = {}; }
    }

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        error: { message: 'Category not found', code: 'CATEGORY_NOT_FOUND' },
      });
    }

    let coverImageUrl = req.body.coverImage;
    let coverImageId = '';

    if (req.file) {
      const result = await uploadImage(req.file.buffer, req.file.originalname, 'blogs');
      coverImageUrl = result.url;
      coverImageId = result.publicId;
    }

    let finalStatus = status || 'draft';
    
    // Enforcement: non-admins cannot directly publish. It goes to pending_review.
    if (req.user.role !== 'admin' && (finalStatus === 'published' || finalStatus === 'scheduled')) {
      finalStatus = 'pending_review';
    }

    // Safely handle missing strings
    const safeContent = content || '';
    const safeTitle = title || '';
    const safeExcerpt = excerpt || '';

    const words = safeContent.replace(/<[^>]*>?/gm, '').split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(words / 200));

    const blogData = {
      title: sanitizeHtml(safeTitle, { allowedTags: [] }),
      content: sanitizeHtml(safeContent, sanitizeConfig),
      excerpt: sanitizeHtml(safeExcerpt, { allowedTags: [] }),
      author: req.user.id,
      coverImage: coverImageUrl,
      tags,
      category,
      status: finalStatus,
      seo,
      readingTime,
    };

    if (finalStatus === 'scheduled') {
      if (!scheduledAt) {
        return res.status(400).json({
          success: false,
          error: { message: 'scheduledAt is required for scheduled blogs', code: 'SCHEDULE_TIME_REQUIRED' },
        });
      }
      blogData.scheduledAt = new Date(scheduledAt);
    } else if (finalStatus === 'published') {
      blogData.publishedAt = Date.now();
    }

    const blog = await Blog.create(blogData);
    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a blog post
// @route   PUT /api/blogs/:id
// @access  Private
const updateBlog = async (req, res, next) => {
  try {
    let blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blog post not found', code: 'BLOG_NOT_FOUND' },
      });
    }

    // Allow author or admin to update
    if (blog.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized to update this blog post', code: 'UNAUTHORIZED' },
      });
    }

    // 24-hour edit restriction for regular users
    if (req.user.role !== 'admin') {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (blog.createdAt < twentyFourHoursAgo) {
        return res.status(403).json({
          success: false,
          error: { message: 'Posts older than 24 hours can no longer be edited, only deleted.', code: 'EDIT_TIME_EXPIRED' },
        });
      }
    }

    let { title, content, excerpt, tags, category, status, scheduledAt, seo, isFeatured } = req.body;

    // Handle parsed inputs if sent from multipart form
    if (tags && typeof tags === 'string') {
      try { tags = JSON.parse(tags); } catch (e) { tags = tags.split(',').map(t => t.trim()); }
    }
    if (seo && typeof seo === 'string') {
      try { seo = JSON.parse(seo); } catch (e) { seo = {}; }
    }
    const fieldsToUpdate = {};
    if (title !== undefined) fieldsToUpdate.title = sanitizeHtml(title || '', { allowedTags: [] });
    if (content !== undefined) {
      const safeContent = content || '';
      fieldsToUpdate.content = sanitizeHtml(safeContent, sanitizeConfig);
      const words = safeContent.replace(/<[^>]*>?/gm, '').split(/\s+/).length;
      fieldsToUpdate.readingTime = Math.max(1, Math.ceil(words / 200));
    }
    if (excerpt !== undefined) fieldsToUpdate.excerpt = sanitizeHtml(excerpt || '', { allowedTags: [] });
    if (tags) fieldsToUpdate.tags = tags;
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          error: { message: 'Category not found', code: 'CATEGORY_NOT_FOUND' },
        });
      }
      fieldsToUpdate.category = category;
    }
    if (seo) fieldsToUpdate.seo = seo;
    if (isFeatured !== undefined && req.user.role === 'admin') {
      fieldsToUpdate.isFeatured = isFeatured;
    }

    if (status) {
      let finalStatus = status;
      // Enforcement: non-admins cannot directly publish. It goes to pending_review.
      if (req.user.role !== 'admin' && (finalStatus === 'published' || finalStatus === 'scheduled')) {
        finalStatus = 'pending_review';
      }

      fieldsToUpdate.status = finalStatus;
      
      if (finalStatus === 'published' && blog.status !== 'published') {
        fieldsToUpdate.publishedAt = Date.now();
        fieldsToUpdate.scheduledAt = null;
      } else if (finalStatus === 'scheduled') {
        if (!scheduledAt) {
          return res.status(400).json({
            success: false,
            error: { message: 'scheduledAt is required for scheduling', code: 'SCHEDULE_TIME_REQUIRED' },
          });
        }
        fieldsToUpdate.scheduledAt = new Date(scheduledAt);
        fieldsToUpdate.publishedAt = null;
      } else if (finalStatus === 'draft' || finalStatus === 'pending_review' || finalStatus === 'rejected') {
        fieldsToUpdate.publishedAt = null;
        fieldsToUpdate.scheduledAt = null;
      }
    }

    // Handle cover image replacement
    if (req.file) {
      // Delete old cover image from Cloudinary or local
      if (blog.coverImage) {
        let oldPublicId = '';
        if (blog.coverImage.includes('/uploads/')) {
          oldPublicId = blog.coverImage.split('/uploads/')[1];
        } else {
          const urlParts = blog.coverImage.split('/upload/');
          if (urlParts.length > 1) {
            const pathWithVer = urlParts[1].substring(urlParts[1].indexOf('/') + 1);
            oldPublicId = pathWithVer.substring(0, pathWithVer.lastIndexOf('.'));
          }
        }
        if (oldPublicId) {
          await deleteImage(oldPublicId);
        }
      }

      // Upload new
      const result = await uploadImage(req.file.buffer, req.file.originalname, 'blogs');
      fieldsToUpdate.coverImage = result.url;
    } else if (req.body.coverImage) {
      fieldsToUpdate.coverImage = req.body.coverImage;
    }

    blog = await Blog.findByIdAndUpdate(req.params.id, { $set: fieldsToUpdate }, { new: true, runValidators: true });

    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a blog post
// @route   DELETE /api/blogs/:id
// @access  Private
const deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blog post not found', code: 'BLOG_NOT_FOUND' },
      });
    }

    // Check auth
    if (blog.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized to delete this blog post', code: 'UNAUTHORIZED' },
      });
    }

    // Soft delete: keep the images and comments intact for recovery if needed.
    blog.isDeleted = true;
    blog.deletedAt = Date.now();
    await blog.save();

    res.status(200).json({ success: true, message: 'Blog moved to trash (soft deleted)' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all blog posts (with search and paging)
// @route   GET /api/blogs
// @access  Public
const getBlogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, category, tag, author, status = 'published' } = req.query;

    const query = { isDeleted: { $ne: true } };

    // Standard public restriction (only show published posts)
    // Authors can request their own drafts/scheduled posts
    if (status !== 'published') {
      if (!req.user || author !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: { message: 'Not authorized to view drafts or scheduled posts', code: 'UNAUTHORIZED_VIEW' },
        });
      }
      query.status = status;
    } else {
      query.status = 'published';
    }

    if (category) {
      // Can be slug or ID
      const cat = await Category.findOne({ $or: [{ _id: category.match(/^[0-9a-fA-F]{24}$/) ? category : null }, { slug: category }] });
      if (cat) query.category = cat._id;
    }

    if (tag) {
      query.tags = tag;
    }

    if (author) {
      query.author = author;
    }

    // Optimized Text search filter utilizing MongoDB $text index
    if (search) {
      query.$text = { $search: search };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Blog.countDocuments(query);
    const blogs = await Blog.find(query)
      .populate('author', 'name profileImage bio')
      .populate('category', 'name slug icon')
      .sort('-publishedAt -createdAt')
      .skip(skip)
      .limit(limitNum);

    let blogsResponse = blogs.map(b => b.toObject());
    
    if (req.user) {
      const Like = require('../models/Like');
      const userLikes = await Like.find({ user: req.user.id }).select('blog');
      const likedBlogIds = userLikes.map(l => l.blog.toString());
      const userObj = await User.findById(req.user.id).select('savedBlogs');
      const savedBlogIds = userObj ? userObj.savedBlogs.map(id => id.toString()) : [];
      
      blogsResponse = blogsResponse.map(blog => ({
        ...blog,
        isLiked: likedBlogIds.includes(blog._id.toString()),
        isSaved: savedBlogIds.includes(blog._id.toString())
      }));
    }

    res.status(200).json({
      success: true,
      count: blogsResponse.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      data: blogsResponse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get blog post by slug
// @route   GET /api/blogs/:slug
// @access  Public
const getBlogBySlug = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, isDeleted: { $ne: true } })
      .populate('author', 'name email profileImage bio')
      .populate('category', 'name slug icon');

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blog post not found', code: 'BLOG_NOT_FOUND' },
      });
    }

    // Increment views count and trending score (views / 10 = +0.1)
    await Blog.findByIdAndUpdate(blog._id, { $inc: { viewsCount: 1, trendingScore: 0.1 } });

    let isLiked = false;
    let isSaved = false;

    if (req.user) {
      const like = await Like.findOne({ user: req.user.id, blog: blog._id });
      if (like) isLiked = true;

      const user = await User.findById(req.user.id);
      if (user && user.savedBlogs && user.savedBlogs.includes(blog._id)) {
        isSaved = true;
      }
    }

    res.status(200).json({ success: true, data: { ...blog.toObject(), isLiked, isSaved } });
  } catch (error) {
    next(error);
  }
};

// @desc    Like a blog post
// @route   POST /api/blogs/:id/like
// @access  Private
const likeBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blog post not found', code: 'BLOG_NOT_FOUND' },
      });
    }

    const likeExists = await Like.findOne({ user: req.user.id, blog: blog._id });
    if (likeExists) {
      return res.status(400).json({
        success: false,
        error: { message: 'You already liked this post', code: 'ALREADY_LIKED' },
      });
    }

    await Like.create({ user: req.user.id, blog: blog._id });

    // Increment likes count and trending score (+2 for likes)
    const updatedBlog = await Blog.findByIdAndUpdate(
      blog._id,
      { $inc: { likesCount: 1, trendingScore: 2 } },
      { new: true }
    );

    // Create notification if the liker is not the author
    if (blog.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: blog.author,
        sender: req.user.id,
        type: 'like',
        blog: blog._id,
      });
    }

    res.status(200).json({ success: true, likesCount: updatedBlog.likesCount });
  } catch (error) {
    next(error);
  }
};

// @desc    Unlike a blog post
// @route   DELETE /api/blogs/:id/like
// @access  Private
const unlikeBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blog post not found', code: 'BLOG_NOT_FOUND' },
      });
    }

    const likeRecord = await Like.findOneAndDelete({ user: req.user.id, blog: blog._id });
    if (!likeRecord) {
      return res.status(400).json({
        success: false,
        error: { message: 'You have not liked this post yet', code: 'NOT_LIKED' },
      });
    }

    // Decrement likes count and trending score (-2 for likes)
    const updatedBlog = await Blog.findByIdAndUpdate(
      blog._id,
      { $inc: { likesCount: -1, trendingScore: -2 } },
      { new: true }
    );

    res.status(200).json({ success: true, likesCount: Math.max(0, updatedBlog.likesCount) });
  } catch (error) {
    next(error);
  }
};

// @desc    Save a blog post (Bookmark)
// @route   POST /api/blogs/:id/save
// @access  Private
const saveBlog = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const blogId = req.params.id;

    if (user.savedBlogs.includes(blogId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Blog is already saved', code: 'ALREADY_SAVED' },
      });
    }

    await User.findByIdAndUpdate(req.user.id, { $addToSet: { savedBlogs: blogId } });

    res.status(200).json({ success: true, message: 'Blog saved successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Unsave a blog post (Remove Bookmark)
// @route   DELETE /api/blogs/:id/save
// @access  Private
const unsaveBlog = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const blogId = req.params.id;

    if (!user.savedBlogs.includes(blogId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Blog is not in your library', code: 'NOT_SAVED' },
      });
    }

    await User.findByIdAndUpdate(req.user.id, { $pull: { savedBlogs: blogId } });

    res.status(200).json({ success: true, message: 'Blog unsaved successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trending blog posts
// @route   GET /api/blogs/trending
// @access  Public
const getTrendingBlogs = async (req, res, next) => {
  try {
    const cachedData = await require('../models/SystemCache').findOne({ key: 'feed:trending' });
    if (cachedData && cachedData.data && cachedData.data.length > 0) {
      return res.status(200).json({ success: true, data: cachedData.data.slice(0, 6) });
    }

    // Sort by trendingScore descending, limit 6
    const blogs = await Blog.find({ status: 'published' })
      .populate('author', 'name profileImage bio')
      .populate('category', 'name slug icon')
      .sort('-trendingScore -viewsCount')
      .limit(6);

    let blogsResponse = blogs.map(b => b.toObject());
    if (req.user) {
      const Like = require('../models/Like');
      const userLikes = await Like.find({ user: req.user.id }).select('blog');
      const likedBlogIds = userLikes.map(l => l.blog.toString());
      const userObj = await User.findById(req.user.id).select('savedBlogs');
      const savedBlogIds = userObj ? userObj.savedBlogs.map(id => id.toString()) : [];
      
      blogsResponse = blogsResponse.map(blog => ({
        ...blog,
        isLiked: likedBlogIds.includes(blog._id.toString()),
        isSaved: savedBlogIds.includes(blog._id.toString())
      }));
    }

    res.status(200).json({ success: true, data: blogsResponse });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recommended posts
// @route   GET /api/blogs/recommended
// @access  Public
const getRecommendedBlogs = async (req, res, next) => {
  try {
    // Fetch featured posts or high-likes posts
    const blogs = await Blog.find({ status: 'published' })
      .populate('author', 'name profileImage bio')
      .populate('category', 'name slug icon')
      .sort({ isFeatured: -1, likesCount: -1, createdAt: -1 })
      .limit(4);

    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get following feed blogs
// @route   GET /api/blogs/feed
// @access  Private
const getFollowingFeed = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Find authors user follows
    const follows = await Follow.find({ follower: req.user.id }).select('following');
    const followingIds = follows.map(f => f.following);

    if (followingIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: 'You are not following any authors yet. Start exploring to build your feed.',
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Blog.countDocuments({ author: { $in: followingIds }, status: 'published' });
    const blogs = await Blog.find({ author: { $in: followingIds }, status: 'published' })
      .populate('author', 'name profileImage bio')
      .populate('category', 'name slug icon')
      .sort('-publishedAt -createdAt')
      .skip(skip)
      .limit(limitNum);

    let blogsResponse = blogs.map(b => b.toObject());
    if (req.user) {
      const Like = require('../models/Like');
      const userLikes = await Like.find({ user: req.user.id }).select('blog');
      const likedBlogIds = userLikes.map(l => l.blog.toString());
      const userObj = await User.findById(req.user.id).select('savedBlogs');
      const savedBlogIds = userObj ? userObj.savedBlogs.map(id => id.toString()) : [];
      
      blogsResponse = blogsResponse.map(blog => ({
        ...blog,
        isLiked: likedBlogIds.includes(blog._id.toString()),
        isSaved: savedBlogIds.includes(blog._id.toString())
      }));
    }

    res.status(200).json({
      success: true,
      count: blogsResponse.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      data: blogsResponse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload image inside content block
// @route   POST /api/blogs/upload-inline
// @access  Private
const uploadInlineImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please upload an image file', code: 'NO_FILE_UPLOADED' },
      });
    }

    const result = await uploadImage(req.file.buffer, req.file.originalname, 'blogs_inline');

    res.status(200).json({
      success: true,
      url: result.url,
      publicId: result.publicId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all blogs from a specific user
// @route   GET /api/blogs/user/:userId
// @access  Public (conditionally authenticated)
const getUserBlogs = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const query = { author: userId };
    
    // Only author or admin can see drafts/scheduled
    if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) {
      query.status = 'published';
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Blog.countDocuments(query);
    const blogs = await Blog.find(query)
      .populate('author', 'name profileImage bio')
      .populate('category', 'name slug icon')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);

    let blogsResponse = blogs.map(b => b.toObject());
    if (req.user) {
      const Like = require('../models/Like');
      const userLikes = await Like.find({ user: req.user.id }).select('blog');
      const likedBlogIds = userLikes.map(l => l.blog.toString());
      const userObj = await User.findById(req.user.id).select('savedBlogs');
      const savedBlogIds = userObj ? userObj.savedBlogs.map(id => id.toString()) : [];
      
      blogsResponse = blogsResponse.map(blog => ({
        ...blog,
        isLiked: likedBlogIds.includes(blog._id.toString()),
        isSaved: savedBlogIds.includes(blog._id.toString())
      }));
    }

    res.status(200).json({
      success: true,
      count: blogsResponse.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      data: blogsResponse,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
