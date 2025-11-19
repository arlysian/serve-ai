'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      // Call our API to send password reset email
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show the detailed error message from the API
        const errorMsg = data.error || data.details || 'Failed to send password reset email';
        console.error('Password reset error:', data);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div className="text-center">
            <Link href="/" className="flex justify-center items-center mb-4 sm:mb-6">
              <Image
                src="/Backgroundless_ServeAI_logo.svg"
                alt="ServeAI Logo"
                width={48}
                height={48}
                className="mr-2 sm:mr-3 w-10 h-10 sm:w-16 sm:h-16"
              />
              <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                ServeAI
              </span>
            </Link>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold text-green-900 mb-2">Check your email</h2>
              <p className="text-green-700 mb-4">
                We&apos;ve sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-green-600">
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </p>
              <div className="mt-6">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-[#080c24] hover:opacity-80"
                >
                  Back to login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <Link href="/" className="flex justify-center items-center mb-4 sm:mb-6">
            <Image
              src="/Backgroundless_ServeAI_logo.svg"
              alt="ServeAI Logo"
              width={48}
              height={48}
              className="mr-2 sm:mr-3 w-10 h-10 sm:w-16 sm:h-16"
            />
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">
              ServeAI
            </span>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Reset your password
          </h2>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            Enter your email address and we&apos;ll send you a link to reset your password
          </p>
        </div>

        {/* Reset Password Form */}
        <form className="mt-6 sm:mt-8 space-y-5 sm:space-y-6" onSubmit={handleResetPassword}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#080c24] focus:border-transparent placeholder:text-gray-400 text-gray-900 bg-white"
              placeholder="your.email@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-base sm:text-sm bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>

          <div className="text-center text-xs sm:text-sm text-gray-600 px-2">
            Remembered your password?{' '}
            <Link href="/auth/login" className="font-medium text-[#080c24] hover:opacity-80">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

