import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: { slug: string } }
) {
  // ✅ Fix: await params
  const { slug } = await context.params;

  // 1. Get restaurant info
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // 2. Get menu sections
  const { data: sections } = await supabase
    .from("menu_sections")
    .select("id, name, position")
    .eq("restaurant_id", restaurant.id)
    .order("position");

  // 3. Get menu items in all sections
  const sectionIds = sections?.map((s) => s.id) || [];
  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .in("section_id", sectionIds);

  // 4. Attach items to their section
  const menu = sections?.map((section) => ({
    ...section,
    items: items?.filter((item) => item.section_id === section.id) || [],
  }));

  return NextResponse.json({ restaurant, sections: menu });
}
