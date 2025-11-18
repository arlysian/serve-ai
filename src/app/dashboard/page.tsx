'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/auth/login');
      } else {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#080c24] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center">
              <img
                src="/Backgroundless_ServeAI_logo.svg"
                alt="ServeAI Logo"
                width={48}
                height={48}
                className="mr-3"
              />
              <span className="text-2xl font-bold text-gray-900">
                ServeAI
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your restaurant menus and settings
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-[#f5f4f1] rounded-xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">My Restaurants</h3>
            <p className="text-gray-600 mb-4">
              View and manage your restaurant menus
            </p>
            <Link
              href="#"
              className="inline-block px-4 py-2 bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
            >
              View Restaurants
            </Link>
          </div>

          <div className="bg-[#f5f4f1] rounded-xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Menu Editor</h3>
            <p className="text-gray-600 mb-4">
              Edit your menu items, prices, and descriptions
            </p>
            <Link
              href="#"
              className="inline-block px-4 py-2 bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
            >
              Edit Menu
            </Link>
          </div>

          <div className="bg-[#f5f4f1] rounded-xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600 mb-4">
              View menu performance and guest insights
            </p>
            <Link
              href="#"
              className="inline-block px-4 py-2 bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
            >
              View Analytics
            </Link>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-12 bg-[#f5f4f1] rounded-xl p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-2">
            <p className="text-gray-600">
              <span className="font-semibold">Email:</span> {user?.email}
            </p>
            <p className="text-gray-600">
              <span className="font-semibold">User ID:</span> {user?.id}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

