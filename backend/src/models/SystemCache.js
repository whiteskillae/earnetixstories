const mongoose = require('mongoose');

const systemCacheSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: false,
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemCache', systemCacheSchema);
