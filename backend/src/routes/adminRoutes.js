const express = require('express');
const router = express.Router();
const {
  getAnalytics,
  getUsers,
  updateUserStatus,
  updateUserRole,
  getReports,
  resolveReport,
  moderateBlog,
  deleteBlogAdmin,
  getAllBlogsAdmin,
  deleteUserAdmin,
  getAdminLogs,
  createAnnouncement,
  getApiTraffic,
} = require('../controllers/adminController');
const { protectAdmin } = require('../middlewares/auth');
const { adminActionLimiter } = require('../middlewares/rateLimiters');

// Apply strict admin protection to all routes in this router
router.use(protectAdmin);

router.get('/analytics', getAnalytics);
router.get('/traffic', getApiTraffic);

router.get('/users', getUsers);
router.put('/users/:id/status', adminActionLimiter, updateUserStatus);
router.put('/users/:id/role', adminActionLimiter, updateUserRole);
router.delete('/users/:id', adminActionLimiter, deleteUserAdmin);

router.get('/reports', getReports);
router.put('/reports/:id/resolve', adminActionLimiter, resolveReport);

router.get('/blogs', getAllBlogsAdmin);
router.put('/blogs/:id/moderate', adminActionLimiter, moderateBlog);
router.delete('/blogs/:id', adminActionLimiter, deleteBlogAdmin);

router.get('/logs', getAdminLogs);
router.post('/announcements', adminActionLimiter, createAnnouncement);

module.exports = router;
