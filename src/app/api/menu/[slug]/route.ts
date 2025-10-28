import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export const revalidate = 3600; // Cache for 1 hour

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  try {
    // 1. Get restaurant info
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // 2. Get menu sections
    const { data: sections, error: sectionsError } = await supabase
      .from("menu_sections")
      .select("id, name, position")
      .eq("restaurant_id", restaurant.id)
      .order("position");

    if (sectionsError) {
      return NextResponse.json(
        { error: "Failed to load menu sections" },
        { status: 500 }
      );
    }

    // 3. Get menu items
    const sectionIds = sections?.map((s) => s.id) || [];
    const { data: items, error: itemsError } = await supabase
      .from("menu_items")
      .select("*")
      .in("section_id", sectionIds);

    if (itemsError) {
      return NextResponse.json(
        { error: "Failed to load menu items" },
        { status: 500 }
      );
    }

    // 4. Attach items to sections
    const menu = sections.map((section) => ({
      ...section,
      items: items?.filter((item) => item.section_id === section.id) || [],
    }));

    // ✅ Return clean response with caching
    return NextResponse.json(
      {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          description: restaurant.description,
          logo_url: restaurant.logo_url,
        },
        sections: menu,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("❌ Server error in /api/menu/[slug]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
