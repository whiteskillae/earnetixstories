const User = require('../models/User');
const Blog = require('../models/Blog');
const Comment = require('../models/Comment');
const Report = require('../models/Report');
const Like = require('../models/Like');
const AdminLog = require('../models/AdminLog');
const Announcement = require('../models/Announcement');

const requestIp = require('request-ip');
const useragent = require('useragent');

const createAdminLog = async (req, action, details) => {
  try {
    const adminId = req.admin ? req.admin._id : null;
    const ipAddress = requestIp.getClientIp(req) || '127.0.0.1';
    const agent = useragent.parse(req.headers['user-agent']);
    const deviceInfo = agent.os.toString() + ' - ' + agent.toAgent();

    await AdminLog.create({ action, details, adminId, ipAddress, deviceInfo });
  } catch (err) {
    console.error('Failed to create admin log:', err);
  }
};

// @desc    Get dashboard analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAnalytics = async (req, res, next) => {
  try {
    const cachedData = await require('../models/SystemCache').findOne({ key: 'admin:analytics' });
    if (cachedData && cachedData.data) {
      return res.status(200).json({ success: true, ...cachedData.data });
    }

    const totalUsers = await User.countDocuments();
    const totalBlogs = await Blog.countDocuments({ status: 'published' });
    const totalDrafts = await Blog.countDocuments({ status: 'draft' });
    const totalScheduled = await Blog.countDocuments({ status: 'scheduled' });
    const totalComments = await Comment.countDocuments();
    const totalReports = await Report.countDocuments({ status: 'pending' });

    // Aggregate total views
    const viewStats = await Blog.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$viewsCount' } } },
    ]);
    const totalViews = viewStats.length > 0 ? viewStats[0].totalViews : 0;

    // Aggregate monthly user growth (last 6 months)
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 6 },
    ]);

    // Aggregate popular categories
    const categoryStats = await Blog.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$category',
          postsCount: { $sum: 1 },
          viewsCount: { $sum: '$viewsCount' },
        },
      },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'categoryDetails' } },
      { $unwind: '$categoryDetails' },
      {
        $project: {
          name: '$categoryDetails.name',
          postsCount: 1,
          viewsCount: 1,
        },
      },
      { $sort: { viewsCount: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalBlogs,
          totalDrafts,
          totalScheduled,
          totalComments,
          totalViews,
          totalReports,
        },
        userGrowth,
        categoryStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get API Traffic Logs
// @route   GET /api/admin/traffic
// @access  Private/Admin
const getApiTraffic = async (req, res, next) => {
  try {
    const ApiLog = require('../models/ApiLog');
    
    const totalHits = await ApiLog.countDocuments();
    const suspiciousHits = await ApiLog.countDocuments({ isSuspicious: true });
    
    const endpointStats = await ApiLog.aggregate([
      {
        $group: {
          _id: '$endpoint',
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const recentLogs = await ApiLog.find()
      .sort('-createdAt')
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        totalHits,
        suspiciousHits,
        endpointStats,
        recentLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suspend or Ban a user
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid status value', code: 'INVALID_STATUS' },
      });
    }

    // Admins cannot ban themselves (assuming req.admin has id)
    if (req.params.id === req.admin.id) {
      return res.status(400).json({
        success: false,
        error: { message: 'You cannot change your own status', code: 'SELF_MODERATION' },
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'USER_NOT_FOUND' },
      });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid role value', code: 'INVALID_ROLE' },
      });
    }

    if (req.params.id === req.admin.id) {
      return res.status(400).json({
        success: false,
        error: { message: 'You cannot change your own role', code: 'SELF_ROLE_CHANGE' },
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'USER_NOT_FOUND' },
      });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Private/Admin
const getReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = {};
    if (status) query.status = status;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .populate('reporter', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);

    // Populate the target object dynamically since it references different collections
    const reportsWithTargets = [];
    for (const report of reports) {
      let targetDetails = null;
      if (report.targetType === 'blog') {
        targetDetails = await Blog.findById(report.targetId).populate('author', 'name email');
      } else if (report.targetType === 'comment') {
        targetDetails = await Comment.findById(report.targetId).populate('author', 'name email');
      } else if (report.targetType === 'user') {
        targetDetails = await User.findById(report.targetId);
      }

      reportsWithTargets.push({
        ...report.toJSON(),
        targetDetails,
      });
    }

    res.status(200).json({
      success: true,
      count: reportsWithTargets.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      data: reportsWithTargets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve a report
// @route   PUT /api/admin/reports/:id/resolve
// @access  Private/Admin
const resolveReport = async (req, res, next) => {
  try {
    const { status } = req.body; // 'resolved' or 'dismissed'
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid resolution status', code: 'INVALID_RESOLUTION' },
      });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found', code: 'REPORT_NOT_FOUND' },
      });
    }

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Moderate a blog post
// @route   PUT /api/admin/blogs/:id/moderate
// @access  Private/Admin
const moderateBlog = async (req, res, next) => {
  try {
    const { status, moderationNotes, rejectionReason } = req.body;
    
    if (!['approved', 'rejected', 'published'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid moderation status', code: 'INVALID_STATUS' },
      });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blog not found', code: 'BLOG_NOT_FOUND' },
      });
    }

    blog.status = status === 'approved' ? 'published' : status;
    if (blog.status === 'published' && !blog.publishedAt) {
      blog.publishedAt = Date.now();
    }
    if (moderationNotes) {
      blog.moderationNotes = moderationNotes;
    }
    if (rejectionReason) {
      blog.rejectionReason = rejectionReason;
    }

    await blog.save();

    await createAdminLog(req, 'Moderate Blog', `Blog ${req.params.id} moderated to ${status}`);

    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin get all blogs
