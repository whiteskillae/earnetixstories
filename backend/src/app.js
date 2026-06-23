const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const connectDB = require('./config/db');
const { globalBotLimiter } = require('./middlewares/rateLimiters');
const trafficLogger = require('./middlewares/trafficLogger');
const errorHandler = require('./middlewares/errorHandler');
const { initScheduler } = require('./utils/scheduler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Dev logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Compression middleware for efficiency
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' })); // Higher limit for Base64 rich text images if drag-and-dropped
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Sanitize data (NoSQL injection protection)
app.use(mongoSanitize());

// Set security headers
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// Enable CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000', 'https://earnetixstories.com', 'https://www.earnetixstories.com'];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// Set trust proxy so request-ip parses correct IP behind Nginx/Render
app.set('trust proxy', 1);

// Apply Global Rate Limiting for bots
app.use(globalBotLimiter);

// Global Traffic Logger (After body parser so req is intact)
app.use('/api', trafficLogger);

// Rate limiting (General API)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Static assets (local uploads fallback)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const userRoutes = require('./routes/userRoutes');
const blogRoutes = require('./routes/blogRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const announcementRoutes = require('./routes/announcementRoutes');

const sitemapRoutes = require('./routes/sitemapRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin-auth', adminAuthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api', sitemapRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Blogging Platform API is running.' });
});

// 404 Route
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: { message: 'Requested API endpoint not found', code: 'ENDPOINT_NOT_FOUND' },
  });
});

// Global Error Handler
app.use(errorHandler);

// Start scheduler
initScheduler();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
