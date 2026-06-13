const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  targetType: {
    type: String,
    enum: ['blog', 'comment', 'user'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  reason: {
    type: String,
    required: [true, 'Please provide a reason for the report'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'dismissed'],
    default: 'pending',
    index: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Report', ReportSchema);
