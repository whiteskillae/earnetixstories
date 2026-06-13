const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.name = err.name; // ensure name is copied over

  // Log to console for dev
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    return res.status(404).json({
      success: false,
      error: { message, code: 'RESOURCE_NOT_FOUND' },
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    return res.status(400).json({
      success: false,
      error: { message, code: 'DUPLICATE_KEY_ERROR' },
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      success: false,
      error: { message, code: 'VALIDATION_ERROR' },
    });
  }

  // Mongoose Buffer Timeout
  if (err.name === 'MongooseError' && err.message.includes('buffering timed out')) {
    return res.status(503).json({
      success: false,
      error: { message: 'Database service is temporarily unavailable. Please try again later.', code: 'SERVICE_UNAVAILABLE' },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: { message: 'Not authorized, invalid token', code: 'INVALID_TOKEN' },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { message: 'Not authorized, token expired', code: 'TOKEN_EXPIRED' },
    });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Server Error',
      code: error.errorCode || 'INTERNAL_SERVER_ERROR',
    },
  });
};

module.exports = errorHandler;
