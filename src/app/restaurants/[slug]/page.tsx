"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function RestaurantMenu() {
  const { slug } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (slug) {
      fetch(`/api/menu/${slug}`)
        .then(res => res.json())
        .then(setData);
    }
  }, [slug]);

  if (!data) return <p className="p-6">Loading...</p>;
  if (data.error) return <p className="p-6 text-red-500">{data.error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">{data.restaurant.name}</h1>

      {data.sections.map((section: any) => (
        <div key={section.id} className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">{section.name}</h2>

          {section.items.map((item: any) => (
            <div key={item.id} className="border-b py-4 flex gap-4">
              {/* ✅ Display image if exists */}
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-lg border"
                />
              ) : (
                // Optional default placeholder
                <div className="w-24 h-24 bg-gray-200 rounded-lg" />
              )}

              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-semibold">€{item.price}</span>
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
