"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  allergens?: string[];
  tags?: string[];
}

interface MenuSection {
  id: string;
  name: string;
  items: MenuItem[];
}

interface RestaurantTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  [key: string]: string | undefined;
}

interface RestaurantContact {
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  [key: string]: string | undefined;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  theme?: RestaurantTheme;
  contact?: RestaurantContact;
  hero_url?: string;
}


interface RestaurantData {
  restaurant: Restaurant;
  sections: MenuSection[];
}


export default function RestaurantMenu() {
  const { slug } = useParams();
  const router = useRouter();
  const [data, setData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [floatingInputMessage, setFloatingInputMessage] = useState("");
  const chatInputRef = useRef<HTMLInputElement>(null);
  const floatingInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const aiPicksRef = useRef<HTMLDivElement>(null);
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isManualScrolling, setIsManualScrolling] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showFullHero, setShowFullHero] = useState(true);
  const [chatClosing, setChatClosing] = useState(false);
  const [backdropVisible, setBackdropVisible] = useState(false);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [dishPosition, setDishPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [dishClosing, setDishClosing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [highlightedDishes, setHighlightedDishes] = useState<Set<string>>(new Set());


  // ✅ Fetch restaurant + menu data
  useEffect(() => {
    if (!slug) return;
    if (typeof window === "undefined") return; // prevent SSR errors

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/menu/${slug}`);
        if (!res.ok) {
          console.error("Failed to fetch menu data");
          setData(null);
          return;
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error fetching menu:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  // Handle hero transition on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = window.innerHeight * 0.8; // Transition point
      setShowFullHero(window.scrollY < scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTo({
        top: chatMessagesRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory, chatLoading]);

  // 🧭 Highlight active section precisely when its title hits the top (auto offset)
  useEffect(() => {
    if (!data?.sections?.length) return;
  
    const sectionEls = data.sections
      .map((s) => document.getElementById(`section-${s.id}`))
      .filter(Boolean) as HTMLElement[];
  
    if (!sectionEls.length) return;
  
    const navEl = document.querySelector(".section-nav") as HTMLElement | null;
  
    const getOffset = () => {
      const navHeight = navEl?.offsetHeight || 0;
      return navHeight;
    };
  
    const computeActive = () => {
      if (isManualScrolling) return;
    
      const OFFSET = getOffset();
      let activeId = data.sections[0].id;
    
      for (let i = 0; i < sectionEls.length; i++) {
        const el = sectionEls[i];
        const rect = el.getBoundingClientRect();
      
        // The section becomes active when its top is above the top offset
        if (rect.top - OFFSET <= 5) {
          activeId = data.sections[i].id;
        }
      }
    
      // If at bottom of page, highlight the last section
      const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 50;
      if (atBottom) activeId = data.sections[data.sections.length - 1].id;
    
      setSelectedSection((prev) => {
        if (prev !== activeId) {
          // Auto-scroll the nav bar to center the active button
          setTimeout(() => {
            const activeButton = document.querySelector(`button[data-section-id="${activeId}"]`) as HTMLElement;
            const navContainer = document.querySelector(".section-nav-scroll") as HTMLElement;
            if (activeButton && navContainer) {
              const buttonLeft = activeButton.offsetLeft;
              const buttonWidth = activeButton.offsetWidth;
              const containerWidth = navContainer.offsetWidth;
              const scrollTo = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
              navContainer.scrollTo({ left: scrollTo, behavior: "smooth" });
            }
          }, 100);
          return activeId;
        }
        return prev;
      });
    };
  
    const onScroll = () => window.requestAnimationFrame(computeActive);
  
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    computeActive();
  
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [data, isManualScrolling]);

  const sendChatMessage = async (message: string) => {
    if (!message.trim()) return;
    setChatLoading(true);
    setChatHistory(prev => [...prev, { role: "user", content: message }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: data?.restaurant.id,
          question: message,
          session_id: sessionId,
        }),
      });

      const json = await res.json();
      console.log("Chat response:", json); // optional debug
      if (!res.ok) throw new Error(json.error || "Chat request failed");

      setSessionId(json.session_id);
      const aiResponse = json.answer || "No response.";
      setChatHistory(prev => [...prev, { role: "assistant", content: aiResponse }]);
      
      // Parse AI response to find mentioned dishes
      if (data?.sections) {
        const mentionedDishIds = new Set<string>();
        data.sections.forEach(section => {
          section.items.forEach(item => {
            // Check if dish name appears in AI response (case-insensitive)
            if (aiResponse.toLowerCase().includes(item.name.toLowerCase())) {
              mentionedDishIds.add(item.id);
            }
          });
        });
        
        // Add newly mentioned dishes to highlights
        if (mentionedDishIds.size > 0) {
          setHighlightedDishes(prev => new Set([...prev, ...mentionedDishIds]));
          
          // Auto-scroll to AI Picks section
          setTimeout(() => {
            if (aiPicksRef.current) {
              const navEl = document.querySelector(".section-nav") as HTMLElement | null;
              const navHeight = navEl?.offsetHeight || 0;
              const targetPosition = aiPicksRef.current.offsetTop - navHeight - 20;
              
              window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
              });
            }
          }, 100);
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatHistory(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMessage = chatInputRef.current?.value || "";
    if (!userMessage.trim()) return;

    chatInputRef.current!.value = "";
    await sendChatMessage(userMessage);
  };

  const handleSendButtonClick = async () => {
    console.log("Send button clicked, opening chat");
    const floatingMessage = floatingInputRef.current?.value || "";

    // Open chat overlay
    setChatClosing(false);
    setShowChat(true);
    setTimeout(() => setBackdropVisible(true), 10);

    if (!floatingMessage.trim()) return;
    floatingInputRef.current!.value = "";
    await sendChatMessage(floatingMessage);
  };

  const handleCloseChat = () => {
    setChatClosing(true);
    setBackdropVisible(false);
    setTimeout(() => {
      setShowChat(false);
      setChatClosing(false);
    }, 300); // Match animation duration
  };

  const handleDishClick = (dish: MenuItem, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // Account for scroll position
    setDishPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    });
    setDishClosing(false);
    setImageLoaded(false);
    
    // Preload image if it exists
    if (dish.image_url) {
      const img = new Image();
      img.src = dish.image_url;
      img.onload = () => setImageLoaded(true);
      img.onerror = () => setImageLoaded(true); // Still show even if image fails
    } else {
      setImageLoaded(true); // No image, so mark as "loaded"
    }
    
    setSelectedDish(dish);
  };

  const handleCloseDish = () => {
    setDishClosing(true);
    setTimeout(() => {
      setSelectedDish(null);
      setDishClosing(false);
    }, 300); // Match animation duration
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200"></div>
          <div className="p-4 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-xl"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Restaurant not found</p>
          <Link href="/" className="text-blue-600 mt-2 inline-block">← Back to restaurants</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
    {/* Full-Screen Hero Landing - Scrolls naturally */}
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          objectPosition: 'center center'
        }}
        onLoadStart={() => console.log('Video loading started...')}
        onLoadedData={() => console.log('Video loaded and ready to play!')}
        onError={(e) => {
          console.error('Video failed to load');
          e.currentTarget.style.display = 'none';
        }}
      >
        <source src="/2025-10-24 18-36-03.mp4" type="video/mp4" />
      </video>
      
      {/* Fallback gradient if video fails */}
      <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(to bottom right, rgb(249, 115, 22), rgb(220, 38, 38))' }}></div>
      
      {/* Dark overlay for better text visibility on video */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center text-white px-4 -mt-20">
        {data.restaurant.logo_url && (
          <div className="w-32 h-32 md:w-40 md:h-40 mb-4 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm overflow-hidden p-4">
            <img
              src={data.restaurant.logo_url}
              alt={`${data.restaurant.name} logo`}
              className="w-full h-full object-contain"
            />
          </div>
        )}
        
        <h1 className="text-4xl md:text-5xl font-bold drop-shadow-2xl leading-tight mb-3">
          {data.restaurant.name}
        </h1>
        
        {data.restaurant.description && (
          <p className="text-lg md:text-xl drop-shadow-lg max-w-[90%] text-white/90 mb-6">
            {data.restaurant.description}
          </p>
        )}
        
        {/* Social Media Buttons */}
        <div className="flex items-center gap-4 mb-8">
          {/* Website Button */}
          <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center group">
            <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          {/* Instagram Button */}
          <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center group">
            <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </button>
          
          {/* Facebook Button */}
          <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center group">
            <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>
        </div>
        
        {/* Elegant message */}
        <div className="mt-16 mb-6">
          <p 
            className="text-amber-300 text-5xl md:text-7xl italic drop-shadow-2xl transform -rotate-2" 
            style={{ 
              fontFamily: 'Brush Script MT, Lucida Handwriting, cursive',
              letterSpacing: '0.05em',
              textShadow: '0 0 30px rgba(251, 191, 36, 0.5), 2px 2px 4px rgba(0, 0, 0, 0.3)'
            }}
          >
            Bon Appétit
          </p>
        </div>
        
        {/* Scroll indicator */}
        <div className="animate-bounce">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </div>

    {/* Section Navigation */}
    <div className="section-nav sticky top-0 z-40 will-change-transform">
      <div className="section-nav-scroll flex gap-3 px-4 py-2 overflow-x-auto scrollbar-hide" style={{ 
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}>
        {data.sections.map((section) => (
          <button
            key={section.id}
            data-section-id={section.id}
            onClick={() => {
              setSelectedSection(section.id);
              setIsManualScrolling(true);

              const target = document.getElementById(`section-${section.id}`);
              const navEl = document.querySelector(".section-nav") as HTMLElement | null;
              const navHeight = navEl?.offsetHeight || 0;
              const OFFSET = navHeight + 5;

              if (target) {
                const top = target.getBoundingClientRect().top + window.scrollY - OFFSET;
                window.scrollTo({ top, behavior: "smooth" });
              }

              // Auto-scroll the nav bar to center the clicked button
              const navContainer = document.querySelector(".section-nav-scroll") as HTMLElement;
              const button = document.querySelector(`button[data-section-id="${section.id}"]`) as HTMLElement;
              if (button && navContainer) {
                const buttonLeft = button.offsetLeft;
                const buttonWidth = button.offsetWidth;
                const containerWidth = navContainer.offsetWidth;
                const scrollTo = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
                navContainer.scrollTo({ left: scrollTo, behavior: "smooth" });
              }

              setTimeout(() => setIsManualScrolling(false), 800);
            }}

            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all
              ${
                selectedSection === section.id
                  ? "bg-black text-white shadow-lg scale-105 transition-all duration-300"
                  : "bg-transparent text-gray-700 hover:bg-gray-100/50 transition-all duration-300"
              }`}
          >
            {section.name}
          </button>
        ))}
      </div>
    </div>

      {/* Menu Items */}
      <div className="px-4 py-4 pb-24">
        {/* AI Picks Section */}
        {highlightedDishes.size > 0 && (
          <div ref={aiPicksRef} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-xl font-semibold text-gray-900">AI Picks</h3>
              <span className="text-2xl">✨</span>
            </div>
            <div className="space-y-4">
              {(() => {
                const allHighlightedItems = data.sections.flatMap(section => 
                  section.items.filter(item => highlightedDishes.has(item.id))
                );
                // Remove duplicates by name (in case same dish appears in multiple sections)
                const uniqueItems = Array.from(
                  new Map(allHighlightedItems.map(item => [item.name.toLowerCase(), item])).values()
                );
                return uniqueItems.map((item) => (
                  <div 
                    key={`ai-pick-${item.id}`}
                    className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ai-highlighted-dish"
                    onClick={(e) => handleDishClick(item, e)}
                  >
                    <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {item.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {item.name}
                        </h4>
                        <span className="font-bold text-lg text-gray-900">
                          €{item.price.toFixed(2)}
                        </span>
                      </div>
                    
                      {item.description && (
                        <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                ));
              })()}
            </div>
          </div>
        )}

        {data.sections.map((section) => (
          <div key={section.id} id={`section-${section.id}`} className="mb-8 scroll-mt-32">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{section.name}</h3>
            <div className="space-y-4">
              {section.items.map((item) => (
                <div 
                  key={item.id} 
                  className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                    highlightedDishes.has(item.id) ? 'ai-highlighted-dish' : ''
                  }`}
                  onClick={(e) => handleDishClick(item, e)}
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                          className="w-full h-full object-cover"
                />
              ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {item.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {item.name}
                        </h4>
                        <span className="font-bold text-lg text-gray-900">
                          €{item.price.toFixed(2)}
                        </span>
                      </div>
                    
                      {item.description && (
                        <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Input Bar */}
      <div className="fixed bottom-4 left-4 right-4 z-50 will-change-transform">
        <div className="shadow-2xl border border-white/60 px-4 py-3 flex items-center gap-3" style={{ 
          borderRadius: '28px', 
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)', 
          transform: 'translateZ(0)', 
          backfaceVisibility: 'hidden',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)'
        }}>
          {/* Input Field */}
          <input
            ref={floatingInputRef}
            type="text"
            placeholder="Ask anything"
            className="flex-1 bg-transparent border-0 outline-none text-gray-700 placeholder-gray-400 pl-4"
          />
          
          {/* Microphone Icon */}
          <button className="p-2 hover:bg-white/50 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          {/* Send Button */}
          <button 
            onClick={handleSendButtonClick}
            className="flex items-center justify-center w-10 h-10 bg-black hover:bg-gray-800 rounded-full transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0l-6-6m6 6l-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Overlay */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* Backdrop shading */}
          <div 
            className="absolute inset-0 bg-black"
            style={{
              opacity: backdropVisible ? 0.6 : 0,
              transition: 'opacity 0.3s ease-out'
            }}
            onClick={handleCloseChat}
          ></div>
          
          {/* Chat Panel */}
          <div 
            className="w-full h-[60vh] rounded-t-3xl flex flex-col shadow-2xl relative z-10"
            style={{
              animation: chatClosing ? 'none' : 'slideUp 0.3s ease-out',
              transform: chatClosing ? 'translateY(100%)' : 'translateY(0)',
              transition: chatClosing ? 'transform 0.3s ease-out' : 'none',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
            }}
          >
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">AI Menu Assistant</h3>
              <button 
                onClick={handleCloseChat}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Chat Messages */}
            <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p>Ask me anything about the menu!</p>
                  <p className="text-sm mt-2">
                    Try: &quot;What&apos;s good for vegetarians?&quot; or &quot;What do you recommend?&quot;
                  </p>
                </div>
              )}
              
              {chatHistory.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    message.role === 'user' 
                      ? 'bg-black text-white [&_*]:text-white' 
                      : 'bg-gray-100 text-gray-900 [&_*]:text-gray-900'
                  }`}>
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                        em: ({node, ...props}) => <em className="italic" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="ml-0" {...props} />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  placeholder="Ask about the menu..."
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-2xl border-0 focus:outline-none focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  className="flex items-center justify-center w-12 h-12 bg-black hover:bg-gray-800 rounded-full disabled:opacity-50 disabled:hover:bg-black flex-shrink-0 shadow-sm transition-all duration-200"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0l-6-6m6 6l-6 6" />
                  </svg>
                </button>
              </div>
            </form>
            </div>
        </div>
      )}

      {/* Dish Detail Modal - Expands from clicked position */}
      {selectedDish && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black z-50"
            style={{
              opacity: dishClosing ? 0 : 0.6,
              transition: 'opacity 0.3s ease-out'
            }}
            onClick={handleCloseDish}
          ></div>

          {/* Expanding Dish Card */}
          <div 
            className="fixed z-50 bg-white rounded-3xl shadow-2xl flex flex-col will-change-transform"
            style={{
              top: dishPosition.top - window.scrollY,
              left: dishPosition.left - window.scrollX,
              width: dishPosition.width,
              height: dishPosition.height,
              animation: dishClosing ? 'none' : (imageLoaded ? 'expandToCenter 0.35s cubic-bezier(0.4, 0.0, 0.2, 1) forwards' : 'none'),
              transition: dishClosing ? 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s ease-out' : 'none',
              overflow: 'hidden',
              opacity: dishClosing ? 0 : (imageLoaded ? 1 : 0),
              transform: dishClosing ? 'scale(0.95)' : undefined
            }}
          >
            {/* Large Dish Image */}
            <div className="relative h-64 bg-gradient-to-br from-orange-400 to-red-500 flex-shrink-0">
              {selectedDish.image_url ? (
                <img
                  src={selectedDish.image_url}
                  alt={selectedDish.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white font-bold text-6xl">
                    {selectedDish.name.charAt(0)}
                  </span>
                </div>
              )}
              
              {/* Close Button */}
              <button 
                onClick={handleCloseDish}
                className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
              >
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Dish Details */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-bold text-gray-900">{selectedDish.name}</h2>
                <span className="text-2xl font-bold text-orange-500">€{selectedDish.price.toFixed(2)}</span>
              </div>
              
              {selectedDish.description && (
                <p className="text-gray-600 text-lg mb-6">{selectedDish.description}</p>
              )}

              {/* Tags and Allergens */}
              {(selectedDish.tags || selectedDish.allergens) && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedDish.tags?.map((tag, index) => (
                    <span key={index} className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                  {selectedDish.allergens?.map((allergen, index) => (
                    <span key={index} className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full">
                      {allergen}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
