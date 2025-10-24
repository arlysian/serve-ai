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

interface RestaurantData {
  restaurant: {
    name: string;
    description?: string;
    image_url?: string;
  };
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

  useEffect(() => {
    if (slug) {
      // Mock data for now - replace with actual API call
      const mockData: RestaurantData = {
        restaurant: {
          name: "Bella Vista",
          description: "Authentic Italian cuisine with fresh ingredients",
          image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop"
        },
        sections: [
          {
            id: "1",
            name: "Appetizers",
            items: [
              {
                id: "1",
                name: "Bruschetta",
                description: "Toasted bread with tomatoes, garlic, and basil",
                price: 8.50,
                image_url: "https://images.unsplash.com/photo-1572441713132-51c75654db73?w=200&h=200&fit=crop",
                allergens: ["gluten"],
                tags: ["vegetarian"]
              },
              {
                id: "2", 
                name: "Antipasto Platter",
                description: "Selection of cured meats, cheeses, and olives",
                price: 16.00,
                image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=200&h=200&fit=crop",
                allergens: ["dairy"],
                tags: ["meat"]
              }
            ]
          },
          {
            id: "2",
            name: "Main Courses",
            items: [
              {
                id: "3",
                name: "Spaghetti Carbonara",
                description: "Classic Roman pasta with eggs, cheese, and pancetta",
                price: 18.50,
                image_url: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=200&h=200&fit=crop",
                allergens: ["gluten", "dairy", "eggs"],
                tags: ["pasta"]
              },
              {
                id: "4",
                name: "Margherita Pizza",
                description: "Fresh mozzarella, tomato sauce, and basil",
                price: 14.00,
                image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&h=200&fit=crop",
                allergens: ["gluten", "dairy"],
                tags: ["vegetarian", "pizza"]
              }
            ]
          }
        ]
      };
      
      setTimeout(() => {
        setData(mockData);
        setLoading(false);
      }, 1000); 
    }
  }, [slug]);

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
      <div className="relative h-56 bg-gradient-to-br from-orange-400 to-red-500 sticky top-0 z-10 will-change-transform">
        {data.restaurant.image_url && (
          <img
            src={data.restaurant.image_url}
            alt={data.restaurant.name}
            className="w-full h-full object-cover"
            onLoad={() => console.log('Image loaded successfully')}
            onError={(e) => {
              console.log('Image failed to load:', data.restaurant.image_url);
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 overflow-hidden">
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 80%, transparent 100%)',
              backdropFilter: 'blur(12px)',
              filter: 'blur(0px)',
              maskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.3) 80%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.3) 80%, transparent 100%)'
            }}
          ></div>
        </div>
        <div className="absolute bottom-4 left-4 text-white">
          <h2 className="text-2xl font-bold drop-shadow-lg">{data.restaurant.name}</h2>
          {data.restaurant.description && (
            <p className="text-sm drop-shadow-lg">{data.restaurant.description}</p>
          )}
        </div>
      </div>

      {/* Section Navigation */}
      <div className="bg-white border-b">
        <div className="px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {data.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(selectedSection === section.id ? null : section.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        selectedSection === section.id
                          ? 'bg-orange-400 text-white'
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      }`}
                    >
                {section.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 py-4 pb-24">
        {data.sections.map((section) => (
          <div key={section.id} className="mb-8">
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
                        <h4 className="font-semibold text-gray-900 text-lg">{item.name}</h4>
                        <span className="font-bold text-lg text-gray-900">€{item.price.toFixed(2)}</span>
                      </div>
                      {item.description && (
                        <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {item.tags?.map((tag, index) => (
                          <span key={index} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                        {item.allergens?.map((allergen, index) => (
                          <span key={index} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            {allergen}
                          </span>
                        ))}
                      </div>
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
