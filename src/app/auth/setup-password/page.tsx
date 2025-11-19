'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SetupPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenExchanged, setTokenExchanged] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Handle Supabase auth callback - tokens can come in hash fragments or query strings
    const handleAuthCallback = async () => {
      // First, check if user is already authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTokenExchanged(true);
        return;
      }

      // Check for error in query string (from our verify-invite API route)
      const searchParams = new URLSearchParams(window.location.search);
      const queryError = searchParams.get('error');
      
      if (queryError) {
        // Clear the error from URL
        window.history.replaceState(null, '', window.location.pathname);
        
        if (queryError === 'expired') {
          setError('This password setup link has expired. Please contact us to request a new link.');
        } else if (queryError === 'invalid' || queryError === 'verification_failed') {
          setError('Invalid or expired setup link. Please contact support.');
        } else if (queryError === 'server_error') {
          setError('An error occurred while verifying your link. Please try again or contact support.');
        } else {
          setError('Invalid setup link. Please use the link sent to your email.');
        }
        return;
      }

      // Check for error in hash
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const errorParam = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      if (errorParam) {
        if (errorParam === 'access_denied' && errorDescription?.includes('expired')) {
          setError('This password setup link has expired. Please contact us to request a new link.');
        } else {
          setError(errorDescription || 'Invalid or expired setup link. Please contact support.');
        }
        return;
      }

      // Check for access_token in hash (means token was successfully exchanged)
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (accessToken && (type === 'recovery' || type === 'invite')) {
        // Supabase automatically processes hash fragments on page load
        // Give it a moment to establish the session
        const checkAuth = async () => {
          // Try multiple times as Supabase processes the hash
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 300));
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
              setTokenExchanged(true);
              // Clear the hash from URL
              window.history.replaceState(null, '', window.location.pathname);
              return;
            }
          }
          // If still not authenticated, show error
          setError('Failed to authenticate. Please try the link again or contact support.');
        };
        checkAuth();
      } else if (hash && !accessToken && !errorParam) {
        // Has hash but no token - might be processing
        // Wait a bit and check again
        setTimeout(async () => {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            setTokenExchanged(true);
          } else {
            setError('Invalid setup link format. Please use the link sent to your email.');
          }
        }, 1000);
      } else if (!hash && !errorParam) {
        // No hash at all - check if we have a session from a previous visit
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setTokenExchanged(true);
        } else {
          setError('Please use the link sent to your email to set up your password.');
        }
      }
    };

    handleAuthCallback();

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setTokenExchanged(true);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    // Check if user is authenticated (token was exchanged)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user && !tokenExchanged) {
      setError('Please use the link sent to your email to set up your password. The link may have expired.');
      setLoading(false);
      return;
    }

    try {
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || 'Failed to set password');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-md w-full text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-green-900 mb-2">Password set successfully!</h2>
            <p className="text-green-700 mb-4">
              Your password has been set. You can now sign in to your account.
            </p>
            <p className="text-sm text-green-600">Redirecting to login...</p>
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
            Set up your password
          </h2>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            {tokenExchanged 
              ? 'Create a password for your account' 
              : 'Please wait while we verify your setup link...'}
          </p>
        </div>

        {/* Password Setup Form */}
        <form className="mt-6 sm:mt-8 space-y-5 sm:space-y-6" onSubmit={handleSetupPassword}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#080c24] focus:border-transparent placeholder:text-gray-400 text-gray-900 bg-white"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#080c24] focus:border-transparent placeholder:text-gray-400 text-gray-900 bg-white"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !tokenExchanged}
            className="w-full py-3 text-base sm:text-sm bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting password...' : tokenExchanged ? 'Set Password' : 'Verifying link...'}
          </button>
          
          {error && error.includes('expired') && (
            <div className="text-center">
              <Link
                href="/#contact"
                className="text-sm text-[#080c24] hover:opacity-80 font-medium"
              >
                Contact us to request a new link
              </Link>
            </div>
          )}

          <div className="text-center text-xs sm:text-sm text-gray-600 px-2">
            Already have a password?{' '}
            <Link href="/auth/login" className="font-medium text-[#080c24] hover:opacity-80">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

