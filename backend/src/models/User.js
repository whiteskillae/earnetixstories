const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide full name'],
    trim: true,
  },
  username: {
    type: String,
    required: [true, 'Please provide username'],
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
    match: [
      /^[a-zA-Z0-9_]{3,20}$/,
      'Username can only contain alphanumeric characters and underscores, and must be 3-20 characters long',
    ],
  },
  lastUsernameChangeAt: {
    type: Date,
    default: null,
  },
  usernameChangeCount: {
    type: Number,
    default: 0,
  },
  is_verified: {
    type: Boolean,
    default: false,
    index: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide email'],
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address',
    ],
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't return password by default
  },
  googleId: {
    type: String,
    sparse: true, // Allows sparse index since not all users will have googleId
  },
  mobileNumber: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
  },
  portfolioWebsite: {
    type: String,
    trim: true,
    match: [
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
      'Please provide a valid website URL',
    ],
  },
  bio: {
    type: String,
    default: '',
    maxlength: [200, 'Bio cannot exceed 200 characters'],
  },
  profileImage: {
    type: String,
    default: 'https://res.cloudinary.com/default-avatar.png',
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active',
    index: true,
  },
  subscription: {
    type: String,
    default: 'basic',
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
  savedBlogs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
  }],
  browserInfo: String,
  deviceInfo: String,
  ipAddress: String,
  lastLoginAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
