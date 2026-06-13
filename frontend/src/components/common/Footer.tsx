import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="bg-brand-500 text-white p-1.5 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <span className="font-display font-black text-xl tracking-tight text-slate-900">
                Earnetix<span className="text-brand-500">Blogs</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500">
              Discover stories, thinking, and expertise from writers on any topic. 
              The most reliable platform for modern readers and authors.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold text-slate-900 mb-4 uppercase text-xs tracking-wider">Explore</h3>
            <ul className="space-y-3">
              <li><Link to="/categories" className="text-sm text-slate-500 hover:text-brand-500 transition-colors">Categories</Link></li>
              <li><Link to="/search" className="text-sm text-slate-500 hover:text-brand-500 transition-colors">Search Content</Link></li>
              <li><Link to="/write" className="text-sm text-slate-500 hover:text-brand-500 transition-colors">Start Writing</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-4 uppercase text-xs tracking-wider">Legal & Compliance</h3>
            <ul className="space-y-3">
              <li><Link to="/legal/privacy-policy" className="text-sm text-slate-500 hover:text-brand-500 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/legal/terms-of-service" className="text-sm text-slate-500 hover:text-brand-500 transition-colors">Terms of Service</Link></li>
              <li><Link to="/legal/rights" className="text-sm text-slate-500 hover:text-brand-500 transition-colors">Rights & Copyright</Link></li>
              <li><Link to="/legal/agreement" className="text-sm text-slate-500 hover:text-brand-500 transition-colors">User Agreement</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-4 uppercase text-xs tracking-wider">Connect</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-slate-500 hover:text-brand-500 transition-colors">Twitter</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-brand-500 transition-colors">LinkedIn</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-brand-500 transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">
            &copy; {currentYear} Earnetix Blogs. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
