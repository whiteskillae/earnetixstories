import React from 'react';
import { Helmet } from 'react-helmet-async';

export const Agreement: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <Helmet>
        <title>User Agreement - Earnetix Blogs</title>
        <meta name="description" content="User Agreement for Earnetix Blogs." />
      </Helmet>
      
      <h1 className="text-4xl font-display font-black text-slate-900 mb-6 tracking-tight">User Agreement</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="prose prose-slate max-w-none text-slate-700 space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">1. General Agreement</h2>
          <p>This User Agreement constitutes a binding contract between you and Earnetix Blogs. By registering an account, you agree to comply with all platform rules, including our Privacy Policy, Terms of Service, and Copyright rules.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Account Responsibility</h2>
          <p>You are responsible for safeguarding the password that you use to access the Platform and for any activities or actions under your password. We encourage you to use "strong" passwords (passwords that use a combination of upper and lower case letters, numbers and symbols) with your account.</p>
        </section>
      </div>
    </div>
  );
};
