const User = require('../models/User');
const OTPVerification = require('../models/OTPVerification');
const { sendSignupOTPEmail, sendPasswordResetOTPEmail } = require('../utils/email');
const { sendTokenResponse } = require('../utils/token');
const crypto = require('crypto');
const requestIp = require('request-ip');
const useragent = require('useragent');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to get client metadata
const getClientMetadata = (req) => {
  const ip = requestIp.getClientIp(req) || '127.0.0.1';
  const agent = useragent.parse(req.headers['user-agent']);
  return {
    ipAddress: ip,
    browserInfo: agent.toAgent(),
    deviceInfo: agent.os.toString(),
  };
};

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// @desc    Register a guest user (Sends OTP)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, username, email, password, mobileNumber, country } = req.body;

    // Block admin email registration
    if (email === process.env.ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        error: { message: 'Cannot register with this email.', code: 'ADMIN_EMAIL_BLOCKED' },
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user && user.is_verified) {
      return res.status(400).json({
        success: false,
        error: { message: 'User already exists with this email', code: 'USER_ALREADY_EXISTS' },
      });
    }

    // Check if username is taken
    const usernameExists = await User.findOne({ username });
    if (usernameExists && usernameExists.email !== email) {
      return res.status(400).json({
        success: false,
        error: { message: 'Username is already taken', code: 'USERNAME_TAKEN' },
      });
    }

    const metadata = getClientMetadata(req);

    if (user) {
      // Overwrite unverified user
      user.name = name;
      user.username = username;
      user.password = password;
      user.mobileNumber = mobileNumber;
      user.country = country;
      Object.assign(user, metadata);
      await user.save();
    } else {
      user = await User.create({
        name,
        username,
        email,
        password,
        mobileNumber,
        country,
        is_verified: false,
        ...metadata,
      });
    }

    // Handle OTP Rate Limiting
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let otpRecord = await OTPVerification.findOne({ email, type: 'signup' });

    if (otpRecord) {
      if (otpRecord.resend_count >= 3 && otpRecord.last_request_at > twentyFourHoursAgo) {
        return res.status(429).json({
          success: false,
          error: { message: 'Maximum OTP requests reached. Please try again after 24 hours.', code: 'OTP_RATE_LIMIT' },
        });
      }
      if (otpRecord.last_request_at <= twentyFourHoursAgo) {
        otpRecord.resend_count = 0;
      }
    } else {
      otpRecord = new OTPVerification({ email, type: 'signup' });
    }

    const otp = generateOTP();
    const salt = await bcrypt.genSalt(10);
    const otp_hash = await bcrypt.hash(otp, salt);

    otpRecord.otp_hash = otp_hash;
    otpRecord.expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    otpRecord.attempts = 0;
    otpRecord.resend_count += 1;
    otpRecord.last_request_at = Date.now();
    await otpRecord.save();

    const isSent = await sendSignupOTPEmail(email, name, otp);

    if (!isSent) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to send OTP email. Please ensure your Brevo configuration is correct.', code: 'EMAIL_SEND_FAILED' }
      });
    }

    res.status(200).json({
      success: true,
      data: { message: 'OTP sent successfully to your email.' }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: { message: 'Username or email already exists', code: 'DUPLICATE_KEY' },
      });
    }
    next(error);
  }
};

// @desc    Verify Signup OTP
// @route   POST /api/auth/verify-signup
// @access  Public
const verifySignupOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await OTPVerification.findOne({ email, type: 'signup' });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: { message: 'OTP verification failed.', code: 'OTP_FAILED' },
      });
    }

    if (otpRecord.attempts >= 5 || otpRecord.expires_at < new Date()) {
      return res.status(400).json({
        success: false,
        error: { message: 'OTP verification failed.', code: 'OTP_FAILED' },
      });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp_hash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        error: { message: 'OTP verification failed.', code: 'OTP_FAILED' },
      });
    }

    await OTPVerification.deleteOne({ _id: otpRecord._id });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: { message: 'User not found.', code: 'USER_NOT_FOUND' },
      });
    }

    user.is_verified = true;
    await user.save();

    await sendTokenResponse(user, 201, res, req);
  } catch (error) {
    next(error);
  }
};


// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
      });
    }

    // Check status
    if (user.status === 'banned') {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
      });
    }
    
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        error: { message: 'Please verify your email address first.', code: 'UNVERIFIED_EMAIL' },
      });
    }

    // Check password
    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
      });
    }

    const metadata = getClientMetadata(req);

    // Update login status and metadata
    user.lastLoginAt = Date.now();
    user.browserInfo = metadata.browserInfo;
    user.deviceInfo = metadata.deviceInfo;
    user.ipAddress = metadata.ipAddress;
    await user.save();

    await sendTokenResponse(user, 200, res, req);
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    const successRes = () => res.status(200).json({
      success: true,
      data: { message: 'If an account with that email exists, an OTP has been sent.' }
    });

    const user = await User.findOne({ email });
    if (!user || !user.is_verified) {
      return successRes();
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let otpRecord = await OTPVerification.findOne({ email, type: 'forgot_password' });

    if (otpRecord) {
      if (otpRecord.resend_count >= 3 && otpRecord.last_request_at > twentyFourHoursAgo) {
        return res.status(429).json({
          success: false,
          error: { message: 'Maximum OTP requests reached. Please try again after 24 hours.', code: 'OTP_RATE_LIMIT' },
        });
      }
      if (otpRecord.last_request_at <= twentyFourHoursAgo) {
        otpRecord.resend_count = 0;
      }
    } else {
      otpRecord = new OTPVerification({ email, type: 'forgot_password' });
    }

    const otp = generateOTP();
    const salt = await bcrypt.genSalt(10);
    const otp_hash = await bcrypt.hash(otp, salt);

    otpRecord.otp_hash = otp_hash;
    otpRecord.expires_at = new Date(Date.now() + 10 * 60 * 1000);
    otpRecord.attempts = 0;
    otpRecord.resend_count += 1;
    otpRecord.last_request_at = Date.now();
    await otpRecord.save();

    const isSent = await sendPasswordResetOTPEmail(email, otp);

    if (!isSent) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to send OTP email. Please ensure your Brevo configuration is correct.', code: 'EMAIL_SEND_FAILED' }
      });
    }

    return successRes();
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Reset OTP and Change Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;

    const otpRecord = await OTPVerification.findOne({ email, type: 'forgot_password' });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: { message: 'OTP verification failed.', code: 'OTP_FAILED' },
      });
    }

    if (otpRecord.attempts >= 5 || otpRecord.expires_at < new Date()) {
      return res.status(400).json({
        success: false,
        error: { message: 'OTP verification failed.', code: 'OTP_FAILED' },
      });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp_hash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        error: { message: 'OTP verification failed.', code: 'OTP_FAILED' },
      });
    }

    await OTPVerification.deleteOne({ _id: otpRecord._id });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: { message: 'OTP verification failed.', code: 'OTP_FAILED' },
      });
    }

    user.password = password;
    await user.save();

    const Session = require('../models/Session');
    await Session.deleteMany({ user: user._id });

    res.status(200).json({
      success: true,
      data: { message: 'Password has been reset successfully. Please login with your new password.' }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google login or verification
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res, next) => {
  try {
    const { token, mockProfile } = req.body;
    let name, email, googleId, profileImage;

    const metadata = getClientMetadata(req);

    if (!token) {
      return res.status(400).json({
        success: false,
        error: { message: 'Google Token is required', code: 'TOKEN_REQUIRED' },
      });
    }

    try {
      // The frontend uses useGoogleLogin which provides an access_token.
      // We fetch the user's profile from Google using this token.
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user profile from Google');
      }

      const payload = await response.json();

      name = payload.name;
      email = payload.email;
      googleId = payload.sub;
      profileImage = payload.picture;
    } catch (err) {
      console.error('Google Auth Error:', err);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to verify Google token with OAuth endpoints', code: 'OAUTH_VERIFY_FAILED' },
      });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (user) {
      // Check status
      if (user.status === 'banned') {
        return res.status(403).json({
          success: false,
          error: { message: 'Your account has been banned.', code: 'USER_BANNED' },
        });
      }
      if (user.status === 'suspended') {
        return res.status(403).json({
          success: false,
          error: { message: 'Your account has been suspended.', code: 'USER_SUSPENDED' },
        });
      }

      // Update fields if they weren't set
      if (!user.googleId) user.googleId = googleId;
      user.lastLoginAt = Date.now();
      user.browserInfo = metadata.browserInfo;
      user.deviceInfo = metadata.deviceInfo;
      user.ipAddress = metadata.ipAddress;
      await user.save();
      
      await sendTokenResponse(user, 200, res, req);
    } else {
      // Return data for frontend to complete registration
      return res.status(200).json({
        success: true,
        isNewUser: true,
        data: {
          name,
          email,
          googleId,
          profileImage
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Complete Google Registration
// @route   POST /api/auth/google-register
// @access  Public
const registerGoogle = async (req, res, next) => {
  try {
    const { name, email, googleId, profileImage, username, mobileNumber, country } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        error: { message: 'User already exists', code: 'USER_EXISTS' },
      });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        error: { message: 'Username is already taken', code: 'USERNAME_TAKEN' },
      });
    }

    const metadata = getClientMetadata(req);

    user = await User.create({
      name,
      email,
      googleId,
      profileImage,
      username,
      mobileNumber,
      country,
      is_verified: true, // Auto verify since it's from Google
      ...metadata,
    });

    await sendTokenResponse(user, 201, res, req);
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Refresh token not found', code: 'REFRESH_TOKEN_NOT_FOUND' },
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' },
      });
    }

    // Verify session in DB
    const Session = require('../models/Session');
    const session = await Session.findOne({ refreshToken: token });
    if (!session) {
      return res.status(401).json({
        success: false,
        error: { message: 'Session expired or invalidated', code: 'SESSION_INVALID' },
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found', code: 'USER_NOT_FOUND' },
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: { message: 'Your account is suspended or banned', code: 'ACCOUNT_INACTIVE' },
      });
    }

    // Refresh Token Rotation: invalidate old, issue new
    await Session.deleteOne({ _id: session._id });
    await sendTokenResponse(user, 200, res, req);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      const Session = require('../models/Session');
      await Session.findOneAndDelete({ refreshToken: token });
    }

    res.cookie('refreshToken', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifySignupOTP,
  forgotPassword,
  resetPassword,
  login,
  googleLogin,
  registerGoogle,
  refreshToken,
  logout,
};
