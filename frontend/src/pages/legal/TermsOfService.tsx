import React from 'react';
import { Helmet } from 'react-helmet-async';

export const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <Helmet>
        <title>Terms of Service - Earnetix Blogs</title>
        <meta name="description" content="Read the Terms of Service for using Earnetix Blogs." />
      </Helmet>
      
      <h1 className="text-4xl font-display font-black text-slate-900 mb-6 tracking-tight">Terms of Service</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="prose prose-slate max-w-none text-slate-700 space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
          <p>By accessing or using Earnetix Blogs, you agree to be bound by these Terms. If you don't agree to these Terms, do not use the Platform.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">2. User Content</h2>
          <p>You retain your rights to any content you submit, post or display on or through the Platform. By submitting, posting or displaying content on or through the Platform, you grant us a worldwide, non-exclusive, royalty-free license to use, copy, reproduce, process, adapt, modify, publish, transmit, display and distribute such content.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Prohibited Activities</h2>
          <p>You may not engage in any of the following activities:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Violating laws or our rules.</li>
            <li>Posting spam or promotional content.</li>
            <li>Harassing or threatening other users.</li>
            <li>Impersonating others or providing false information.</li>
            <li>Interfering with the operation of the Platform.</li>
          </ul>
        </section>
      </div>
    </div>
  );
};
