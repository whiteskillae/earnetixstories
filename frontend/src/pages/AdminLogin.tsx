import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { Shield, Lock, Mail, AlertOctagon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminLogin: React.FC = () => {
  const { adminLogin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await adminLogin(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Invalid admin credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-600 via-slate-900 to-slate-900"></div>

      <div className="relative z-10 max-w-md w-full space-y-8 bg-slate-800/80 backdrop-blur-2xl p-10 rounded-3xl border border-slate-700 shadow-2xl">
        <Link to="/" className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        
        <div className="text-center pt-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-500/20 mb-4 ring-8 ring-slate-800">
            <Shield className="h-10 w-10 text-brand-500" />
          </div>
          <h2 className="text-3xl font-display font-black tracking-tight text-white">
            Admin Verification
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Enter your secure credentials to access the moderation console.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errorMsg && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-400 text-sm font-medium">
              <AlertOctagon className="h-5 w-5 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Admin Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-slate-600 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all sm:text-sm"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Secure Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-slate-600 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all sm:text-sm"
                  placeholder="••••••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 focus:ring-offset-slate-900 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-70"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Verify & Access Console'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
