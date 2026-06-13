const requestIp = require('request-ip');
const ApiLog = require('../models/ApiLog');

// Track requests per IP to detect bots in memory
const ipRateMap = new Map();

const trafficLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const ip = requestIp.getClientIp(req) || '127.0.0.1';
    
    // Quick in-memory bot detection (More than 100 reqs in 60s)
    const now = Date.now();
    let isSuspicious = false;
    
    const record = ipRateMap.get(ip) || { count: 0, windowStart: now };
    
    if (now - record.windowStart > 60000) {
      record.count = 1;
      record.windowStart = now;
    } else {
      record.count++;
      if (record.count > 100) {
        isSuspicious = true;
      }
    }
    ipRateMap.set(ip, record);

    // Save async so it doesn't block the response
    const logEntry = new ApiLog({
      ipAddress: ip,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      responseTime: duration,
      userAgent: req.headers['user-agent'] || 'Unknown',
      isSuspicious
    });

    logEntry.save().catch(err => console.error('Failed to save API Log:', err.message));
  });

  next();
};

module.exports = trafficLogger;
