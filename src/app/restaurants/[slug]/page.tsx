"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Restaurant, MenuSection } from "@/types/menu";
import MenuLayout from "@/components/menu/MenuLayout";
import MenuSectionComp from "@/components/menu/MenuSection";

interface MenuResponse {
  restaurant: Restaurant;
  sections: MenuSection[];
}

export default function RestaurantMenu() {
  const { slug } = useParams();
  const [data, setData] = useState<MenuResponse | null>(null);

  useEffect(() => {
    if (slug) {
      fetch(`/api/menu/${slug}`)
        .then((res) => res.json())
        .then(setData);
    }
  }, [slug]);

  if (!data) return <p className="p-6">Loading...</p>;
  if (!data.restaurant || !data.sections) {
    return <p className="p-6 text-red-500">Error loading menu</p>;
  }

  return (
    <MenuLayout restaurant={data.restaurant}>
      {data.sections.map((section) => (
        <MenuSectionComp key={section.id} section={section} restaurant={data.restaurant} />
      ))}
    </MenuLayout>
  );
}
