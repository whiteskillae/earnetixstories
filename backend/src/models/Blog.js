const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide blog title'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  content: {
    type: String,
    required: [true, 'Please provide blog content'],
  },
  excerpt: {
    type: String,
    required: [true, 'Please provide short excerpt'],
    maxlength: [300, 'Excerpt cannot exceed 300 characters'],
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  coverImage: {
    type: String,
    required: [true, 'Please provide a cover image'],
  },
  additionalImages: [String],
  tags: {
    type: [String],
    default: [],
    index: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'rejected', 'published', 'scheduled'],
    default: 'draft',
    index: true,
  },
  moderationNotes: {
    type: String,
  },
  rejectionReason: {
    type: String,
  },
  trendingScore: {
    type: Number,
    default: 0,
    index: true,
  },
  publishedAt: {
    type: Date,
    index: true,
  },
  scheduledAt: {
    type: Date,
  },
  seo: {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    keywords: [String],
  },
  readingTime: {
    type: Number,
    default: 1,
  },
  viewsCount: {
    type: Number,
    default: 0,
  },
  likesCount: {
    type: Number,
    default: 0,
  },
  commentsCount: {
    type: Number,
    default: 0,
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Compound search index for text search
BlogSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Compound index for feed generation (published blogs sorted by date)
BlogSchema.index({ status: 1, publishedAt: -1 });

// Create slug before validation
BlogSchema.pre('validate', function(next) {
  if (this.title && (!this.slug || this.isModified('title'))) {
    // Basic slugification logic. We will append a random hex string to ensure uniqueness.
    let baseSlug = this.title
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
    const suffix = Math.random().toString(36).substring(2, 7);
    this.slug = `${baseSlug}-${suffix}`;
  }
  next();
});

module.exports = mongoose.model('Blog', BlogSchema);
