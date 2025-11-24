 'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { Restaurant } from '@/types/menu';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      
      // Fetch user's restaurants
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('*')
        .contains('owner_ids', [user.id]);
        
      if (restaurants) {
        setRestaurants(restaurants);
      }

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
      <nav className="bg-white border-b border-gray-200 relative z-50">
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
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#080c24]"
              >
                <span className="sr-only">Open menu</span>
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-gray-100 border-b border-t border-gray-300 shadow-lg z-40">
            <div className="px-4 py-4 space-y-4">
              <div className="text-sm font-medium text-gray-900 break-all">
                {user?.email}
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm font-medium text-white bg-[#080c24] rounded-lg hover:opacity-90"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Restaurants Card - Now Dynamic */}
          <div className="bg-[#f5f4f1] rounded-xl p-6 border border-gray-200 order-1 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">My Restaurants</h3>
            </div>
            
            {restaurants.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {restaurants.map((restaurant) => (
                  <Link 
                    key={restaurant.id} 
                    href={`/restaurants/${restaurant.slug}`}
                    className="block bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      {restaurant.logo_url ? (
                        <img src={restaurant.logo_url} alt={restaurant.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-gray-900">{restaurant.name}</h4>
                        <p className="text-sm text-gray-500">/{restaurant.slug}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-lg border border-gray-200 border-dashed">
                <p className="text-gray-500 mb-4">No restaurants found linked to your account.</p>
                <p className="text-sm text-gray-400">Make sure you've added your ID to the owner_ids list in Supabase.</p>
              </div>
            )}
          </div>

          <div className="bg-[#f5f4f1] rounded-xl p-6 border border-gray-200 order-3 lg:order-2">
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

          <div className="bg-[#f5f4f1] rounded-xl p-6 border border-gray-200 order-2 lg:order-3">
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
