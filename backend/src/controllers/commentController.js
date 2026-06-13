const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const Notification = require('../models/Notification');
const sanitizeHtml = require('sanitize-html');

// @desc    Get comments for a blog post
// @route   GET /api/blogs/:id/comments
// @access  Public
const getBlogComments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const blogId = req.params.id;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Retrieve parent comments (parentComment: null) first
    const total = await Comment.countDocuments({ blog: blogId, parentComment: null });
    const comments = await Comment.find({ blog: blogId, parentComment: null })
      .populate('author', 'name profileImage bio')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);

    // Fetch replies for each parent comment
    const commentsWithReplies = [];
    for (const comment of comments) {
      const replies = await Comment.find({ parentComment: comment._id })
        .populate('author', 'name profileImage bio')
        .sort('createdAt');
      
      commentsWithReplies.push({
        ...comment.toJSON(),
        replies,
      });
    }

    res.status(200).json({
      success: true,
      count: comments.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      data: commentsWithReplies,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a comment or reply
// @route   POST /api/blogs/:id/comments
// @access  Private
const createComment = async (req, res, next) => {
  try {
    const blogId = req.params.id;
    const { content, parentComment } = req.body;

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blog post not found', code: 'BLOG_NOT_FOUND' },
      });
    }

    const commentData = {
      blog: blogId,
      author: req.user.id,
      content: sanitizeHtml(content, { allowedTags: [] }),
    };

    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent) {
        return res.status(404).json({
          success: false,
          error: { message: 'Parent comment not found', code: 'PARENT_COMMENT_NOT_FOUND' },
        });
      }
      commentData.parentComment = parentComment;
    }

    const comment = await Comment.create(commentData);

    // Increment blog comments count and trending score (+3 for comments)
    await Blog.findByIdAndUpdate(blogId, { $inc: { commentsCount: 1, trendingScore: 3 } });

    // Populate author details to send in response
    await comment.populate('author', 'name profileImage bio');

    // Create notification
    if (parentComment) {
      // Notify parent comment author
      const parent = await Comment.findById(parentComment);
      if (parent.author.toString() !== req.user.id) {
        await Notification.create({
          recipient: parent.author,
          sender: req.user.id,
          type: 'reply',
          blog: blogId,
          comment: comment._id,
        });
      }
    } else {
      // Notify blog author
      if (blog.author.toString() !== req.user.id) {
        await Notification.create({
          recipient: blog.author,
          sender: req.user.id,
          type: 'comment',
          blog: blogId,
          comment: comment._id,
        });
      }
    }

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a comment
// @route   PUT /api/users/comments/:id (or just PUT /api/blogs/comments/:id)
// @access  Private
const updateComment = async (req, res, next) => {
  try {
    let comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Comment not found', code: 'COMMENT_NOT_FOUND' },
      });
    }

    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized to edit this comment', code: 'UNAUTHORIZED' },
      });
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({
        success: false,
        error: { message: 'Content is required', code: 'CONTENT_REQUIRED' },
      });
    }

    comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { $set: { content: sanitizeHtml(content, { allowedTags: [] }), isEdited: true } },
      { new: true, runValidators: true }
    ).populate('author', 'name profileImage bio');

    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment and its replies
// @route   DELETE /api/blogs/comments/:id
// @access  Private
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Comment not found', code: 'COMMENT_NOT_FOUND' },
      });
    }

    const blog = await Blog.findById(comment.blog);

    // Authorized if comment author, blog author, or admin
    const isCommentAuthor = comment.author.toString() === req.user.id;
    const isBlogAuthor = blog && blog.author.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isCommentAuthor && !isBlogAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized to delete this comment', code: 'UNAUTHORIZED' },
      });
    }

    // Count replies to decrement commentsCount on the blog
    const repliesCount = await Comment.countDocuments({ parentComment: comment._id });
    const totalDeleted = 1 + repliesCount;

    // Delete comment and replies
    await Comment.deleteMany({
      $or: [
        { _id: comment._id },
        { parentComment: comment._id },
      ],
    });

    if (blog) {
      await Blog.findByIdAndUpdate(blog._id, { $inc: { commentsCount: -totalDeleted, trendingScore: -(3 * totalDeleted) } });
    }

    res.status(200).json({ success: true, message: 'Comment and replies deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Like a comment
// @route   POST /api/blogs/comments/:id/like
// @access  Private
const likeComment = async (req, res, next) => {
  try {
    let comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Comment not found', code: 'COMMENT_NOT_FOUND' },
      });
    }

    if (comment.likes.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'You already liked this comment', code: 'ALREADY_LIKED' },
      });
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likes: req.user.id } },
      { new: true }
    );

    // Notify comment author
    if (comment.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: comment.author,
        sender: req.user.id,
        type: 'like',
        blog: comment.blog,
        comment: comment._id,
      });
    }

    res.status(200).json({ success: true, count: updatedComment.likes.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Unlike a comment
// @route   DELETE /api/blogs/comments/:id/like
// @access  Private
const unlikeComment = async (req, res, next) => {
  try {
    let comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Comment not found', code: 'COMMENT_NOT_FOUND' },
      });
    }

    if (!comment.likes.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'You have not liked this comment yet', code: 'NOT_LIKED' },
      });
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      req.params.id,
      { $pull: { likes: req.user.id } },
      { new: true }
    );

    res.status(200).json({ success: true, count: updatedComment.likes.length });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBlogComments,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
};
