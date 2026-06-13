const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide category name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters'],
  },
  icon: {
    type: String,
    default: 'BookOpen', // name of Lucide icon on frontend
  },
}, {
  timestamps: true,
});

// Create slug before validation
CategorySchema.pre('validate', function(next) {
  if (this.name) {
    this.slug = this.name
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }
  next();
});

module.exports = mongoose.model('Category', CategorySchema);
