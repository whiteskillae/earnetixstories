const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false,
  },
  ipAddress: {
    type: String,
  },
  deviceInfo: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('AdminLog', adminLogSchema);
