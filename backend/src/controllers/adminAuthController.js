const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

// @desc    Login admin
// @route   POST /api/admin-auth/login
// @access  Public
const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for admin
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid admin credentials', code: 'INVALID_CREDENTIALS' },
      });
    }

    // Check password
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid admin credentials', code: 'INVALID_CREDENTIALS' },
      });
    }

    admin.lastLoginAt = Date.now();
    await admin.save();

    // Create token
    const token = jwt.verify || jwt.sign; // just getting the sign method
    const accessToken = jwt.sign({ id: admin._id, role: 'system-admin' }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m',
    });

    res.status(200).json({
      success: true,
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          profileImage: admin.profileImage,
        },
        token: accessToken
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in admin
// @route   GET /api/admin-auth/profile
// @access  Private/Admin
const getAdminProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: { message: 'Admin not found', code: 'ADMIN_NOT_FOUND' },
      });
    }
    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginAdmin,
  getAdminProfile,
};
