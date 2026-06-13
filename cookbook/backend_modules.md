# Earnetix Blogs - Backend Modules

## Directory Structure
```
backend/
├── src/
│   ├── controllers/      # Route handlers housing business logic
│   ├── middlewares/      # Express middleware functions
│   ├── models/           # Mongoose schemas representing DB collections
│   ├── routes/           # Express router definitions
│   ├── services/         # Reusable third-party integrations (e.g. email)
│   ├── utils/            # Helper functions and utilities
│   ├── validators/       # Request validation logic
│   └── app.js            # Express app instantiation
```

## Key Modules & Responsibilities

### 1. Controllers (`controllers/`)
Controllers handle the core business logic of the application. They receive the `req` and `res` objects from the router, process the request, interact with the models, and return a JSON response.
- **authController.js**: Handles user registration, Google OAuth, OTP verification, login, logout, password resets, and token refresh.
- **blogController.js**: Manages CRUD operations for blog posts, fetching feeds (trending, recommended, following), handling file uploads via Multer, and managing comments and likes.
- **categoryController.js**: Simple CRUD operations for content categories.
- **sitemapController.js**: Dynamically generates `sitemap.xml` for SEO indexing.

### 2. Models (`models/`)
Mongoose schemas define the structure and validation of the MongoDB documents.
- **User.js**: Stores user credentials, profile information, follower/following lists, and metadata (IP, device info).
- **OTP.js**: A TTL (Time-To-Live) indexed model used exclusively for storing temporary OTP codes during the signup phase. Documents automatically expire and delete themselves after a set time.
- **Blog.js**: Stores the rich-text content, title, excerpt, SEO metadata, and associations to the author and category.
- **Comment.js**: Implements a threaded commenting system using a `parentComment` reference structure.

### 3. Middlewares (`middlewares/`)
- **auth.js (`protect`, `authorize`)**: Verifies the JWT sent in the `Authorization` header. If valid, it attaches the `user` object to the `req` object. `authorize` checks for specific roles (e.g., 'admin').
- **error.js**: A centralized error handling middleware that catches all `next(error)` calls, formats the error response consistently, and handles Mongoose-specific errors (CastError, ValidationError, Duplicate Key).
- **upload.js**: Configures Multer for handling multipart form data. It filters by file type (images only) and manages destination paths.

### 4. OTP Verification Flow
The backend uses a two-step registration process to ensure valid emails:
1. `POST /api/auth/register`: Creates an inactive `User` entry and an `OTP` entry. Sends an email containing the 6-digit OTP.
2. `POST /api/auth/verify-signup`: Receives the OTP. If it matches the record in the `OTP` collection (and hasn't expired), it sets the `User` to `is_verified: true` and generates auth tokens.
