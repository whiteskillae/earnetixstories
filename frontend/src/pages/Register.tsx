import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useForm, Controller } from 'react-hook-form';
import { Mail, Lock, User, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import { OTPInput } from '../components/auth/OTPInput';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import Select from 'react-select';
import countryList from 'react-select-country-list';

export const Register: React.FC = () => {
  const { register: registerUser, verifySignup, loginWithGoogle, registerGoogle } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // OTP Flow State
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Google Incomplete Profile Flow
  const [isGoogleStep, setIsGoogleStep] = useState(false);
  const [googleData, setGoogleData] = useState<any>(null);

  const options = useMemo(() => countryList().getData(), []);

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      username: '',
      email: '',
      mobileNumber: '',
      country: null as any,
      password: '',
      confirmPassword: '',
    }
  });

  const passwordValue = watch('password');

  // Password Strength Logic
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return { score: 0, text: '', color: 'bg-slate-200' };
    if (pass.length > 8) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score, text: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score, text: 'Fair', color: 'bg-yellow-500' };
    if (score === 3) return { score, text: 'Good', color: 'bg-blue-500' };
    return { score, text: 'Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setServerError(null);
    try {
      if (isGoogleStep) {
        await registerGoogle({
          name: googleData.name,
          email: googleData.email,
          googleId: googleData.googleId,
          profileImage: googleData.profileImage,
          username: data.username,
          mobileNumber: data.mobileNumber || '',
          country: data.country?.label || ''
        });
        navigate('/');
      } else {
        await registerUser({
          name: data.name,
          username: data.username,
          email: data.email,
          password: data.password,
          mobileNumber: data.mobileNumber || '',
          country: data.country?.label || ''
        });
        setRegisteredEmail(data.email);
        setIsOtpStep(true);
      }
    } catch (err: any) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpComplete = async (otp: string) => {
    setIsLoading(true);
    setServerError(null);
    try {
      await verifySignup(registeredEmail, otp);
      navigate('/');
    } catch (err: any) {
      setServerError(err.message || 'OTP Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setServerError(null);
      try {
        const res = await loginWithGoogle(tokenResponse.access_token);
        if (res.isNewUser) {
          setGoogleData(res.data);
          setIsGoogleStep(true);
        } else {
          navigate('/');
        }
      } catch (err: any) {
        setServerError(err.message || 'Google Auth failed.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setServerError('Google Registration Failed');
    }
  });

  return (
    <div className="flex min-h-[85vh] items-center justify-center py-6 sm:py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white border border-slate-100 rounded-2xl p-8 shadow-xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            {isOtpStep ? 'Verify your email' : isGoogleStep ? 'Complete Profile' : 'Create account'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {isOtpStep 
              ? `We sent a code to ${registeredEmail}` 
              : isGoogleStep 
                ? 'Just a few more details to complete your Google registration'
                : 'Start writing and connecting with authors worldwide'
            }
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

        <AnimatePresence mode="wait">
          {isOtpStep ? (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <OTPInput onComplete={handleOtpComplete} isLoading={isLoading} />
              
              <div className="text-center mt-6">
                <p className="text-sm text-slate-500">
                  Didn't receive the code?{' '}
                  <button 
                    type="button" 
                    className="text-brand-500 font-semibold hover:text-brand-600"
                    disabled={isLoading}
                    onClick={() => {
                      onSubmit(watch());
                    }}
                  >
                    Resend
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => setIsOtpStep(false)}
                  className="mt-4 text-sm text-slate-400 hover:text-slate-600"
                >
                  Change email address
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="register-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {!isGoogleStep && (
                <>
                  <button
                    onClick={() => handleGoogleLogin()}
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 15 0 12 0 7.35 0 3.37 2.67 1.48 6.56l3.87 3a7.18 7.18 0 0 1 6.65-4.52z"/>
                      <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46a5.53 5.53 0 0 1-2.4 3.62v3h3.87c2.26-2.08 3.56-5.14 3.56-8.77z"/>
                      <path fill="#FBBC05" d="M5.35 14.56a7.16 7.16 0 0 1 0-5.12l-3.87-3A11.96 11.96 0 0 0 0 12c0 2.05.52 4 1.48 5.72l3.87-3.16z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.87-3a7.18 7.18 0 0 1-10.74-3.92l-3.87 3A11.96 11.96 0 0 0 12 24z"/>
                    </svg>
                    Register with Google
                  </button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-3 text-slate-400 font-semibold">Or fill details</span>
                    </div>
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {!isGoogleStep && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="John Doe"
                          {...register('name', { required: 'Name is required' })}
                          className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                        />
                      </div>
                      {errors.name && <span className="text-xs text-red-500 mt-1 block font-medium">{errors.name?.message as string}</span>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          placeholder="john@example.com"
                          {...register('email', { 
                            required: 'Email is required',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Invalid email address'
                            }
                          })}
                          className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                        />
                      </div>
                      {errors.email && <span className="text-xs text-red-500 mt-1 block font-medium">{errors.email?.message as string}</span>}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="johndoe"
                        {...register('username', { 
                          required: 'Username is required',
                          pattern: {
                            value: /^[a-zA-Z0-9_]{3,20}$/,
                            message: '3-20 chars. Letters, numbers, and underscores only.'
                          }
                        })}
                        className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                      />
                    </div>
                    {errors.username && <span className="text-xs text-red-500 mt-1 block font-medium">{errors.username?.message as string}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <Controller
                      name="mobileNumber"
                      control={control}
                      rules={{
                        validate: (value) => {
                          if (value && value.length < 5) return 'Mobile number cannot be empty if provided';
                          return true;
                        }
                      }}
                      render={({ field: { onChange, value } }) => (
                        <PhoneInput
                          placeholder="Enter phone number"
                          value={value}
                          onChange={onChange}
                          className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm text-slate-800 placeholder-slate-400 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 outline-none transition-colors"
                        />
                      )}
                    />
                    {errors.mobileNumber && <span className="text-xs text-red-500 mt-1 block font-medium">{errors.mobileNumber?.message as string}</span>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Country <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <Controller
                      name="country"
                      control={control}
                      rules={{
                        validate: (value) => {
                          if (watch('mobileNumber') && !value) return 'Country cannot be empty if provided';
                          return true;
                        }
                      }}
                      render={({ field }) => (
                        <Select
                          {...field}
                          options={options}
                          className="text-sm rounded-xl"
                          classNames={{
                            control: (state) =>
                              state.isFocused ? 'border-brand-500 ring-1 ring-brand-500 rounded-xl' : 'border-slate-200 rounded-xl',
                          }}
                        />
                      )}
                    />
                    {errors.country && <span className="text-xs text-red-500 mt-1 block font-medium">{errors.country?.message as string}</span>}
                  </div>
                </div>

                {!isGoogleStep && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Minimum 8 characters"
                          {...register('password', { 
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
                      {passwordValue && (
                        <div className="mt-2">
                          <div className="flex gap-1 mb-1">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className={`h-1.5 w-full rounded-full ${strength.score >= i ? strength.color : 'bg-slate-200'}`} />
                            ))}
                          </div>
                          <span className="text-xs text-slate-500 font-medium">{strength.text} password</span>
                        </div>
                      )}
                      {errors.password && <span className="text-xs text-red-500 mt-1 block font-medium">{errors.password?.message as string}</span>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm password"
                          {...register('confirmPassword', { 
                            required: 'Please confirm your password',
                            validate: val => {
                              if (watch('password') != val) {
                                return "Your passwords do no match";
                              }
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
                      {errors.confirmPassword && <span className="text-xs text-red-500 mt-1 block font-medium">{errors.confirmPassword?.message as string}</span>}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/10 mt-6"
                >
                  {isLoading ? 'Processing...' : 'Continue'}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              {!isGoogleStep && (
                <p className="text-center text-sm text-slate-500 mt-6">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-brand-500 hover:text-brand-600">
                    Log in instead
                  </Link>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
