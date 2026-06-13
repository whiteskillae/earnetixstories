# Earnetix Blogs Architecture

## Overview
Earnetix Blogs is a full-stack web application built on the MERN stack (MongoDB, Express, React, Node.js). It serves as a modern publishing platform where authors can write, edit, and publish rich-text articles, and readers can discover, read, and discuss them. 

The architecture is designed to be highly responsive, scalable, and search-engine optimized, incorporating dynamic React applications with a RESTful Express API backend.

## Tech Stack
### Frontend
- **React.js**: A progressive component-based UI library.
- **Vite**: Ultra-fast build tool and development server.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI styling.
- **Framer Motion**: Production-ready animation library for React used for micro-interactions and page transitions.
- **React Router**: Client-side routing.
- **Axios**: HTTP client for API requests.
- **TipTap**: A headless, framework-agnostic rich-text editor based on ProseMirror.
- **React Helmet Async**: Document head manager for dynamic SEO metadata generation.

### Backend
- **Node.js & Express.js**: Server-side runtime and framework for building REST APIs.
- **MongoDB & Mongoose**: NoSQL database for flexible schemas and ODM for modeling application data.
- **JWT**: JSON Web Tokens for stateless authentication.
- **Multer**: Middleware for handling `multipart/form-data` (file uploads).
- **Nodemailer**: Email sending service for OTP verification and password resets.

## High-Level Architecture Diagram
```mermaid
graph TD
    Client[Web Browser / Client App]
    subgraph Frontend [React Frontend (Vite)]
        Router[React Router]
        Context[Auth Context]
        Pages[Pages & Components]
        Services[Axios Interceptors]
    end
    
    subgraph Backend [Express API]
        Middleware[Auth, Rate Limit, Error Handling]
        Controllers[Business Logic]
        Models[Mongoose Schemas]
    end
    
    Database[(MongoDB)]
    CloudStorage[Local/Cloud File Storage]
    
    Client <-->|HTTPS / REST| Frontend
    Frontend <-->|API Calls| Backend
    Backend <-->|Mongoose queries| Database
    Backend <-->|Multer file upload| CloudStorage
```

## Security
- **Rate Limiting**: Custom limits on authentication routes using `express-rate-limit` to prevent brute force.
- **CORS**: Configured in Express to restrict access to trusted origins.
- **JWT Handling**: Short-lived Access Tokens are stored in memory/localStorage, while Refresh Tokens handle session persistence securely.
- **Input Sanitization**: Client-side with `DOMPurify` to prevent XSS attacks when rendering HTML content from the TipTap editor. Backend validation using custom middleware.
