import React from 'react';
import { Helmet } from 'react-helmet-async';

export const Rights: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <Helmet>
        <title>Rights & Copyright - Earnetix Blogs</title>
        <meta name="description" content="Copyright and intellectual property rights information for Earnetix Blogs." />
      </Helmet>
      
      <h1 className="text-4xl font-display font-black text-slate-900 mb-6 tracking-tight">Rights & Copyright</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="prose prose-slate max-w-none text-slate-700 space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Copyright Policy</h2>
          <p>Earnetix Blogs respects the intellectual property rights of others and expects its users to do the same. It is our policy, in appropriate circumstances and at our discretion, to disable and/or terminate the accounts of users who repeatedly infringe or are repeatedly charged with infringing the copyrights or other intellectual property rights of others.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Author Rights</h2>
          <p>When you publish content on Earnetix Blogs, you remain the copyright owner of your original work. By publishing, you grant us the license outlined in our Terms of Service to display and distribute your work across our platform.</p>
        </section>
      </div>
    </div>
  );
};
