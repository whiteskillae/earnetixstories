# Earnetix Blogs - Frontend Logic

## Directory Structure
```
frontend/
├── src/
│   ├── components/       # Reusable UI components (BlogCard, Layouts, etc.)
│   ├── layouts/          # Wrapper components that define the page structure
│   ├── pages/            # Top-level route components
│   ├── services/         # API integration (Axios configuration)
│   ├── store/            # React Context providers for global state
│   ├── App.tsx           # Application root and routing definition
│   └── index.css         # Global styles and Tailwind directives
```

## Key Modules & Logic

### 1. Global State (`store/AuthContext.tsx`)
`AuthContext` manages the global authentication state of the application. It acts as a single source of truth for the currently logged-in user and their access tokens.
- **Initialization**: On initial load, it checks `localStorage` for a token. If present, it makes a request to `/api/users/profile` to fetch the user details. If the token is expired, it silently attempts to use the `/refresh-token` endpoint.
- **Methods**: Exposes functions like `login`, `register`, `logout`, and `loginWithGoogle` which components can call directly.

### 2. API Service (`services/api.ts`)
A configured Axios instance that handles all outgoing HTTP requests.
- **Interceptors**: 
  - **Request**: Automatically attaches the JWT `Bearer` token to the `Authorization` header of every outgoing request.
  - **Response**: Globally catches 401 Unauthorized errors and can trigger automatic token refresh flows or redirect the user to the login page if their session has fully expired.

### 3. Dynamic Routing & Layouts
- **React Router**: `App.tsx` defines all application routes. 
- **Protected Routes**: A specialized `ProtectedRoute` wrapper component intercepts rendering. If `isAuthenticated` is false, it redirects the user to `/login`.
- **MainLayout**: Wraps the public and protected pages, injecting the `Navbar`, `Footer`, and mobile `BottomNav` so that the core navigation remains consistent across the app.

### 4. UI/UX Elements
- **React Loading Skeleton**: Used extensively in `Home.tsx` and `BlogDetail.tsx` to provide visual feedback (shimmering placeholders) while data is being fetched, improving perceived performance.
- **Framer Motion**: Provides fluid page transitions. Main page components are wrapped in `<motion.div>` with `initial`, `animate`, and `exit` props to create fade and slide effects during route changes.
- **React Hot Toast**: Replaces native `alert()` calls. It provides non-blocking, aesthetically pleasing popup notifications for success, error, and loading states (especially useful during form submissions in `Write.tsx`).

### 5. Google Authentication Integration
The application uses `@react-oauth/google` to provide social login.
1. User clicks "Continue with Google".
2. The library handles the OAuth popup and returns an `access_token`.
3. The frontend sends this token to `POST /api/auth/google`.
4. The backend resolves the token with Google APIs and checks if the user exists.
5. If the user is new, the backend responds with `isNewUser: true`.
6. The frontend captures this and switches the `Register.tsx` view to a "Complete Profile" form, asking for the required `username`, `mobileNumber`, and `country` before submitting the final data to `POST /api/auth/google-register`.
