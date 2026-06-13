const express = require('express');
const router = express.Router();
const { loginAdmin, getAdminProfile } = require('../controllers/adminAuthController');
const { protectAdmin } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 admin login requests per window
  message: {
    success: false,
    error: {
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
      code: 'ADMIN_BRUTE_FORCE_LOCKOUT',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', adminLoginLimiter, loginAdmin);
router.get('/profile', protectAdmin, getAdminProfile);

module.exports = router;
