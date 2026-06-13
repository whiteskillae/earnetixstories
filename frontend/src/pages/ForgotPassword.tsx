import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OTPInput } from '../components/auth/OTPInput';
import api from '../services/api';

type FlowStep = 'EMAIL' | 'OTP' | 'RESET' | 'SUCCESS';

export const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<FlowStep>('EMAIL');
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register: registerEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors } } = useForm({
    defaultValues: { email: '' }
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, watch, formState: { errors: passwordErrors } } = useForm({
    defaultValues: { password: '', confirmPassword: '' }
  });

  const onEmailSubmit = async (data: any) => {
    setIsLoading(true);
    setServerError(null);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setEmail(data.email);
      setStep('OTP');
    } catch (err: any) {
      setServerError(err.response?.data?.error?.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  const [otpValue, setOtpValue] = useState('');
  const handleOtpComplete = (otp: string) => {
    setOtpValue(otp);
    setStep('RESET'); // Optimistically move to reset, we verify both at once in the API
  };

  const onPasswordSubmit = async (data: any) => {
    setIsLoading(true);
    setServerError(null);
    try {
      await api.post('/auth/reset-password', {
        email,
        otp: otpValue,
        password: data.password
      });
      setStep('SUCCESS');
    } catch (err: any) {
      setServerError(err.response?.data?.error?.message || 'Password reset failed. OTP might be invalid or expired.');
      if (err.response?.data?.error?.code === 'OTP_FAILED') {
        setStep('OTP');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center py-6 sm:py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 shadow-xl"
      >
        <AnimatePresence mode="wait">
          {step === 'EMAIL' && (
            <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Reset Password</h1>
                <p className="text-sm text-slate-500 mt-2">Enter your email to receive a reset code</p>
              </div>

              {serverError && (
                <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{serverError}</p>
                </div>
              )}

              <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      {...registerEmail('email', { 
                        required: 'Email is required',
                        pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' }
                      })}
                      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                    />
                  </div>
                  {emailErrors.email && <span className="text-xs text-red-500 mt-1 block font-medium">{emailErrors.email.message}</span>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/10"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Code'}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'OTP' && (
            <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Verify Code</h1>
                <p className="text-sm text-slate-500 mt-2">We sent a reset code to {email}</p>
              </div>

              {serverError && (
                <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{serverError}</p>
                </div>
              )}

              <OTPInput onComplete={handleOtpComplete} isLoading={isLoading} />
              
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setStep('EMAIL')}
                  className="text-sm text-slate-400 hover:text-slate-600"
                >
                  Change email address
                </button>
              </div>
            </motion.div>
          )}

          {step === 'RESET' && (
            <motion.div key="reset" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">New Password</h1>
                <p className="text-sm text-slate-500 mt-2">Enter your new secure password</p>
              </div>

              {serverError && (
                <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{serverError}</p>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      {...registerPassword('password', { 
                        required: 'Password is required',
                        minLength: { value: 8, message: 'At least 8 characters' },
                        pattern: {
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                          message: 'Must include uppercase, lowercase, number, and special character'
                        }
                      })}
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.password && <span className="text-xs text-red-500 mt-1 block font-medium">{passwordErrors.password.message}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      {...registerPassword('confirmPassword', { 
                        required: 'Please confirm your password',
                        validate: val => {
                          if (watch('password') != val) return "Passwords do not match";
                        }
                      })}
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && <span className="text-xs text-red-500 mt-1 block font-medium">{passwordErrors.confirmPassword.message}</span>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/10 mt-4"
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'SUCCESS' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight mb-2">
                  Password Reset Successfully
                </h1>
                <p className="text-slate-500 mb-8">
                  You can now log in with your new password.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/10"
                >
                  Go to Login
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {step === 'EMAIL' && (
          <p className="text-center text-sm text-slate-500 mt-6">
            Remember your password?{' '}
            <Link to="/login" className="font-semibold text-brand-500 hover:text-brand-600">
              Log in
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
};
