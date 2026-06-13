const mongoose = require('mongoose');
const cron = require('node-cron');
const dotenv = require('dotenv');

dotenv.config();

// Models
const Blog = require('./models/Blog');
const User = require('./models/User');
const Comment = require('./models/Comment');
const Report = require('./models/Report');
const SystemCache = require('./models/SystemCache');

// Connect to Database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Worker DB Connected'))
  .catch(err => {
    console.error('Worker DB Connection Error:', err);
    process.exit(1);
  });

console.log('Background Worker Started');

// 1. Calculate Trending Feed
const updateTrendingFeed = async () => {
  try {
    console.log('[Worker] Calculating Trending Feed...');
    const trendingBlogs = await Blog.find({ status: 'published' })
      .populate('author', 'name profileImage')
      .populate('category', 'name slug')
      .sort('-trendingScore -publishedAt')
      .limit(100)
      .lean();

    await SystemCache.findOneAndUpdate(
      { key: 'feed:trending' },
      { key: 'feed:trending', data: trendingBlogs },
      { upsert: true, new: true }
    );
    console.log('[Worker] Trending Feed Updated in Cache');
  } catch (err) {
    console.error('[Worker] Error calculating trending feed:', err);
  }
};

// 2. Calculate Admin Analytics
const updateAdminAnalytics = async () => {
  try {
    console.log('[Worker] Calculating Admin Analytics...');
    const totalUsers = await User.countDocuments();
    const totalBlogs = await Blog.countDocuments({ status: 'published' });
    const totalDrafts = await Blog.countDocuments({ status: 'draft' });
    const totalScheduled = await Blog.countDocuments({ status: 'scheduled' });
    const totalComments = await Comment.countDocuments();
    const totalReports = await Report.countDocuments({ status: 'pending' });

    const viewStats = await Blog.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$viewsCount' } } },
    ]);
    const totalViews = viewStats.length > 0 ? viewStats[0].totalViews : 0;

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

    const categoryStats = await Blog.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      { $unwind: '$categoryDetails' },
      {
        $project: {
          name: '$categoryDetails.name',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const analyticsData = {
      summary: { totalUsers, totalBlogs, totalComments, totalViews, totalDrafts, totalScheduled, totalReports },
      userGrowth: userGrowth.map(ug => ({ month: ug._id, users: ug.count })),
      popularCategories: categoryStats.map(cs => ({ name: cs.name, count: cs.count })),
    };

    await SystemCache.findOneAndUpdate(
      { key: 'admin:analytics' },
      { key: 'admin:analytics', data: analyticsData },
      { upsert: true, new: true }
    );
    console.log('[Worker] Admin Analytics Updated in Cache');
  } catch (err) {
    console.error('[Worker] Error calculating admin analytics:', err);
  }
};

// Run cron jobs every 5 minutes
cron.schedule('*/5 * * * *', () => {
  updateTrendingFeed();
  updateAdminAnalytics();
});

// Run once on startup
setTimeout(() => {
  updateTrendingFeed();
  updateAdminAnalytics();
}, 2000);

// Keep alive
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('Worker DB disconnected on app termination');
    process.exit(0);
  });
});