// @route   GET /api/admin/blogs
// @access  Private/Admin
const getAllBlogsAdmin = async (req, res, next) => {
  try {
    const { status, limit = 100 } = req.query;
    const query = status ? { status } : {};
    
    const blogs = await Blog.find(query)
      .populate('author', 'name profileImage')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
      
    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    next(error);
  }
};

const { deleteImage } = require('../config/cloudinary');

// @desc    Admin strictly delete a blog
// @route   DELETE /api/admin/blogs/:id
// @access  Private/Admin
const deleteBlogAdmin = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, error: { message: 'Blog not found' } });
    }
    
    if (blog.coverImage) {
      let publicId = '';
      if (blog.coverImage.includes('/uploads/')) {
        publicId = blog.coverImage.split('/uploads/')[1];
      } else {
        const urlParts = blog.coverImage.split('/upload/');
        if (urlParts.length > 1) {
          const pathWithVer = urlParts[1].substring(urlParts[1].indexOf('/') + 1);
          publicId = pathWithVer.substring(0, pathWithVer.lastIndexOf('.'));
        }
      }
      if (publicId && publicId !== 'default-cover') {
        try {
          await deleteImage(publicId);
        } catch (err) {
          console.error('Failed to delete image from Cloudinary:', err);
        }
      }
    }

    await createAdminLog(req, 'Delete Blog', `Live Blog ${req.params.id} permanently deleted`);
    await blog.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin strictly hard delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUserAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }

    // Delete user profile image if it's on Cloudinary
    if (user.profileImage && user.profileImage.includes('res.cloudinary.com')) {
      let publicId = '';
      if (user.profileImage.includes('/uploads/')) {
        publicId = user.profileImage.split('/uploads/')[1];
      } else {
        const urlParts = user.profileImage.split('/upload/');
        if (urlParts.length > 1) {
          const pathWithVer = urlParts[1].substring(urlParts[1].indexOf('/') + 1);
          publicId = pathWithVer.substring(0, pathWithVer.lastIndexOf('.'));
        }
      }
      if (publicId && publicId !== 'default-avatar') {
        try {
          await deleteImage(publicId);
        } catch (err) {
          console.error('Failed to delete user profile image from Cloudinary:', err);
        }
      }
    }

    // Optional: Delete user's blogs here or cascade delete in model. 
    // Assuming cascade delete or keeping blogs as orphaned is fine for now based on current logic.
    await createAdminLog(req, 'Delete User', `User ${user.email} (${user._id}) permanently deleted`);
    await user.deleteOne();
    
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Get admin logs
// @route   GET /api/admin/logs
// @access  Private/Admin
const getAdminLogs = async (req, res, next) => {
  try {
    const logs = await AdminLog.find()
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

// @desc    Create announcement
// @route   POST /api/admin/announcements
// @access  Private/Admin
const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, type } = req.body;
    const announcement = await Announcement.create({
      title,
      content,
      type,
      createdBy: req.user?._id,
    });
    
    await createAdminLog(req, 'Create Announcement', `Created announcement: ${title}`);
    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getAnalytics,
  getUsers,
  updateUserStatus,
  updateUserRole,
  getReports,
  resolveReport,
  moderateBlog,
  deleteBlogAdmin,
  getAllBlogsAdmin,
  deleteUserAdmin,
  getAdminLogs,
  createAnnouncement,
  getApiTraffic,
};
