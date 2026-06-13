const rateLimit = require('express-rate-limit');

// Bot detection: Block excessive requests from the same IP globally
const globalBotLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // Max 500 requests per 5 minutes per IP
  message: {
    success: false,
    error: {
      message: 'Suspicious activity detected. Too many requests. Please try again later.',
      code: 'BOT_DETECTED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for creating posts
const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 posts per hour
  message: {
    success: false,
    error: {
      message: 'Too many posts created from this IP, please try again after an hour',
      code: 'POST_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for comments
const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 comments per minute
  message: {
    success: false,
    error: {
      message: 'You are commenting too fast. Please wait a minute.',
      code: 'COMMENT_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for admin actions
const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 sensitive admin actions per 15 mins
  message: {
    success: false,
    error: {
      message: 'Too many admin actions from this IP, please try again later',
      code: 'ADMIN_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  globalBotLimiter,
  postLimiter,
  commentLimiter,
  adminActionLimiter,
};
