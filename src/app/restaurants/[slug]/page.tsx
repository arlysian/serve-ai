"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { getTranslation, type Language } from "@/lib/translations";

interface MenuItem {
  id: string;
  name: string;
  // Note: menu_items table doesn't have name_native, only menu_sections does
  description?: string;
  description_native?: string;
  price: number;
  image_url?: string;
  allergens?: string[];
  allergens_native?: string[];
  tags?: string[];
  tags_native?: string[];
}

interface MenuSection {
  id: string;
  name: string;
  name_native?: string;
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
  hero_video_url?: string;
  hero_socials?: {
    website?: string;
    instagram?: string;
    facebook?: string;
  };
}



interface RestaurantData {
  restaurant: Restaurant;
  sections: MenuSection[];
}


export default function RestaurantMenu() {
  const { slug } = useParams();
  const [data, setData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const truncate = (text: string, limit: number) => {
    if (!text) return "";
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
  };
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const chatInputRef = useRef<HTMLInputElement>(null);
  const floatingInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const aiPicksRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [hasInputText, setHasInputText] = useState(false);
  const [isManualScrolling, setIsManualScrolling] = useState(false);
  const prevChatLoadingRef = useRef(false);
  const prevChatHistoryLengthRef = useRef(0);
  const lastChatOpenViaSendRef = useRef<number>(0);
  const isUserAtBottomRef = useRef(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showFullHero, setShowFullHero] = useState(true);
  const [chatClosing, setChatClosing] = useState(false);
  const [selectedLangIndex, setSelectedLangIndex] = useState(0);
  const [backdropVisible, setBackdropVisible] = useState(false);
  
  // Get current language: 0 = English (en), 1 = Dutch (nl)
  const currentLang: Language = selectedLangIndex === 0 ? 'en' : 'nl';
  const isEnglish = selectedLangIndex === 0;
  
  // Helper functions to get the correct field based on language
  const getSectionName = (section: MenuSection): string => {
    return isEnglish ? section.name : (section.name_native || section.name);
  };
  
  const getItemName = (item: MenuItem): string => {
    // menu_items table doesn't have name_native, so always use name
    return item.name;
  };
  
  const getItemDescription = (item: MenuItem): string | undefined => {
    return isEnglish ? item.description : (item.description_native || item.description);
  };
  
  const getItemAllergens = (item: MenuItem): string[] | undefined => {
    return isEnglish ? item.allergens : (item.allergens_native || item.allergens);
  };
  
  const getItemTags = (item: MenuItem): string[] | undefined => {
    return isEnglish ? item.tags : (item.tags_native || item.tags);
  };
  
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [dishPosition, setDishPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [dishClosing, setDishClosing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [highlightedDishes, setHighlightedDishes] = useState<Set<string>>(new Set());
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastMicClickRef = useRef<number>(0);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  // ✅ Fetch restaurant + menu data
  useEffect(() => {
    // Prevent SSR errors and ensure slug is ready
    if (typeof window === "undefined") return;

    const fetchData = async () => {
      if (!slug) return; // only run when slug is available

      try {
        const res = await fetch(`/api/menu/${slug}`, { cache: "no-store" });
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

    // 🔁 Retry until slug is defined
    const timeout = setTimeout(fetchData, 100);
    return () => clearTimeout(timeout);
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

  // Pause video when not visible for performance optimization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Video is visible - play it
            video.play().catch((err) => {
              // Ignore autoplay errors (browser may block autoplay)
              console.debug("Video play prevented:", err);
            });
          } else {
            // Video is not visible - pause it to save resources
            video.pause();
          }
        });
      },
      {
        // Trigger when at least 10% of video is visible
        threshold: 0.1,
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [data?.restaurant.hero_video_url]);

  // Auto-scroll chat to bottom during streaming and when streaming completes
  useEffect(() => {
    if (chatMessagesRef.current) {
      // Check if we are currently streaming (and length hasn't changed, meaning it's a content update)
      // OR if streaming just finished
      const isStreamingContentUpdate = chatLoading && chatHistory.length === prevChatHistoryLengthRef.current;
      const isStreamingComplete = prevChatLoadingRef.current && !chatLoading;
      
      // Only scroll if user was already at the bottom to avoid interrupting reading
      if ((isStreamingContentUpdate || isStreamingComplete) && isUserAtBottomRef.current) {
        chatMessagesRef.current.scrollTo({
          top: chatMessagesRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
    prevChatLoadingRef.current = chatLoading;
  }, [chatLoading, chatHistory]);

  // Auto-scroll when new user message is added (always, even if streaming is about to start)
  useEffect(() => {
    // Scroll if:
    // 1. History length increased (new message added)
    // 2. Last message is from user (user just sent a message)
    if (chatHistory.length > prevChatHistoryLengthRef.current && 
        chatMessagesRef.current && 
        chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      if (lastMessage.role === 'user') {
        // Use requestAnimationFrame and setTimeout to ensure DOM has updated
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (chatMessagesRef.current) {
              // User sent a message, force scroll to bottom and lock it there
              isUserAtBottomRef.current = true;
              chatMessagesRef.current.scrollTo({
                top: chatMessagesRef.current.scrollHeight,
                behavior: 'smooth'
              });
            }
          }, 0);
        });
      }
    }
    prevChatHistoryLengthRef.current = chatHistory.length;
  }, [chatHistory.length, chatHistory]);

  // Prevent body scrolling on Android when chat is open
  useEffect(() => {
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (showChat && isAndroid) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [showChat]);

  // Auto-scroll to bottom when chat opens
  useEffect(() => {
    if (!showChat) return;

    const scrollToBottom = () => {
      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTo({
          top: chatMessagesRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    };

    // Try immediately after open
    requestAnimationFrame(scrollToBottom);
    // Fallback after a brief delay to ensure content is laid out
    const timeout = setTimeout(scrollToBottom, 450);
    return () => clearTimeout(timeout);
  }, [showChat]);

  // Cleanup media recorder on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

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

  // Lazy load sections as they come into view
  useEffect(() => {
    if (!data?.sections?.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.getAttribute('data-section-id');
          if (!sectionId) return;

          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, sectionId]));
          }
        });
      },
      {
        // Start loading when section is 200px away from viewport
        rootMargin: '200px 0px',
        threshold: 0.01,
      }
    );

    // Observe all section containers
    data.sections.forEach((section) => {
      const element = document.getElementById(`section-${section.id}`);
      if (element) {
        observer.observe(element);
        // Mark first section as visible immediately
        if (section === data.sections[0]) {
          setVisibleSections((prev) => new Set([...prev, section.id]));
        }
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [data?.sections]);

  const sendChatMessage = async (message: string) => {
    if (!message.trim()) return;
    
    // Validate message length on client side
    if (message.length > 800) {
      setChatHistory(prev => [...prev, 
        { role: "user", content: message },
        { role: "assistant", content: "Your message is too long. Please keep it under 800 characters." }
      ]);
      return;
    }
    
    setChatLoading(true);
    isUserAtBottomRef.current = true; // Force snap to bottom on new message
    setChatHistory(prev => [...prev, { role: "user", content: message }]);
    
    // Scroll to show user message immediately
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTo({
            top: chatMessagesRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
    });
    
    // Add empty assistant message that we'll update as chunks arrive
    setChatHistory(prev => [...prev, { role: "assistant", content: "" }]);

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

      // Handle rate limiting
      if (res.status === 429) {
        setChatHistory(prev => {
          const newHistory = [...prev];
          newHistory.pop(); // Remove empty assistant message
          return [...newHistory, { 
            role: "assistant", 
            content: "You're sending messages too quickly. Please wait a moment before trying again." 
          }];
        });
        setChatLoading(false);
        return;
      }
      
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Chat request failed");
      }

      // Handle streaming response with character-by-character animation
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";
      let displayedResponse = "";
      const characterQueue: string[] = [];
      let isStreamingComplete = false;
      let lastUpdateTime = 0;
      const CHAR_DELAY = 15; // Delay between characters in ms

      if (!reader) {
        throw new Error("No response body");
      }

      // Start continuous character processing loop
      const processCharacters = async () => {
        while (!isStreamingComplete || characterQueue.length > 0) {
          if (characterQueue.length > 0) {
            const now = Date.now();
            // Only process if enough time has passed since last update
            if (now - lastUpdateTime >= CHAR_DELAY) {
              const char = characterQueue.shift();
              if (char) {
                displayedResponse += char;
                lastUpdateTime = now;
                
                // Update the last message (assistant message) with displayed content
                setChatHistory(prev => {
                  const newHistory = [...prev];
                  newHistory[newHistory.length - 1] = {
                    role: "assistant",
                    content: displayedResponse
                  };
                  return newHistory;
                });
              }
            }
          }
          
          // Small delay to prevent tight loop
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      };

      // Start the character processing loop
      processCharacters();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const streamData = JSON.parse(line.slice(6));
              
              if (streamData.error) {
                throw new Error(streamData.error);
              }

              if (streamData.content) {
                fullResponse += streamData.content;
                // Add characters to queue for animated display
                const newChars = streamData.content.split("");
                characterQueue.push(...newChars);
              }

              if (streamData.done) {
                isStreamingComplete = true;
                
                // Wait for queue to finish processing
                while (characterQueue.length > 0) {
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                if (streamData.session_id) {
                  setSessionId(streamData.session_id);
                }
                setChatLoading(false);
                
                // Parse AI response to find mentioned dishes using component's data
                if (fullResponse && data?.sections) {
                  const mentionedDishIds = new Set<string>();
                  const lowerResponse = fullResponse.toLowerCase();
                  data.sections.forEach((section: MenuSection) => {
                    section.items.forEach((item: MenuItem) => {
                      // menu_items only have name (no name_native)
                      const itemName = item.name.toLowerCase();
                      if (lowerResponse.includes(itemName)) {
                        mentionedDishIds.add(item.id);
                      }
                    });
                  });
                  
                  if (mentionedDishIds.size > 0) {
                    setHighlightedDishes(prev => new Set([...prev, ...mentionedDishIds]));
                    
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
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory.pop(); // Remove empty assistant message
        return [...newHistory, { role: "assistant", content: "Sorry, something went wrong." }];
      });
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chatLoading) return; // Prevent sending while streaming
    
    const userMessage = chatInputRef.current?.value || "";
    if (!userMessage.trim()) return;

    chatInputRef.current!.value = "";
    await sendChatMessage(userMessage);
  };

  const handleSendButtonClick = async () => {
    const floatingMessage = floatingInputRef.current?.value || "";

    // If no message: toggle chat with 1s guard after opening via Send (allow even during streaming)
    if (!floatingMessage.trim()) {
      if (showChat) {
        const now = Date.now();
        // Prevent closing within 1 second of opening via Send
        if (now - lastChatOpenViaSendRef.current < 500) return;
        handleCloseChat();
      } else {
        setChatClosing(false);
        setShowChat(true);
        setTimeout(() => setBackdropVisible(true), 10);
        lastChatOpenViaSendRef.current = Date.now();
      }
      return;
    }

    // Prevent sending only when there's text AND streaming is active
    if (chatLoading) return;

    // Ensure chat is open when sending (and mark open time if opened via Send)
    if (!showChat) {
      setChatClosing(false);
      setShowChat(true);
      setTimeout(() => setBackdropVisible(true), 10);
      lastChatOpenViaSendRef.current = Date.now();
    }
    floatingInputRef.current!.value = "";
    setHasInputText(false);
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
        {data.restaurant.hero_video_url && (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center center" }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          >
            <source
              src={`${data.restaurant.hero_video_url}?v=${Date.now()}`} // cache-bust if re-uploaded
              type="video/mp4"
            />
          </video>
        )}

      
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

        {/* Language Buttons - appearance only (no logic) */}
        <div className="flex items-center gap-3 mb-6">
          {['EN', 'NL'].map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedLangIndex(index)}
              aria-pressed={selectedLangIndex === index}
              className={`px-4 py-2 rounded-full border ${
                selectedLangIndex === index
                  ? 'bg-black text-white border-white shadow-md'
                  : 'bg-white/10 text-white border-white/60 hover:bg-white/20'
              } backdrop-blur-sm transition-all duration-200`}
            >
              {label}
            </button>
          ))}
        </div>
        
        {/* Social Media Buttons */}
        {data.restaurant.hero_socials && (() => {
          // 🛠 Ensure hero_socials is always a real object
          const socials =
            typeof data.restaurant.hero_socials === "string"
              ? JSON.parse(data.restaurant.hero_socials)
              : data.restaurant.hero_socials;

          return (
            <div className="flex items-center gap-4 mb-8">
              {/* Website */}
              {socials.website && (
                <a
                  href={socials.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center group"
                >
                  <svg
                    className="w-6 h-6 text-white group-hover:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </a>
              )}

              {/* Instagram */}
              {socials.instagram && (
                <a
                  href={socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center group"
                >
                  <svg
                    className="w-6 h-6 text-white group-hover:scale-110 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              )}

              {/* Facebook */}
              {socials.facebook && (
                <a
                  href={socials.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center group"
                >
                  <svg
                    className="w-6 h-6 text-white group-hover:scale-110 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>                  </svg>
                </a>
              )}
            </div>
          );
        })()}



        {/* Elegant message (Deleted but kept for reference) */}
        {/* <div className="mt-16 mb-6">
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
        </div> */}
        
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
            {getSectionName(section)}
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
                  new Map(allHighlightedItems.map(item => [getItemName(item).toLowerCase(), item])).values()
                );
                return uniqueItems.map((item) => (
                  <motion.div 
                    key={`ai-pick-${item.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ai-highlighted-dish my-4"
                    style={{ transform: 'translateZ(0)' }}
                    onClick={(e) => handleDishClick(item, e)}
                  >
                    <div className={`flex ${item.image_url ? 'gap-4' : ''}`}>
                    {item.image_url && (
                      <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={item.image_url}
                          alt={getItemName(item)}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {getItemName(item)}
                        </h4>
                        <span className="font-bold text-lg text-gray-900 pl-2">
                          €{item.price.toFixed(2)}
                        </span>
                      </div>
                    
                      {getItemDescription(item) && (
                        <p className="text-gray-600 text-sm mb-2">{truncate(getItemDescription(item)!, 70)}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
                ));
              })()}
            </div>
          </div>
        )}

        {data.sections.map((section) => (
          <div key={section.id} id={`section-${section.id}`} data-section-id={section.id} className="mb-8 scroll-mt-32">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{getSectionName(section)}</h3>
            {visibleSections.has(section.id) ? (
              <div className="space-y-4">
                {section.items.map((item) => (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow my-4 ${
                    highlightedDishes.has(item.id) ? 'ai-highlighted-dish' : ''
                  }`}
                  style={{ transform: 'translateZ(0)' }}
                  onClick={(e) => handleDishClick(item, e)}
                >
                  <div className={`flex ${item.image_url ? 'gap-4' : ''}`}>
                    {item.image_url && (
                      <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={item.image_url}
                          alt={getItemName(item)}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {getItemName(item)}
                        </h4>
                        <span className="font-bold text-lg text-gray-900 pl-2">
                          €{item.price.toFixed(2)}
                        </span>
                      </div>
                    
                      {getItemDescription(item) && (
                        <p className="text-gray-600 text-sm mb-2">{truncate(getItemDescription(item)!, 70)}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              </div>
            ) : (
              // Placeholder while section is loading
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-xl"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Floating Input Bar - stays on top */}
      <div className="fixed bottom-4 left-4 right-4 z-[60] will-change-transform">
        <div className="shadow-2xl border border-white/60 px-3.5 py-2.25 flex items-center gap-3" style={{ 
          borderRadius: '32px', 
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
            placeholder={getTranslation(currentLang, 'askAnything')}
            maxLength={800}
            disabled={chatLoading && hasInputText}
            onChange={(e) => {
              setHasInputText(e.target.value.trim().length > 0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !chatLoading) {
                handleSendButtonClick();
              }
            }}
            className="flex-1 bg-transparent border-0 outline-none text-gray-700 placeholder-gray-500 pl-4 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          {/* Microphone Button */}
          <button 
            disabled={chatLoading}
            onClick={async () => {
              if (chatLoading) return; // Prevent recording while streaming
              if (isRecording) {
                // Prevent spam: require 1 second delay after starting recording
                const timeSinceStart = Date.now() - lastMicClickRef.current;
                if (timeSinceStart < 1000) {
                  return;
                }
                
                // Stop recording
                if (recordingTimeoutRef.current) {
                  clearTimeout(recordingTimeoutRef.current);
                  recordingTimeoutRef.current = null;
                }
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                  mediaRecorderRef.current.stop();
                }
                setIsRecording(false);
                return;
              }

              // Open chat when starting to record
              if (!showChat) {
                setChatClosing(false);
                setShowChat(true);
                setTimeout(() => setBackdropVisible(true), 10);
              }

              // Record when recording started
              lastMicClickRef.current = Date.now();

              try {
                // Request microphone access
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Initialize MediaRecorder
                const mediaRecorder = new MediaRecorder(stream, {
                  mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
                });
                
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                  if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                  }
                };

                mediaRecorder.onstop = async () => {
                  // Clear timeout if still active
                  if (recordingTimeoutRef.current) {
                    clearTimeout(recordingTimeoutRef.current);
                    recordingTimeoutRef.current = null;
                  }
                  
                  // Stop all tracks
                  stream.getTracks().forEach(track => track.stop());

                  // Create audio blob
                  const audioBlob = new Blob(audioChunksRef.current, { 
                    type: mediaRecorder.mimeType 
                  });

                  // Send to Whisper API
                  try {
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'recording.webm');

                    const response = await fetch('/api/transcribe', {
                      method: 'POST',
                      body: formData,
                    });

                    if (!response.ok) {
                      throw new Error('Transcription failed');
                    }

                    const transcriptionData = await response.json();
                    
                    // Validate transcription semantically
                    if (transcriptionData.text && transcriptionData.text.trim()) {
                      try {
                        const validateResponse = await fetch('/api/validate-transcription', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ text: transcriptionData.text }),
                        });

                        if (validateResponse.ok) {
                          const validationData = await validateResponse.json();
                          
                          // Only fill input if validation passes
                          if (validationData.valid && validationData.text && floatingInputRef.current) {
                            floatingInputRef.current.value = validationData.text;
                            setHasInputText(validationData.text.trim().length > 0);
                          }
                          // If invalid, silently ignore (don't show hallucinated text)
                        }
                      } catch (validationError) {
                        console.error('Validation error:', validationError);
                        // On validation error, still use the transcription (fail open)
                        if (floatingInputRef.current && transcriptionData.text) {
                          floatingInputRef.current.value = transcriptionData.text.trim();
                          setHasInputText(transcriptionData.text.trim().length > 0);
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Transcription error:', error);
                    alert('Failed to transcribe audio. Please try again.');
                  }

                  // Clear chunks
                  audioChunksRef.current = [];
                };

                // Start recording
                mediaRecorder.start();
                setIsRecording(true);
                
                // Auto-stop after 30 seconds
                recordingTimeoutRef.current = setTimeout(() => {
                  if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                  }
                  setIsRecording(false);
                  recordingTimeoutRef.current = null;
                }, 30000);

              } catch (error) {
                console.error('Microphone access error:', error);
                if (error instanceof Error && error.name === 'NotAllowedError') {
                  alert('Microphone permission denied. Please allow microphone access.');
                } else {
                  alert('Failed to access microphone. Please try again.');
                }
                setIsRecording(false);
              }
            }}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 flex-shrink-0 ${
              isRecording 
                ? 'bg-blue-700 hover:bg-red-600' 
                : 'hover:bg-gray-100'
            } ${chatLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isRecording ? "Stop recording" : "Voice input"}
          >
            <svg 
              className={`w-5 h-5 ${isRecording ? 'text-white' : 'text-gray-600'}`} 
              fill={isRecording ? "currentColor" : "none"} 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          {/* Send Button */}
          <button 
            onClick={handleSendButtonClick}
            disabled={chatLoading && hasInputText}
            className="flex items-center justify-center w-10 h-10 bg-black hover:bg-gray-800 rounded-full transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0l-6-6m6 6l-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Overlay */}
      {showChat && (
        <div className="fixed inset-0 z-[55] flex items-end">
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
            className="w-full h-[60vh] rounded-t-3xl flex flex-col shadow-2xl relative z-10 will-change-transform"
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
            <div className="px-4 py-1 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">{getTranslation(currentLang, 'aiMenuAssistant')}</h3>
              <button 
                onClick={handleCloseChat}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Chat Messages - Full window */}
            <div 
              ref={chatMessagesRef} 
              className="flex-1 overflow-y-auto p-4 space-y-4 pb-24"
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                // Consider "at bottom" if within 50px of the bottom
                const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
                isUserAtBottomRef.current = isAtBottom;
              }}
            >
              {chatHistory.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p>{getTranslation(currentLang, 'askMeAnything')}</p>
                  <p className="text-sm mt-2">
                    {getTranslation(currentLang, 'tryExamples')}
                  </p>
                </div>
              )}
              
              {chatHistory.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 ${
                    message.role === 'user' 
                      ? 'bg-black text-white [&_*]:text-white rounded-3xl' 
                      : 'bg-gray-100 text-gray-900 [&_*]:text-gray-900 rounded-2xl'
                  }`}>
                    <ReactMarkdown
                      allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'br']}
                      unwrapDisallowed={true}
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
              
            </div>
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
            {/* Fixed Close Button (does not scroll) */}
            <button 
              onClick={handleCloseDish}
              className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg z-10"
            >
              <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable Content (image + details) */}
            <div className="overflow-y-auto max-h-[85vh] scrollbar-hide">
              {/* Large Dish Image */}
              <div className="relative w-full max-h-[40vh] bg-white flex items-center justify-center overflow-hidden">
                {selectedDish.image_url ? (
                  <img
                    src={selectedDish.image_url}
                    alt={selectedDish.name}
                    className="w-auto h-full max-h-[40vh] object-contain mx-auto transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-white"></div>
                )}
              </div>

              {/* Dish Details */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-3xl font-bold text-gray-900">{getItemName(selectedDish)}</h2>
                  <span className="text-2xl font-bold text-black px-4">€{selectedDish.price.toFixed(2)}</span>
                </div>
                
                {getItemDescription(selectedDish) && (
                  <p className="text-gray-600 text-lg mb-6">{getItemDescription(selectedDish)}</p>
                )}

                {/* Tags and Allergens */}
                {(getItemTags(selectedDish) || getItemAllergens(selectedDish)) && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {getItemTags(selectedDish)?.map((tag, index) => (
                      <span key={index} className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
                        {tag.charAt(0).toUpperCase() + tag.slice(1)}
                      </span>
                    ))}
                    {getItemAllergens(selectedDish)?.map((allergen, index) => (
                      <span key={index} className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full">
                        {allergen.charAt(0).toUpperCase() + allergen.slice(1)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ask AI Button */}
                <button
                  onClick={() => {
                    handleCloseDish();
                    setChatClosing(false);
                    setShowChat(true);
                    setTimeout(() => {
                      setBackdropVisible(true);
                      if (floatingInputRef.current && selectedDish) {
                        const dishName = getItemName(selectedDish);
                        const promptText = getTranslation(currentLang, 'tellMeMoreAbout');
                        const fullText = `${promptText} ${dishName}`;
                        floatingInputRef.current.value = fullText;
                        setHasInputText(true);
                        floatingInputRef.current.setSelectionRange(0, 0);
                        floatingInputRef.current.focus();
                        // Ensure cursor stays at beginning after focus
                        setTimeout(() => {
                          if (floatingInputRef.current) {
                            floatingInputRef.current.setSelectionRange(0, 0);
                            floatingInputRef.current.scrollLeft = 0;
                          }
                        }, 0);
                      }
                    }, 10);
                  }}
                  className="w-full border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-medium text-base hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span>{getTranslation(currentLang, 'askAiAboutThis')}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
