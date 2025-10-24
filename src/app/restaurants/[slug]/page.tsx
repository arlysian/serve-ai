"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import MenuLayout from "@/components/menu/MenuLayout";
import MenuSection from "@/components/menu/MenuSection";

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
    <MenuLayout restaurant={data.restaurant}>
      {data.sections.map((section) => (
        <MenuSection key={section.id} section={section} restaurant={data.restaurant} />
      ))}
    </MenuLayout>
  );
}
