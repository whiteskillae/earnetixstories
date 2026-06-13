const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  updateAvatar,
  changePassword,
  followUser,
  unfollowUser,
  removeFollower,
  getFollowers,
  getFollowing,
  getLikedBlogs,
  getSavedBlogs,
} = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const { uploadOptions } = require('../config/cloudinary');

// Protected Profile routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/profile/avatar', protect, uploadOptions.single('avatar'), updateAvatar);
router.put('/profile/password', protect, changePassword);
router.get('/profile/liked-blogs', protect, getLikedBlogs);
router.get('/profile/saved-blogs', protect, getSavedBlogs);

// Social relationships
router.post('/:id/follow', protect, followUser);
router.delete('/:id/follow', protect, unfollowUser);
router.delete('/:id/follower', protect, removeFollower);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

module.exports = router;
