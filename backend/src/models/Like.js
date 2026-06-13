const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  blog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

// Enforce unique combination of user and blog
LikeSchema.index({ user: 1, blog: 1 }, { unique: true });

module.exports = mongoose.model('Like', LikeSchema);
