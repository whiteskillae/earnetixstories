const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Category = require('../models/Category');
const User = require('../models/User');
const Admin = require('../models/Admin');

let mongoServer;

const seedDefaultCategories = async () => {
  const categoryCount = await Category.countDocuments();
  if (categoryCount > 0) return;

  await Category.insertMany([
    { name: 'Technology', description: 'Software, AI, gadgets, and engineering stories.', icon: 'Code' },
    { name: 'Design', description: 'Product design, UI ideas, visual systems, and UX notes.', icon: 'Compass' },
    { name: 'Productivity', description: 'Workflows, focus, learning, and practical habits.', icon: 'Sparkles' },
    { name: 'Career', description: 'Growth stories, interviews, leadership, and work lessons.', icon: 'Award' },
    { name: 'News', description: 'Fresh analysis and timely updates from the community.', icon: 'BookOpen' },
    { name: 'Personal', description: 'Essays, reflections, opinions, and lived experiences.', icon: 'Heart' },
  ]);
  console.log('Default categories seeded.');
};

const seedAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminEmail || !adminPassword) return;

  const adminUser = await Admin.findOne({ email: adminEmail }).select('+password');
  if (!adminUser) {
    await Admin.create({
      name: 'System Admin',
      email: adminEmail,
      password: adminPassword,
    });
    console.log('Admin user seeded into strictly separate Admin collection.');
  } else {
    // Sync password if it has changed in env
    const isMatch = await adminUser.matchPassword(adminPassword);
    if (!isMatch) {
      adminUser.password = adminPassword;
      await adminUser.save();
      console.log('Admin password updated to match environment variables.');
    }
  }
};

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blog_app';
    const conn = await mongoose.connect(uri, { 
      serverSelectionTimeoutMS: 5000,
      family: 4 
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await seedDefaultCategories();
    await seedAdmin();
  } catch (error) {
    console.error(`Primary MongoDB Connection Error: ${error.message}`);
    console.log('Attempting to start an in-memory MongoDB server for development...');
    
    try {
      mongoServer = await MongoMemoryServer.create();
      const inMemoryUri = mongoServer.getUri();
      const conn = await mongoose.connect(inMemoryUri);
      console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
      await seedDefaultCategories();
      await seedAdmin();
    } catch (memError) {
      console.error(`Failed to start In-Memory MongoDB: ${memError.message}`);
      console.log('Server is running without active database connection.');
    }
  }
};

module.exports = connectDB;
