import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useForm } from 'react-hook-form';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';

export const Login: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setServerError(null);
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err: any) {
      setServerError(err.message || 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setServerError(null);
      try {
        const result = await loginWithGoogle(tokenResponse.access_token);
        if (result?.isNewUser) {
          setServerError('Account not found. Please create an account first.');
        } else {
          navigate('/');
        }
      } catch (err: any) {
        setServerError(err.message || 'Google OAuth failed.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setServerError('Google Login Failed');
    }
  });

  return (
    <div className="flex min-h-[75vh] items-center justify-center py-6 sm:py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 shadow-xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Log in to continue sharing your stories
          </p>
        </div>

        {serverError && (
          <motion.div 
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{serverError}</p>
          </motion.div>
        )}

        {/* Social Google Login Button */}
        <button
          onClick={() => handleGoogleLogin()}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          {/* Simple custom Google logo SVG */}
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 15 0 12 0 7.35 0 3.37 2.67 1.48 6.56l3.87 3a7.18 7.18 0 0 1 6.65-4.52z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46a5.53 5.53 0 0 1-2.4 3.62v3h3.87c2.26-2.08 3.56-5.14 3.56-8.77z"
            />
            <path
              fill="#FBBC05"
              d="M5.35 14.56a7.16 7.16 0 0 1 0-5.12l-3.87-3A11.96 11.96 0 0 0 0 12c0 2.05.52 4 1.48 5.72l3.87-3.16z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.87-3a7.18 7.18 0 0 1-10.74-3.92l-3.87 3A11.96 11.96 0 0 0 12 24z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-semibold">Or email login</span>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="email"
                placeholder="you@example.com"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
              />
            </div>
            {errors.email && (
              <span className="text-xs text-red-500 mt-1 block font-medium">{errors.email.message}</span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs font-semibold text-brand-500 hover:text-brand-600">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                {...register('password', { 
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
              />
            </div>
            {errors.password && (
              <span className="text-xs text-red-500 mt-1 block font-medium">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/10"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          New to Earnetix Blogs?{' '}
          <Link to="/register" className="font-semibold text-brand-500 hover:text-brand-600">
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
};
