"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  theme?: Record<string, any>;
  contact?: Record<string, any>;
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
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isManualScrolling, setIsManualScrolling] = useState(false);


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

  // 🧭 Highlight active section precisely when its title hits the top (auto offset)
  useEffect(() => {
    if (!data?.sections?.length) return;
  
    const sectionEls = data.sections
      .map((s) => document.getElementById(`section-${s.id}`))
      .filter(Boolean) as HTMLElement[];
  
    if (!sectionEls.length) return;
  
    const heroEl = document.querySelector(".restaurant-hero") as HTMLElement | null;
    const navEl = document.querySelector(".section-nav") as HTMLElement | null;
  
    const getOffset = () => {
      const heroHeight = heroEl?.offsetHeight || 0;
      const navHeight = navEl?.offsetHeight || 0;
      return heroHeight + navHeight;
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
    
      setSelectedSection((prev) => (prev !== activeId ? activeId : prev));
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


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage;
    setChatMessage("");
    setChatLoading(true);

    // Add user message to history
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    // Mock AI response - replace with actual API call
    setTimeout(() => {
      const responses = [
        "That's a great choice! The Carbonara is one of our most popular dishes.",
        "I'd recommend the Bruschetta as a starter - it's made with fresh tomatoes from our local supplier.",
        "The Margherita pizza is perfect if you're looking for something vegetarian.",
        "All our pasta dishes are made fresh daily with authentic Italian ingredients."
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
      setChatLoading(false);
    }, 1500);
  };

  const handleSendButtonClick = () => {
    console.log('Send button clicked, opening chat');
    setShowChat(true);
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
    {/* Restaurant Hero */}
    <div className="restaurant-hero sticky top-0 z-50 h-44 md:h-52 bg-gradient-to-br from-orange-400 to-red-500 shadow-lg relative overflow-hidden">
      {data.restaurant.image_url && (
        <img
          src={data.restaurant.image_url}
          alt={data.restaurant.name}
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
      )}

      {/* Gradient overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

      {/* ✅ Centered content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4">
        {data.restaurant.logo_url && (
          <div className="w-24 h-24 md:w-28 md:h-28 mb-3 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm shadow-lg border border-white/30 overflow-hidden p-2">
            <img
              src={data.restaurant.logo_url}
              alt={`${data.restaurant.name} logo`}
              className="w-full h-full object-contain scale-90"
            />
          </div>
        )}


        <h2 className="text-2xl md:text-3xl font-bold drop-shadow-lg leading-tight">
          {data.restaurant.name}
        </h2>

        {data.restaurant.description && (
          <p className="text-sm md:text-base drop-shadow mt-1 max-w-[90%] text-white/90">
            {data.restaurant.description}
          </p>
        )}
      </div>

      {/* bottom fade into page */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-white"></div>
    </div>


    {/* Section Navigation */}
    <div className="section-nav bg-white border-b sticky top-[160px] md:top-[192px] z-40 overflow-x-auto scrollbar-hide shadow-sm">
      <div className="flex gap-3 px-4 py-2">
        {data.sections.map((section) => (
          <button
            key={section.id}
            onClick={() => {
              setSelectedSection(section.id);
              setIsManualScrolling(true);

              const target = document.getElementById(`section-${section.id}`);
              const heroEl = document.querySelector(".restaurant-hero") as HTMLElement | null;
              const navEl = document.querySelector(".section-nav") as HTMLElement | null;
              const heroHeight = heroEl?.offsetHeight || 0;
              const navHeight = navEl?.offsetHeight || 0;
              const OFFSET = heroHeight + navHeight + 5;

              if (target) {
                const top = target.getBoundingClientRect().top + window.scrollY - OFFSET;
                window.scrollTo({ top, behavior: "smooth" });
              }

              setTimeout(() => setIsManualScrolling(false), 800);
            }}

            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${
                selectedSection === section.id
                  ? "bg-orange-500 text-white shadow-[0_0_12px_rgba(255,128,0,0.5)] scale-105 transition-all duration-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-300"
              }`}
          >
            {section.name}
          </button>
        ))}
      </div>
    </div>

      {/* Menu Items */}
      <div className="px-4 py-4 pb-24">
        {data.sections.map((section) => (
          <div key={section.id} id={`section-${section.id}`} className="mb-8 scroll-mt-32">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{section.name}</h3>
            <div className="space-y-4">
              {section.items.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm">
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
      <div className="fixed bottom-4 left-4 right-4 z-50">
        <div className="bg-white shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-3" style={{ borderRadius: '24px' }}>
          {/* Input Field */}
          <input
            type="text"
            placeholder="Ask anything"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-gray-700 placeholder-gray-400 pl-4"
          />
          
          {/* Microphone Icon */}
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          {/* Voice/Send Button */}
          <button 
            onClick={handleSendButtonClick}
            className="p-2 bg-orange-400 hover:bg-orange-500 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Overlay */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="bg-white w-full h-[40vh] rounded-t-3xl flex flex-col animate-slide-up shadow-2xl">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">AI Menu Assistant</h3>
              <button 
                onClick={() => setShowChat(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p>Ask me anything about the menu!</p>
                  <p className="text-sm mt-2">Try: "What's good for vegetarians?" or "What do you recommend?"</p>
                </div>
              )}
              
              {chatHistory.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    message.role === 'user' 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.content}
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
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Ask about the menu..."
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-2xl border-0 focus:ring-2 focus:ring-orange-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={!chatMessage.trim() || chatLoading}
                  className="px-4 py-3 bg-orange-400 text-white rounded-2xl disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
            </div>
        </div>
      )}

    </div>
  );
}
