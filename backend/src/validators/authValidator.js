const { body, validationResult } = require('express-validator');

const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters').matches(/^[^<>]*$/).withMessage('Invalid characters in name'),
  body('username').trim().notEmpty().withMessage('Username is required').matches(/^[a-zA-Z0-9_]{3,20}$/).withMessage('Username must be 3-20 characters long and contain only letters, numbers, and underscores'),
  body('email').trim().isEmail().withMessage('Provide a valid email address').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('mobileNumber').optional().trim().notEmpty().withMessage('Mobile number cannot be empty if provided'),
  body('country').optional().trim().notEmpty().withMessage('Country cannot be empty if provided'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: errors.array().map(e => e.msg).join(', '),
          code: 'VALIDATION_ERROR',
          details: errors.array(),
        },
      });
    }
    next();
  },
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: errors.array().map(e => e.msg).join(', '),
          code: 'VALIDATION_ERROR',
        },
      });
    }
    next();
  },
];

module.exports = {
  validateRegister,
  validateLogin,
};
