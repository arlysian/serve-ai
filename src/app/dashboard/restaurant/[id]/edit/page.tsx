'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { Restaurant, MenuSection, MenuItem } from '@/types/menu';

export default function EditRestaurantPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'menu'>('menu');
  
  // Editing states
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!restaurant) return;

    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('restaurant_id', restaurant.id);
    formData.append('upload_type', 'logo');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Authentication required');
        setUploadingLogo(false);
        return;
      }

      const res = await fetch('/api/editor/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await res.json();
      if (result.success) {
        // Update local state (DB update is now handled in API)
        setRestaurant({ ...restaurant, logo_url: result.url });
      }
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to upload logo: ${errorMessage}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  // ...

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!restaurant) return;

    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('restaurant_id', restaurant.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Authentication required');
        setUploadingImage(false);
        return;
      }

      const res = await fetch('/api/editor/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }

        const result = await res.json();
        if (result.success && editingItem) {
          setEditingItem({ ...editingItem, image_url: result.url });
        }
      } catch (error: unknown) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to upload image: ${errorMessage}`);
    } finally {
      setUploadingImage(false);
    }
  };
  const [isNewItem, setIsNewItem] = useState(false);
  const [editingSection, setEditingSection] = useState<MenuSection | null>(null);
  const [isNewSection, setIsNewSection] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);

      // Fetch restaurant details
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single();

      if (restaurantError || !restaurant) {
        console.error('Error fetching restaurant:', restaurantError);
        router.push('/dashboard');
        return;
      }

      // Verify ownership
      if (!restaurant.owner_ids?.includes(user.id)) {
        router.push('/dashboard');
        return;
      }

      setRestaurant(restaurant);

      // Fetch sections and items
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('menu_sections')
        .select('*')
        .eq('restaurant_id', id)
        .order('position');

      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
        return;
      }

      if (sectionsData) {
        const sectionIds = sectionsData.map(s => s.id);
        const { data: itemsData, error: itemsError } = await supabase
          .from('menu_items')
          .select('*')
          .in('section_id', sectionIds);

        if (itemsError) {
          console.error('Error fetching items:', itemsError);
        } else {
          // Combine sections and items
          const combinedSections = sectionsData.map(section => ({
            ...section,
            items: itemsData?.filter(item => item.section_id === section.id) || []
          }));
          setSections(combinedSections);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [router, id]);

  // --- Restaurant Settings Handlers ---

  const handleUpdateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    const { error } = await supabase
      .from('restaurants')
      .update({
        name: restaurant.name,
        logo_url: restaurant.logo_url,
        theme: restaurant.theme,
        contact: restaurant.contact,
      })
      .eq('id', id);

    if (error) {
      alert('Failed to update restaurant settings');
      console.error(error);
    } else {
      alert('Restaurant settings updated!');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callApi = async (action: string, data: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('You must be logged in');
      return null;
    }

    const res = await fetch('/api/editor/menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...data }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Something went wrong');
    }

    return await res.json();
  };

  // --- Menu Section Handlers ---

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection || !restaurant) return;

    try {
      if (isNewSection) {
        // Create new section
        const result = await callApi('create_section', {
          restaurant_id: restaurant.id,
          name: editingSection.name,
          name_native: editingSection.name_native,
          position: sections.length,
        });

        if (result && result.data) {
          setSections([...sections, { ...result.data, items: [] }]);
          setEditingSection(null);
        }
      } else {
        // Update existing section
        await callApi('update_section', {
          id: editingSection.id,
          name: editingSection.name,
          name_native: editingSection.name_native,
        });

        setSections(sections.map(s => s.id === editingSection.id ? { ...s, name: editingSection.name, name_native: editingSection.name_native } : s));
        setEditingSection(null);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save section: ${errorMessage}`);
      console.error(error);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure? This will delete all items in this section.')) return;

    try {
      await callApi('delete_section', { id: sectionId });
      setSections(sections.filter(s => s.id !== sectionId));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to delete section: ${errorMessage}`);
      console.error(error);
    }
  };

  // --- Menu Item Handlers ---

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const itemData = {
      section_id: editingItem.section_id,
      name: editingItem.name,
      description: editingItem.description,
      description_native: editingItem.description_native,
      price: Number(editingItem.price),
      image_url: editingItem.image_url,
      allergens: editingItem.allergens || [],
      allergens_native: editingItem.allergens_native || [],
      tags: editingItem.tags || [],
      tags_native: editingItem.tags_native || [],
    };

    try {
      if (isNewItem) {
        const result = await callApi('create_item', itemData);
        if (result && result.data) {
          setSections(sections.map(s => {
            if (s.id === result.data.section_id) {
              return { ...s, items: [...s.items, result.data] };
            }
            return s;
          }));
          setEditingItem(null);
        }
      } else {
        await callApi('update_item', { id: editingItem.id, ...itemData });
        
        setSections(sections.map(s => {
          if (s.id === editingItem.section_id) {
            return {
              ...s,
              items: s.items.map(i => i.id === editingItem.id ? { ...i, ...itemData, id: i.id } : i)
            };
          }
          return s;
        }));
        setEditingItem(null);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save item: ${errorMessage}`);
      console.error(error);
    }
  };

  const handleDeleteItem = async (itemId: string, sectionId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await callApi('delete_item', { id: itemId });
      setSections(sections.map(s => {
        if (s.id === sectionId) {
          return { ...s, items: s.items.filter(i => i.id !== itemId) };
        }
        return s;
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to delete item: ${errorMessage}`);
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#080c24]"></div>
      </div>
    );
  }

  if (!restaurant) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center text-gray-500 hover:text-gray-900">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Link>
              <div className="h-6 w-px bg-gray-200"></div>
              <span className="font-semibold text-gray-900">{restaurant.name}</span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'menu' 
                    ? 'bg-[#080c24] text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Menu Editor
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'settings' 
                    ? 'bg-[#080c24] text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Restaurant Settings</h2>
            <form onSubmit={handleUpdateRestaurant} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
                <input
                  type="text"
                  value={restaurant.name}
                  onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-gray-900 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (Read-only)</label>
                <input
                  type="text"
                  value={restaurant.slug}
                  disabled
                  className="w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm border p-2 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                <div className="flex items-center gap-4">
                  {restaurant.logo_url && (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                      <Image
                        src={restaurant.logo_url}
                        alt="Logo Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-[#080c24] file:text-white
                        hover:file:opacity-90"
                      disabled={uploadingLogo}
                    />
                    {uploadingLogo && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                    <p className="text-xs text-gray-500 mt-1">Upload a logo image (max 50MB)</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#080c24] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#080c24]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MENU TAB */}
        {activeTab === 'menu' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Menu Sections</h2>
              <button
                onClick={() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  setEditingSection({ id: '', name: '', items: [], position: 0 } as any);
                  setIsNewSection(true);
                }}
                className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#080c24] hover:bg-opacity-90"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Section
              </button>
            </div>

            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Section Header */}
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{section.name_native || section.name}</h3>
                      {section.name && section.name_native && <p className="text-sm text-gray-500">{section.name}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingSection(section);
                          setIsNewSection(false);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Section"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Section"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="divide-y divide-gray-100">
                    {section.items.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">
                        No items in this section yet.
                      </div>
                    ) : (
                      section.items.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-4 items-start">
                          {item.image_url ? (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            <Image 
                              src={item.image_url} 
                              alt={item.name} 
                              fill
                              className="object-cover"
                            />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              <span className="font-bold text-gray-900">€{item.price.toFixed(2)}</span>
                            </div>
                            {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setIsNewItem(false);
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, section.id)}
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Add Item Button (Footer of section) */}
                    <div className="p-4 bg-gray-50 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setEditingItem({ 
                            section_id: section.id, 
                            name: '', 
                            price: 0,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          } as any);
                          setIsNewItem(true);
                        }}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Item to {section.name_native || section.name}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* SECTION MODAL */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{isNewSection ? 'New Section' : 'Edit Section'}</h3>
            <form onSubmit={handleSaveSection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Name (Native/Local)</label>
                <input
                  type="text"
                  value={editingSection.name_native || ''}
                  onChange={(e) => setEditingSection({ ...editingSection, name_native: e.target.value })}
                  className="w-full rounded-md border-gray-300 border p-2 shadow-sm text-gray-900 bg-white"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Name (English) - Optional</label>
                <input
                  type="text"
                  value={editingSection.name}
                  onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                  className="w-full rounded-md border-gray-300 border p-2 shadow-sm text-gray-900 bg-white"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#080c24] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{isNewItem ? 'New Menu Item' : 'Edit Menu Item'}</h3>
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full rounded-md border-gray-300 border p-2 shadow-sm text-gray-900 bg-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                    className="w-full rounded-md border-gray-300 border p-2 shadow-sm text-gray-900 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                  <div className="flex items-center gap-4">
                    {editingItem.image_url && (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                      <Image 
                        src={editingItem.image_url} 
                        alt="Preview" 
                        fill
                        className="object-cover"
                      />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-[#080c24] file:text-white
                          hover:file:opacity-90"
                        disabled={uploadingImage}
                      />
                      {uploadingImage && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                    </div>
                  </div>
                  {/* Hidden URL input to maintain compatibility if needed, or just remove it */}
                  <input
                    type="hidden"
                    value={editingItem.image_url || ''}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Native/Local)</label>
                  <textarea
                    value={editingItem.description_native || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, description_native: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border-gray-300 border p-2 shadow-sm text-gray-900 bg-white"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (English) - Optional</label>
                  <textarea
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border-gray-300 border p-2 shadow-sm text-gray-900 bg-white"
                  />
                </div>
                
                {/* Allergens & Tags could be simplified to comma-separated strings for now */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allergens (comma separated)</label>
                  <input
                    type="text"
                    value={editingItem.allergens?.join(', ') || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, allergens: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full rounded-md border-gray-300 border p-2 shadow-sm text-gray-900 bg-white"
                    placeholder="e.g. gluten, dairy, nuts"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={editingItem.tags?.join(', ') || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full rounded-md border-gray-300 border p-2 shadow-sm text-gray-900 bg-white"
                    placeholder="e.g. spicy, vegan, bestseller"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#080c24] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

