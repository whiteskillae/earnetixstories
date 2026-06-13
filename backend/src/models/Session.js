const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
  deviceInfo: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '1s' }, // TTL index to automatically remove expired sessions
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Session', SessionSchema);
