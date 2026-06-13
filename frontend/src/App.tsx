import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { Home } from './pages/Home';
import { BlogDetail } from './pages/BlogDetail';
import { Write } from './pages/Write';
import { Bookmarks } from './pages/Bookmarks';
import { Profile } from './pages/Profile';
import { Categories } from './pages/Categories';
import { Search } from './pages/Search';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { PrivacyPolicy } from './pages/legal/PrivacyPolicy';
import { TermsOfService } from './pages/legal/TermsOfService';
import { Rights } from './pages/legal/Rights';
import { Agreement } from './pages/legal/Agreement';
import { Admin } from './pages/Admin';
import { AdminLogin } from './pages/AdminLogin';
import { AdminLayout } from './layouts/AdminLayout';

// Route Guard for logged in users
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Strict Route Guard for Admins
const StrictAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdminAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return isAdminAuthenticated ? <>{children}</> : <AdminLogin />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes with MainLayout */}
      <Route
        path="/"
        element={
          <MainLayout>
            <Home />
          </MainLayout>
        }
      />
      <Route
        path="/blog/:slug"
        element={
          <MainLayout>
            <BlogDetail />
          </MainLayout>
        }
      />
      <Route
        path="/categories"
        element={
          <MainLayout>
            <Categories />
          </MainLayout>
        }
      />
      <Route
        path="/search"
        element={
          <MainLayout>
            <Search />
          </MainLayout>
        }
      />

      {/* Legal Pages */}
      <Route
        path="/legal/privacy-policy"
        element={
          <MainLayout>
            <PrivacyPolicy />
          </MainLayout>
        }
      />
      <Route
        path="/legal/terms-of-service"
        element={
          <MainLayout>
            <TermsOfService />
          </MainLayout>
        }
      />
      <Route
        path="/legal/rights"
        element={
          <MainLayout>
            <Rights />
          </MainLayout>
        }
      />
      <Route
        path="/legal/agreement"
        element={
          <MainLayout>
            <Agreement />
          </MainLayout>
        }
      />

      {/* Auth Pages (Redirect to home if already logged in) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected Routes */}
      <Route
        path="/write"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Write />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/write/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Write />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookmarks"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Bookmarks />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Profile />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Strict Admin Route */}
      <Route
        path="/admin"
        element={
          <StrictAdminRoute>
            <AdminLayout>
              <Admin />
            </AdminLayout>
          </StrictAdminRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster position="top-center" />
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
