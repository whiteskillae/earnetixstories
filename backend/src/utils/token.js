const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const requestIp = require('request-ip');
const useragent = require('useragent');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

const sendTokenResponse = async (user, statusCode, res, req) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Parse request for Session creation if req is provided
  if (req) {
    const ip = requestIp.getClientIp(req) || '127.0.0.1';
    const agent = useragent.parse(req.headers['user-agent']);
    const deviceInfo = agent.os.toString() + ' - ' + agent.toAgent();

    // Calculate expiration (7 days)
    const expiresAt = new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000);

    await Session.create({
      user: user._id,
      refreshToken,
      deviceInfo,
      ipAddress: ip,
      expiresAt,
    });
  }

  // Set cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: true, // Required for SameSite=none
    sameSite: 'none', // Required to allow cross-origin POST requests for refresh token
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);

  res.status(statusCode).json({
    success: true,
    accessToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      mobileNumber: user.mobileNumber,
      country: user.country,
      bio: user.bio,
    },
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  sendTokenResponse,
};
