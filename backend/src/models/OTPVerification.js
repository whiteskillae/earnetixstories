const mongoose = require('mongoose');

const OTPVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true,
  },
  otp_hash: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['signup', 'forgot_password'],
    required: true,
  },
  expires_at: {
    type: Date,
    required: true,
    index: { expires: 0 }, // Automatically delete document when expiration date is reached
  },
  attempts: {
    type: Number,
    default: 0,
  },
  resend_count: {
    type: Number,
    default: 0,
  },
  last_request_at: {
    type: Date,
    default: Date.now,
  },
  blocked_until: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('OTPVerification', OTPVerificationSchema);
