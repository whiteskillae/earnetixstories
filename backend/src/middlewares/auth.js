const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Not authorized, token missing', code: 'UNAUTHORIZED_ACCESS' },
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User matching token no longer exists', code: 'USER_NOT_FOUND' },
      });
    }

    if (user.isDeleted) {
      return res.status(401).json({
        success: false,
        error: { message: 'User account has been deleted.', code: 'USER_DELETED' },
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({
        success: false,
        error: { message: 'Your account is banned.', code: 'USER_BANNED' },
      });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: { message: 'Your account is suspended.', code: 'USER_SUSPENDED' },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(`Auth Middleware Error: ${error.message}`);
    return res.status(401).json({
      success: false,
      error: { message: 'Not authorized, invalid or expired token', code: 'TOKEN_INVALID' },
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route`,
          code: 'FORBIDDEN_RESOURCE',
        },
      });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.status !== 'banned' && user.status !== 'suspended' && !user.isDeleted) {
      req.user = user;
    }
  } catch (error) {
    // Ignore invalid tokens for optional auth
  }
  next();
};

const protectAdmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Not authorized, token missing', code: 'UNAUTHORIZED_ACCESS' },
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Strictly check the Admin collection
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: { message: 'Admin matching token does not exist', code: 'ADMIN_NOT_FOUND' },
      });
    }

    req.admin = admin; // set req.admin instead of req.user to avoid confusion
    next();
  } catch (error) {
    console.error(`Admin Auth Middleware Error: ${error.message}`);
    return res.status(401).json({
      success: false,
      error: { message: 'Not authorized, invalid or expired admin token', code: 'TOKEN_INVALID' },
    });
  }
};

module.exports = {
  protect,
  requireRole,
  optionalAuth,
  protectAdmin,
};
