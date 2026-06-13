# System Architecture - InkFlow Blogging Platform

InkFlow is a production-grade, secure, and fully scalable full-stack blogging platform. This document outlines the key architectural patterns, security designs, and deployment configurations used in the codebase.

---

## 1. High-Level Architecture

InkFlow follows a decoupled client-server architecture:

```
+------------------+             HTTPS / JSON / JWT             +------------------+
|                  | <========================================> |                  |
|  React Client    |                                            |  Express API     |
|  (Vite + TS)     | <========================================> |  (Node.js)       |
|                  |             Cookie Rotation                |                  |
+------------------+                                            +------------------+
         |                                                                |
         v                                                                v
+------------------+                                            +------------------+
|                  |                                            |                  |
| Local Storage    |                                            | MongoDB Database |
| (JWT Access)     |                                            | (Mongoose ODM)   |
|                  |                                            |                  |
+------------------+                                            +------------------+
                                                                          |
                                                                          v
                                                                +------------------+
                                                                |                  |
                                                                | Cloudinary CDN   |
                                                                | (Local Fallback) |
                                                                |                  |
                                                                +------------------+
```

*   **Frontend**: React (TypeScript) configured with Vite for instant hot-module reloading and optimized production bundling. Enforces responsive design, skeleton loading states, and smooth interface animations via Framer Motion.
*   **Backend**: Node.js & Express.js REST API using Mongoose ODM to query MongoDB. Formulated with modular controllers, middlewares, schemas, and routes.
*   **Database**: MongoDB database. Mongoose handles schemas, strong schema-level validations, unique indices, and aggregation pipelines.

---

## 2. Authentication & Token Management

The authentication system employs a secure JWT token rotation scheme to prevent session theft while maintaining a seamless user experience.

### Token Dual-Storage Flow
1.  **Access Token**:
    *   Short-lived JWT (15-minute expiration).
    *   Stored in memory on the client and attached to the outgoing Axios request headers (`Authorization: Bearer <token>`).
2.  **Refresh Token**:
    *   Long-lived JWT (7-day expiration).
    *   Stored in an HTTP-only, secure, `SameSite` cookie (`lax` in development, `strict` in production). This completely mitigates XSS-based session extraction.
3.  **Automatic Session Refresh**:
    *   The frontend Axios client intercepts any failed requests with a `401 Unauthorized` status code.
    *   If the error indicates token expiry, Axios silently makes a `POST /auth/refresh-token` call to obtain a fresh Access Token.
    *   Upon success, it rewrites the authorization header and transparently re-runs the original request.
    *   If the refresh call fails (expired refresh token), the user's session is invalidated, local storage is cleared, and they are redirected to the Login page.

### Google Sign-In & Mock Bypass
To allow easy development in sandbox environments without requiring pre-configured OAuth client credentials, the system implements a dual Google Authentication pipeline:
*   **Live Mode**: Validates the ID token directly with Google's public token verification API endpoints.
*   **Local Mock Mode**: Accepts a mock profile envelope to immediately log in a local test account for UI/UX testing.

---

## 3. Storage & Image Fallback System

All image uploads (avatars, blog cover photos, and inline content editors) flow through Multer parsing middleware to Cloudinary.

If Cloudinary credentials are not present or set to `mock` in the backend environment configuration, the upload handler automatically diverts to the local disk:
*   Files are written to the `/uploads` folder under the project root.
*   Express serves this directory statically via `app.use('/uploads', express.static(...))`.
*   The API returns local URLs mapping to the serving host (e.g. `http://localhost:5000/uploads/file.jpg`).
*   When a post or avatar is deleted, the corresponding file is deleted from either Cloudinary or the local folder, preventing storage leaks.

---

## 4. Security Measures Enforced

1.  **Mongo Sanitization**: Protects against NoSQL query injections by stripping characters starting with `$` and `.` in req payloads.
2.  **Helmet**: Adds critical security headers (Content Security Policy, Clickjacking frameguards, HSTS, X-Content-Type).
3.  **CORS**: Whitelists only approved source domains and enforces credentials transmission.
4.  **Rate Limiter**: Imposes threshold restrictions (200 requests per 15 minutes globally, 10 requests per 15 minutes on Auth registration/login) to mitigate DDoS and credential brute-forcing.
5.  **Data Sanitization**: Comment inputs and rich-text blogs are sanitized on write/render using server-side filters and client-side `DOMPurify` libraries to render HTML blocks safely.
