const cron = require('node-cron');
const Blog = require('../models/Blog');

const initScheduler = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Find blogs scheduled for now or in the past that aren't published yet
      const blogsToPublish = await Blog.find({
        status: 'scheduled',
        scheduledAt: { $lte: now },
      });

      if (blogsToPublish.length > 0) {
        console.log(`[Scheduler] Found ${blogsToPublish.length} scheduled blogs to publish.`);

        for (const blog of blogsToPublish) {
          blog.status = 'published';
          blog.publishedAt = blog.scheduledAt || now;
          await blog.save();
          console.log(`[Scheduler] Published blog: "${blog.title}"`);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error in publishing scheduled blogs:', err.message);
    }
  });

  console.log('[Scheduler] Chron job initialized running every minute.');

  // Run every hour to update trending scores
  cron.schedule('0 * * * *', async () => {
    try {
      const publishedBlogs = await Blog.find({ status: 'published' });
      const now = new Date();

      for (const blog of publishedBlogs) {
        const publishedAt = blog.publishedAt || blog.createdAt;
        const hoursSincePublished = Math.max(0, (now - publishedAt) / (1000 * 60 * 60));
        
        // Trending Formula
        const likesWeight = blog.likesCount * 5;
        const commentsWeight = blog.commentsCount * 3;
        const viewsWeight = blog.viewsCount;
        
        const timeDecay = Math.pow(hoursSincePublished + 2, 1.5);
        
        blog.trendingScore = (likesWeight + commentsWeight + viewsWeight) / timeDecay;
        
        // Save without triggering validation hooks unless needed, but here standard save is fine.
        await blog.save({ validateBeforeSave: false });
      }
      console.log(`[Scheduler] Updated trending scores for ${publishedBlogs.length} blogs.`);
    } catch (err) {
      console.error('[Scheduler] Error updating trending scores:', err.message);
    }
  });

  console.log('[Scheduler] Trending score cron job initialized (runs hourly).');
};

module.exports = { initScheduler };
