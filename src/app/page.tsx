'use client';

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AnimatedCard from "@/components/AnimatedCard";

export default function Home() {
  const [email, setEmail] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [pricingEmail, setPricingEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  // Check if there's an invite token in the URL hash and redirect to setup-password
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      // If there's an invite or recovery token, redirect to setup-password
      if (accessToken && (type === 'invite' || type === 'recovery')) {
        // Preserve the hash when redirecting
        router.push(`/auth/setup-password${window.location.hash}`);
      }
    }
  }, [router]);

  // Feature flag: Uncomment the line below to enable the ordering feature
  // const ENABLE_ORDERING_FEATURE = true;
  const ENABLE_ORDERING_FEATURE = false; // Set to true to show ordering feature

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handlePricingFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/pricing-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName,
          email: pricingEmail,
          phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setSubmitSuccess(true);
      setCompanyName('');
      setPricingEmail('');
      setPhone('');
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    } catch (error) {
      console.error('Error submitting pricing request:', error);
      alert('Failed to submit your request. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <Image
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
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="hidden sm:block px-6 py-2 text-[#080c24] border border-[#080c24] rounded-lg hover:bg-[#f5f4f1] transition-colors text-sm font-medium"
              >
                Login
              </Link>
              <Link
                href="/restaurants/ristorante-pizzeria-karalis"
                className="hidden sm:block px-6 py-2 bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
              >
                Get started
              </Link>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-4 space-y-3">
              <Link
                href="/restaurants/ristorante-pizzeria-karalis"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity text-center font-medium"
              >
                Get started
              </Link>
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-[#080c24] border border-[#080c24] rounded-lg hover:bg-[#f5f4f1] transition-colors text-center font-medium"
              >
                Login
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                AI-powered menus.
                <br />
                Effortless dining.
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Upgrade your restaurant with digital menus and instant AI assistance. Guests scan a QR code and explore your menu—no app needed. Simple, efficient, and always available.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/restaurants/ristorante-pizzeria-karalis"
                  className="px-8 py-4 bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity text-center font-medium"
                >
                  Try Demo
                </Link>
                <Link
                  href="#pricing"
                  className="px-8 py-4 bg-white text-[#080c24] border-2 border-[#080c24] rounded-lg hover:bg-[#f5f4f1] transition-colors text-center font-medium"
                >
                  View Pricing
                </Link>
              </div>
            </div>

            {/* Right: Image Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg aspect-square overflow-hidden">
                <Image
                  src="/images/Restaurant_Interior.jpg"
                  alt="Restaurant Interior"
                  width={400}
                  height={400}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="rounded-lg aspect-square overflow-hidden">
                <Image
                  src="/images/Menu_tablet.jpg"
                  alt="Tablet Menu"
                  width={400}
                  height={400}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="rounded-lg aspect-square overflow-hidden">
                <Image
                  src="/images/Chef_cooking.jpg"
                  alt="Chef Cooking"
                  width={400}
                  height={400}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="rounded-lg aspect-square overflow-hidden">
                <Image
                  src="/images/QR-code_wood.jpg"
                  alt="QR Code Stand"
                  width={400}
                  height={400}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#f5f4f1]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-4">
            <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">CORE FEATURES</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-16">
              Menus that work smarter
            </h2>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatedCard direction="left" delay={0}>
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-[#f5f4f1] rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-[#080c24]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="13" y="13" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="16" y="16" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="19" y="13" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="19" y="19" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="13" y="19" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="16" y="5" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="5" y="5" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="5" y="16" width="3" height="3" rx="0.5" fill="currentColor"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">QR code menus, no app needed.</h3>
                <p className="text-gray-600">Guests scan to access your digital menu instantly—always current, no downloads.</p>
              </div>
            </AnimatedCard>

            <AnimatedCard direction="left" delay={100}>
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-[#f5f4f1] rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-[#080c24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">AI assistant for instant support.</h3>
                <p className="text-gray-600">Menu help, dish suggestions, and allergy info—answered by AI in seconds.</p>
              </div>
            </AnimatedCard>

            <AnimatedCard direction="left" delay={200}>
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-[#f5f4f1] rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-[#080c24]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21,12a1,1,0,0,0-1,1v6a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V5A1,1,0,0,1,5,4h6a1,1,0,0,0,0-2H5A3,3,0,0,0,2,5V19a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V13A1,1,0,0,0,21,12ZM6,12.76V17a1,1,0,0,0,1,1h4.24a1,1,0,0,0,.71-.29l6.92-6.93h0L21.71,8a1,1,0,0,0,0-1.42L17.47,2.29a1,1,0,0,0-1.42,0L13.23,5.12h0L6.29,12.05A1,1,0,0,0,6,12.76ZM16.76,4.41l2.83,2.83L18.17,8.66,15.34,5.83ZM8,13.17l5.93-5.93,2.83,2.83L10.83,16H8Z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Update your menu in real time.</h3>
                <p className="text-gray-600">Change items, prices, or specials instantly from any device.</p>
              </div>
            </AnimatedCard>

            {/* Order at the table feature - Uncomment ENABLE_ORDERING_FEATURE to show this */}
            {ENABLE_ORDERING_FEATURE && (
              <AnimatedCard direction="right" delay={0}>
                <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-[#f5f4f1] rounded-lg flex items-center justify-center mb-6">
                    <svg className="w-6 h-6 text-[#080c24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Order at the table, contact free.</h3>
                  <p className="text-gray-600">Guests place orders digitally, reducing wait and minimizing contact.</p>
                </div>
              </AnimatedCard>
            )}

            <AnimatedCard direction="right" delay={100}>
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-[#f5f4f1] rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-[#080c24]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5,12a1,1,0,0,0-1,1v8a1,1,0,0,0,2,0V13A1,1,0,0,0,5,12ZM10,2A1,1,0,0,0,9,3V21a1,1,0,0,0,2,0V3A1,1,0,0,0,10,2ZM20,16a1,1,0,0,0-1,1v4a1,1,0,0,0,2,0V17A1,1,0,0,0,20,16ZM15,8a1,1,0,0,0-1,1V21a1,1,0,0,0,2,0V9A1,1,0,0,0,15,8Z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Menu analytics for better decisions.</h3>
                <p className="text-gray-600">See top dishes and guest trends to refine your menu and grow sales.</p>
              </div>
            </AnimatedCard>

            <AnimatedCard direction="right" delay={200}>
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-[#f5f4f1] rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-[#080c24]" viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M43.8,41.2,33.9,16.3A2.1,2.1,0,0,0,32,15H30a2.1,2.1,0,0,0-1.9,1.3L23.3,28.4a24,24,0,0,1-5.6-4.3c3.4-4,5.9-8.8,6.2-13.1h2A2.1,2.1,0,0,0,28,9.3,2,2,0,0,0,26,7H17.5V4.1A2.1,2.1,0,0,0,15.8,2a2,2,0,0,0-2.3,2V7H6.1A2.1,2.1,0,0,0,4,8.7,2,2,0,0,0,6,11H19.9c-.3,3-2.3,6.7-4.9,10.1a34.1,34.1,0,0,1-3.2-4.9A2.1,2.1,0,0,0,9.6,15a2,2,0,0,0-1.4,2.9,39.1,39.1,0,0,0,4.1,6.2,24,24,0,0,1-7,5A2.2,2.2,0,0,0,4,31.4,2,2,0,0,0,6,33l.8-.2A26.4,26.4,0,0,0,15,27a28.1,28.1,0,0,0,6.8,5.1l-3.6,9.1A2,2,0,0,0,20,44a2.2,2.2,0,0,0,1.9-1.3L25.8,33H36.2l3.9,9.7A2.2,2.2,0,0,0,42,44a2,2,0,0,0,1.8-2.8ZM27.4,29,31,19.9,34.6,29Z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Menus in every guest&apos;s language.</h3>
                <p className="text-gray-600">Offer digital menus and AI support in multiple languages for a welcoming experience.</p>
              </div>
            </AnimatedCard>

            <AnimatedCard direction="right" delay={300}>
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-[#f5f4f1] rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-[#080c24]" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Fast onboarding process.</h3>
                <p className="text-gray-600">We handle the initial menu setup so you can start serving smarter in no time. No technical knowledge required.</p>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </section>

      {/* Initial Menu Creation Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-4">
            <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">CORE FEATURES</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-16">
              Menus that work with you — and for you
            </h2>
          </div>

          <div className="bg-[#f5f4f1] rounded-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <div className="rounded-lg aspect-video overflow-hidden">
                  <Image
                    src="/images/Initial_menu.jpg"
                    alt="Initial Menu"
                    width={800}
                    height={450}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">INITIAL MENU DESIGN</p>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Initial menu creation</h3>
                <p className="text-gray-600 mb-6 text-lg">
                  We create the first menu for you, according to your needs. Later you can edit the menu items yourself.
                </p>
                <Link
                  href="/restaurants/ristorante-pizzeria-karalis"
                  className="inline-block px-6 py-3 bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  View Example
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Updates Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#f5f4f1] rounded-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <div className="rounded-lg aspect-video overflow-hidden">
                  <Image
                    src="/images/Menu_edit_laptop.jpg"
                    alt="Laptop with Menu Editor"
                    width={800}
                    height={450}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">REAL-TIME UPDATES</p>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Edit menus anytime</h3>
                <p className="text-gray-600 mb-6 text-lg">
                  Change items, prices, or specials instantly. No printing or waiting.
                </p>
                <button className="px-6 py-3 bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity font-medium">
                  Start now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contactless Service Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#f5f4f1] rounded-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <div className="rounded-lg aspect-video overflow-hidden">
                  <Image
                    src="/images/person_scanning_qr.jpg"
                    alt="Person Scanning QR Code"
                    width={800}
                    height={450}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">CONTACTLESS SERVICE</p>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Scan. Ask. Done.</h3>
                <p className="text-gray-600 mb-6 text-lg">
                  Guests can scan a QR code to access your menu and receive professional, waiter-level answers to their questions.
                </p>
                <Link
                  href="/restaurants/ristorante-pizzeria-karalis"
                  className="inline-block px-6 py-3 bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">PRICING</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Flexible pricing for every restaurant
            </h2>
            <p className="text-xl text-gray-600">
              Get a customized quote tailored to your restaurant&apos;s needs.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <AnimatedCard direction="up" delay={0}>
              <div className="bg-[#f5f4f1] rounded-xl p-8 md:p-12 border border-gray-200">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-[#080c24] rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Contact us for pricing</h3>
                  <p className="text-lg text-gray-600">
                    Fill out the form below and we&apos;ll get back to you with a customized quote for your restaurant.
                  </p>
                </div>

                {submitSuccess ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="text-xl font-bold text-green-900 mb-2">Thank you!</h4>
                    <p className="text-green-700">We&apos;ve received your request and will contact you soon.</p>
                  </div>
                ) : (
                  <form onSubmit={handlePricingFormSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="companyName" className="block text-sm font-semibold text-gray-900 mb-2">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Your restaurant name"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#080c24] focus:border-transparent placeholder:text-gray-400 text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="pricingEmail" className="block text-sm font-semibold text-gray-900 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="pricingEmail"
                        value={pricingEmail}
                        onChange={(e) => setPricingEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#080c24] focus:border-transparent placeholder:text-gray-400 text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#080c24] focus:border-transparent placeholder:text-gray-400 text-gray-900 bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Request Pricing'}
                    </button>
                  </form>
                )}
              </div>
            </AnimatedCard>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#f5f4f1]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Smarter menus, seamless service
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Subscribe for updates on AI-powered digital menus and QR code solutions for restaurants. Get the latest features, tips, and industry insights.
          </p>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              // Handle newsletter subscription
              alert('Thank you for subscribing!');
              setEmail('');
            }}
            className="max-w-md mx-auto"
          >
            <label htmlFor="email" className="block text-sm uppercase tracking-wider text-gray-700 mb-2 text-left">
              BUSINESS EMAIL
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#080c24] focus:border-transparent placeholder:text-gray-700 text-gray-900"
                required
              />
              <button
                type="submit"
                className="px-8 py-3 bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Your questions, answered fast
              </h2>
              <p className="text-gray-600 mb-8">
                Find quick answers about our digital menu and AI-powered service. Everything you need to know, right here.
              </p>
              <Link 
                href="#contact"
                className="inline-block px-6 py-3 bg-[#080c24] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Contact us
              </Link>
            </div>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq(0)}
                  className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-bold text-gray-900">How does the AI assistant work?</h3>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${openFaq === 0 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === 0 && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600">
                      The AI assistant responds to guest questions, takes orders, and suggests menu items—all within the digital menu. No app needed; just scan and interact.
                    </p>
                  </div>
                )}
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq(1)}
                  className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-bold text-gray-900">Can I update my menu anytime?</h3>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${openFaq === 1 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === 1 && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600">
                      Yes! You can update your menu in real-time from any device. Changes appear instantly for all guests.
                    </p>
                  </div>
                )}
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq(2)}
                  className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-bold text-gray-900">Is setup quick and easy?</h3>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${openFaq === 2 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === 2 && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600">
                      Absolutely. We create your initial menu for you, and you can start using it immediately. No technical expertise required.
                    </p>
                  </div>
                )}
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq(3)}
                  className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-bold text-gray-900">What devices do guests need?</h3>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${openFaq === 3 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === 3 && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600">
                      Guests only need a smartphone with a camera to scan the QR code. No app download required—everything works in their browser.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">CONTACT</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Get in touch today</h2>
            <p className="text-xl text-gray-600">Questions? We&apos;re here to help.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#f5f4f1] rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-[#dedee1] rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#080c24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600 mb-2">Message us for menu setup.</p>
              <a href="mailto:info@serveai.net" className="text-[#080c24] hover:underline">
                info@serveai.net
              </a>
            </div>

            <div className="bg-[#f5f4f1] rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-[#dedee1] rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#080c24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600 mb-2">Call for quick assistance.</p>
              <a href="tel:+31616545061" className="text-[#080c24] hover:underline">
                +31 616 545061
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#080c24] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 gap-8 md:gap-12 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">Smarter menus, seamless dining</h3>
              <a href="mailto:info@serveai.net" className="text-gray-300 text-lg mb-2 block hover:text-white transition-colors">info@serveai.net</a>
              <p className="text-gray-300">AI-powered QR menus for restaurants.</p>
            </div>
            <div className="grid grid-cols-1 gap-8 justify-items-end pr-4 md:pr-24">
              <div>
                <h4 className="font-semibold mb-4">Menu</h4>
                <ul className="space-y-2 text-gray-300">
                  <li><Link href="#" className="hover:text-white transition-colors">Home</Link></li>
                  <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                  <li><Link href="#contact" className="hover:text-white transition-colors">Contact</Link></li>
                  <li><Link href="#contact" className="hover:text-white transition-colors">Support</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Image
                src="/Inverted_backgroundless_ServeAI_logo.svg"
                alt="ServeAI Logo"
                width={40}
                height={40}
                className="mr-3"
              />
              <span className="text-2xl font-bold">SERVEAI</span>
            </div>
            <div className="flex items-center space-x-6 pr-4 md:pr-24">
              <a href="#" className="hover:text-gray-300 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
