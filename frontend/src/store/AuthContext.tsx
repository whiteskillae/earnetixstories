import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  profileImage: string;
  mobileNumber?: string;
  country?: string;
  bio?: string;
  role?: string;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  profileImage: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  adminUser: AdminUser | null;
  adminToken: string | null;
  isAdminAuthenticated: boolean;

  isLoading: boolean;
  
  // User Methods
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  verifySignup: (email: string, otp: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<any>;
  registerGoogle: (formData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;

  // Admin Methods
  adminLogin: (email: string, password: string) => Promise<void>;
  adminLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Standard User State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  
  // Admin State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('adminToken'));

  const [isLoading, setIsLoading] = useState(true);

  // Initialize Both Auth Sessions
  useEffect(() => {
    const initializeAuth = async () => {
      // 1. Initialize User
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await api.get('/users/profile');
          setUser(response.data.data);
          setToken(storedToken);
        } catch (error) {
          try {
            const refreshRes = await api.post('/auth/refresh-token');
            localStorage.setItem('token', refreshRes.data.accessToken);
            setToken(refreshRes.data.accessToken);
            setUser(refreshRes.data.user);
          } catch (e) {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          }
        }
      } else {
        try {
          const refreshRes = await api.post('/auth/refresh-token');
          localStorage.setItem('token', refreshRes.data.accessToken);
          setToken(refreshRes.data.accessToken);
          setUser(refreshRes.data.user);
        } catch (e) {
          setUser(null);
          setToken(null);
        }
      }

      // 2. Initialize Admin
      const storedAdminToken = localStorage.getItem('adminToken');
      if (storedAdminToken) {
        try {
          const response = await api.get('/admin-auth/profile', {
            headers: { Authorization: `Bearer ${storedAdminToken}` }
          });
          setAdminUser(response.data.data);
          setAdminToken(storedAdminToken);
        } catch (error) {
          localStorage.removeItem('adminToken');
          setAdminToken(null);
          setAdminUser(null);
        }
      }

      setIsLoading(false);
    };

    initializeAuth();

    const handleLogoutEvent = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  // Set up an interceptor specifically for admin requests to use admin token
  useEffect(() => {
    const adminInterceptor = api.interceptors.request.use(
      (config) => {
        if (config.url?.startsWith('/admin') || config.url?.startsWith('/admin-auth')) {
          const currentAdminToken = localStorage.getItem('adminToken');
          if (currentAdminToken) {
            config.headers['Authorization'] = `Bearer ${currentAdminToken}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      api.interceptors.request.eject(adminInterceptor);
    };
  }, []);


  // --- USER METHODS ---
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, user: loggedUser } = response.data;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      setUser(loggedUser);
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (formData: any) => {
    setIsLoading(true);
    try {
      await api.post('/auth/register', formData);
      // No longer sets token here, just initiates OTP flow
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const verifySignup = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-signup', { email, otp });
      const { accessToken, user: loggedUser } = response.data;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      setUser(loggedUser);
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (googleToken: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/google', { token: googleToken });
      
      if (response.data.isNewUser) {
        return response.data;
      }
      
      const { accessToken, user: loggedUser } = response.data;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      setUser(loggedUser);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Google Auth failed');
    } finally {
      setIsLoading(false);
    }
  };

  const registerGoogle = async (formData: any) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/google-register', formData);
      const { accessToken, user: loggedUser } = response.data;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      setUser(loggedUser);
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Google Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updatedFields });
    }
  };

  // --- ADMIN METHODS ---
  const adminLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/admin-auth/login', { email, password });
      const { token, admin } = response.data.data;
      localStorage.setItem('adminToken', token);
      setAdminToken(token);
      setAdminUser(admin);
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Admin login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogout = async () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setAdminUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    adminUser,
    adminToken,
    isAdminAuthenticated: !!adminUser,
    isLoading,
    login,
    register,
    verifySignup,
    loginWithGoogle,
    registerGoogle,
    logout,
    updateUser,
    adminLogin,
    adminLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
