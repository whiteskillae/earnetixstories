const User = require('../models/User');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const { uploadImage, deleteImage } = require('../config/cloudinary');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'savedBlogs',
      populate: [
        { path: 'author', select: 'name profileImage bio' },
        { path: 'category', select: 'name slug icon' }
      ]
    });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, mobileNumber, country, dateOfBirth, gender, portfolioWebsite } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (bio !== undefined) fieldsToUpdate.bio = bio;
    if (mobileNumber !== undefined) fieldsToUpdate.mobileNumber = mobileNumber;
    if (country !== undefined) fieldsToUpdate.country = country;
    if (dateOfBirth !== undefined) fieldsToUpdate.dateOfBirth = dateOfBirth;
    if (gender !== undefined) fieldsToUpdate.gender = gender;
    if (portfolioWebsite !== undefined) fieldsToUpdate.portfolioWebsite = portfolioWebsite;

    const userToUpdate = await User.findById(req.user.id);
    if (!userToUpdate) {
      return res.status(404).json({ success: false, error: { message: 'User not found', code: 'USER_NOT_FOUND' } });
    }

    if (req.body.username && req.body.username !== userToUpdate.username) {
      if (userToUpdate.usernameChangeCount >= 12) {
        return res.status(400).json({
          success: false,
          error: { message: 'You have reached the maximum lifetime limit (12) for username changes.', code: 'USERNAME_CHANGE_LIMIT_REACHED' }
        });
      }

      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (userToUpdate.lastUsernameChangeAt && (Date.now() - userToUpdate.lastUsernameChangeAt.getTime()) < thirtyDaysMs) {
        return res.status(400).json({
          success: false,
          error: { message: 'Username can only be changed once every 30 days.', code: 'USERNAME_CHANGE_RESTRICTED' }
        });
      }
      
      // Check if new username is taken
      const usernameTaken = await User.findOne({ username: req.body.username });
      if (usernameTaken && usernameTaken.id !== req.user.id) {
        return res.status(400).json({ success: false, error: { message: 'Username is already taken.', code: 'USERNAME_TAKEN' } });
      }

      fieldsToUpdate.username = req.body.username;
      fieldsToUpdate.lastUsernameChangeAt = Date.now();
      fieldsToUpdate.usernameChangeCount = (userToUpdate.usernameChangeCount || 0) + 1;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: fieldsToUpdate },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile avatar image
// @route   PUT /api/users/profile/avatar
// @access  Private
const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please upload an image file', code: 'NO_FILE_UPLOADED' },
      });
    }

    const user = await User.findById(req.user.id);

    // Delete old image if it wasn't default uploader template
    if (user.profileImage && !user.profileImage.includes('default-avatar.png')) {
      // Extract publicId (for Cloudinary it's the path folder/name, for local it's the filename)
      let oldPublicId = '';
      if (user.profileImage.includes('/uploads/')) {
        oldPublicId = user.profileImage.split('/uploads/')[1];
      } else {
        // Cloudinary URL parsing (extract path between /upload/v.../ and file extension)
        const urlParts = user.profileImage.split('/upload/');
        if (urlParts.length > 1) {
          const pathWithVer = urlParts[1].substring(urlParts[1].indexOf('/') + 1);
          oldPublicId = pathWithVer.substring(0, pathWithVer.lastIndexOf('.'));
        }
      }
      if (oldPublicId) {
        await deleteImage(oldPublicId);
      }
    }

    // Upload new image
    const result = await uploadImage(req.file.buffer, req.file.originalname, 'avatars');

    user.profileImage = result.url;
    await user.save();

    res.status(200).json({ success: true, data: { profileImage: user.profileImage } });
  } catch (error) {
    next(error);
  }
};

// @desc    Change account password
// @route   PUT /api/users/profile/password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Provide both current and new password', code: 'MISSING_FIELDS' },
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Handle Google registered users with no set password
    if (!user.password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Google users cannot change password. Set one by contacting support.', code: 'OAUTH_PASSWORD_RESTRICTION' },
      });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Incorrect current password', code: 'INCORRECT_PASSWORD' },
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Follow a user
// @route   POST /api/users/:id/follow
// @access  Private
const followUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    if (targetUserId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: { message: 'You cannot follow yourself', code: 'SELF_FOLLOW_RESTRICTION' },
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { message: 'Target user not found', code: 'USER_NOT_FOUND' },
      });
    }

    // Check if already following
    const isFollowing = await Follow.findOne({
      follower: req.user.id,
      following: targetUserId,
    });

    if (isFollowing) {
      return res.status(400).json({
        success: false,
        error: { message: 'You are already following this user', code: 'ALREADY_FOLLOWING' },
      });
    }

    // Create follow
    await Follow.create({
      follower: req.user.id,
      following: targetUserId,
    });

    // Create notification
    await Notification.create({
      recipient: targetUserId,
      sender: req.user.id,
      type: 'follow',
    });

    res.status(200).json({ success: true, message: 'User followed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Unfollow a user
// @route   DELETE /api/users/:id/follow
// @access  Private
const unfollowUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    const followRecord = await Follow.findOneAndDelete({
      follower: req.user.id,
      following: targetUserId,
    });

    if (!followRecord) {
      return res.status(400).json({
        success: false,
        error: { message: 'You are not following this user', code: 'NOT_FOLLOWING' },
      });
    }

    res.status(200).json({ success: true, message: 'User unfollowed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of followers for a user
// @route   GET /api/users/:id/followers
// @access  Public
const getFollowers = async (req, res, next) => {
  try {
    const follows = await Follow.find({ following: req.params.id })
      .populate('follower', 'name email profileImage bio')
      .sort('-createdAt');

    const followers = follows.map(f => f.follower);

    res.status(200).json({ success: true, count: followers.length, data: followers });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of users followed by a user
// @route   GET /api/users/:id/following
// @access  Public
const getFollowing = async (req, res, next) => {
  try {
    const follows = await Follow.find({ follower: req.params.id })
      .populate('following', 'name email profileImage bio')
      .sort('-createdAt');

    const following = follows.map(f => f.following);

    res.status(200).json({ success: true, count: following.length, data: following });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a follower
// @route   DELETE /api/users/:id/follower
// @access  Private
const removeFollower = async (req, res, next) => {
  try {
    const followerId = req.params.id;

    const followRecord = await Follow.findOneAndDelete({
      follower: followerId,
      following: req.user.id,
    });

    if (!followRecord) {
      return res.status(400).json({
        success: false,
        error: { message: 'This user is not following you', code: 'NOT_FOLLOWER' },
      });
    }

    res.status(200).json({ success: true, message: 'Follower removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's liked blogs
// @route   GET /api/users/liked-blogs
// @access  Private
const getLikedBlogs = async (req, res, next) => {
  try {
    const Like = require('../models/Like');
    const likes = await Like.find({ user: req.user.id })
      .populate({
        path: 'blog',
        populate: [
          { path: 'author', select: 'name profileImage bio' },
          { path: 'category', select: 'name slug icon' }
        ]
      })
      .sort('-createdAt');

    const blogs = likes.map(like => like.blog).filter(b => b && !b.isDeleted);

    res.status(200).json({ success: true, count: blogs.length, data: blogs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's saved blogs
// @route   GET /api/users/saved-blogs
// @access  Private
const getSavedBlogs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'savedBlogs',
      match: { isDeleted: { $ne: true } },
      populate: [
        { path: 'author', select: 'name profileImage bio' },
        { path: 'category', select: 'name slug icon' }
      ]
    });

    res.status(200).json({ success: true, count: user.savedBlogs.length, data: user.savedBlogs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
