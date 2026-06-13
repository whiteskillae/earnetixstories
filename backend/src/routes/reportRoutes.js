const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { protect } = require('../middlewares/auth');

// @desc    Submit content report
// @route   POST /api/reports
// @access  Private
router.post('/', protect, async (req, res, next) => {
  try {
    const { targetType, targetId, reason } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide targetType, targetId, and reason', code: 'MISSING_FIELDS' },
      });
    }

    if (!['blog', 'comment', 'user'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid targetType', code: 'INVALID_TARGET_TYPE' },
      });
    }

    const report = await Report.create({
      reporter: req.user.id,
      targetType,
      targetId,
      reason,
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
