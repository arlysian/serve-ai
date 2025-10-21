import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  // 1. Retrieve restaurant
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // 2. Retrieve sections
  const { data: sections } = await supabase
    .from("menu_sections")
    .select("id, name, position")
    .eq("restaurant_id", restaurant.id)
    .order("position");

  // 3. Retrieve items
  const sectionIds = sections?.map((s) => s.id) || [];
  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .in("section_id", sectionIds);

  // 4. Combine sections and items
  const menu = sections?.map((section) => ({
    ...section,
    items: items?.filter((item) => item.section_id === section.id) || [],
  }));

  return NextResponse.json({
    restaurant,
    sections: menu,
  });
}
