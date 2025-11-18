'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Invalid email or password');
        setLoading(false);
        return;
      }

      if (data.user) {
        // Redirect to dashboard
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <Link href="/" className="flex justify-center items-center mb-4 sm:mb-6">
            <img
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
            Welcome back
          </h2>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            Sign in to access your restaurant dashboard
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-6 sm:mt-8 space-y-5 sm:space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
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

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#080c24] focus:border-transparent placeholder:text-gray-400 text-gray-900 bg-white"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <div className="text-sm">
              <Link href="/auth/forgot-password" className="font-medium text-[#080c24] hover:opacity-80">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-base sm:text-sm bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="text-center text-xs sm:text-sm text-gray-600 px-2">
            Don&apos;t have an account?{' '}
            <Link href="/#contact" className="font-medium text-[#080c24] hover:opacity-80">
              Contact us
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

