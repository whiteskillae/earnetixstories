import React from 'react';
import { Helmet } from 'react-helmet-async';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <Helmet>
        <title>Privacy Policy - Earnetix Blogs</title>
        <meta name="description" content="Learn about how Earnetix Blogs handles and protects your data." />
      </Helmet>
      
      <h1 className="text-4xl font-display font-black text-slate-900 mb-6 tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="prose prose-slate max-w-none text-slate-700 space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
          <p>We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, and other information you choose to provide.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">2. How We Use Information</h2>
          <p>We may use the information we collect from you to:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Provide, maintain, and improve our Services.</li>
            <li>Send you technical notices, updates, security alerts, and support and administrative messages.</li>
            <li>Respond to your comments, questions, and requests and provide customer service.</li>
            <li>Communicate with you about products, services, offers, promotions, rewards, and events offered by Earnetix Blogs and others.</li>
            <li>Monitor and analyze trends, usage, and activities in connection with our Services.</li>
            <li>Detect, investigate and prevent fraudulent transactions and other illegal activities and protect the rights and property of Earnetix Blogs and others.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Sharing of Information</h2>
          <p>We do not share your personal information with third parties except as described in this privacy policy.</p>
        </section>
      </div>
    </div>
  );
};
