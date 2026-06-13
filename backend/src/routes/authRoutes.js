const express = require('express');
const router = express.Router();
const { register, verifySignupOTP, forgotPassword, resetPassword, login, googleLogin, registerGoogle, refreshToken, logout } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../validators/authValidator');
const rateLimit = require('express-rate-limit');

// Rate limiting specifically for auth/login routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // max 1000 requests per windowMs (temporarily increased for testing)
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validateRegister, register);
router.post('/verify-signup', authLimiter, verifySignupOTP);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/login', authLimiter, validateLogin, login);
router.post('/google', authLimiter, googleLogin);
router.post('/google-register', authLimiter, registerGoogle);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

module.exports = router;
