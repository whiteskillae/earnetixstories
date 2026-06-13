const mongoose = require('mongoose');

const ApiLogSchema = new mongoose.Schema(
  {
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    responseTime: {
      type: Number, // in ms
      required: true,
    },
    userAgent: {
      type: String,
    },
    isSuspicious: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// TTL index to automatically delete logs older than 30 days
ApiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('ApiLog', ApiLogSchema);
