import { NextResponse } from "next/server";
import { createClient, PostgrestSingleResponse } from "@supabase/supabase-js";
import OpenAI from "openai";
import {
  getOrCreateSession,
  loadMemory,
  saveTurn,
  updateSummary,
} from "../../../lib/memory";
import { checkRateLimit } from "../../../lib/rateLimit";

// --- 1. ENV SETUP ---
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// --- 2. TYPES ---
interface MenuItem {
  name: string;
  description?: string | null;
  price: number;
  allergens?: string[] | null;
  tags?: string[] | null;
  menu_sections?: { name?: string | null };
}

interface MenuSection {
  name: string;
  menu_items?: MenuItem[];
}

interface Restaurant {
  name: string;
}

// --- 3. HANDLER ---
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      restaurant_id?: string;
      question?: string;
      dish_id?: string;
      session_id?: string;
    };

    const { restaurant_id, question, dish_id, session_id } = body;

    // --- VALIDATION ---
    if (!restaurant_id || !question) {
      return NextResponse.json(
        { error: "Missing restaurant_id or question" },
        { status: 400 }
      );
    }

    // Message length validation (max 800 characters)
    if (question.length > 800) {
      return NextResponse.json(
        { error: "Message too long. Maximum 800 characters allowed." },
        { status: 400 }
      );
    }

    // --- RATE LIMITING ---
    // Check BOTH session and IP to prevent bypass via fake session_ids
    const sessionIdentifier = session_id || 'no-session';
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                      req.headers.get('x-real-ip') || 
                      'unknown-ip';
    
    // Session-based limit: 10 requests per minute per session
    const sessionLimited = !(await checkRateLimit(`session:${sessionIdentifier}`, 10, 60 * 1000));
    
    // IP-based limit: 30 requests per minute per IP (allows max 3 concurrent sessions)
    const ipLimited = !(await checkRateLimit(`ip:${ipAddress}`, 30, 60 * 1000));
    
    if (sessionLimited || ipLimited) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please wait a moment before trying again.",
          retryAfter: 60 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '60'
          }
        }
      );
    }

    // --- MEMORY HANDLING ---
    const sid = await getOrCreateSession(restaurant_id, session_id);
    const { summary, recent } = await loadMemory(sid);

    // --- CONTEXT BUILDING ---
    let context: Record<string, unknown> = {};
    let restaurant_name = "";

    const restaurantRes: PostgrestSingleResponse<Restaurant> = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", restaurant_id)
      .single();

    if (restaurantRes.data) restaurant_name = restaurantRes.data.name;

    const compressMenu = (sections: MenuSection[]) =>
      sections.map((s) => ({
        s: s.name,
        i:
          s.menu_items?.map((m) => ({
            n: m.name,
            d: m.description ? m.description.slice(0, 120) : "",
            p: m.price,
            a: m.allergens,
            t: m.tags,
          })) ?? [],
      }));

    const compressDish = (dish: MenuItem) => ({
      n: dish.name,
      d: dish.description ? dish.description.slice(0, 150) : "",
      p: dish.price,
      a: dish.allergens,
      t: dish.tags,
      s: dish.menu_sections?.name || null,
    });

    if (dish_id) {
      const dishRes: PostgrestSingleResponse<MenuItem> = await supabase
        .from("menu_items")
        .select(
          `
          id,
          name,
          description,
          price,
          allergens,
          tags,
          menu_sections(name)
        `
        )
        .eq("id", dish_id)
        .single();

      if (dishRes.error) console.error("Dish fetch error:", dishRes.error);
      context = {
        restaurant: restaurant_name,
        dish: dishRes.data ? compressDish(dishRes.data) : null,
      };
    } else {
      const sectionsRes: PostgrestSingleResponse<MenuSection[]> = await supabase
        .from("menu_sections")
        .select(
          `
          name,
          menu_items (
            name,
            description,
            price,
            allergens,
            tags
          )
        `
        )
        .eq("restaurant_id", restaurant_id);

      if (sectionsRes.error)
        console.error("Sections fetch error:", sectionsRes.error);
      context = {
        restaurant: restaurant_name,
        sections: sectionsRes.data ? compressMenu(sectionsRes.data) : [],
      };
    }

    // --- 4. CALL OPENAI ---

    const systemPrompt = `
You are the AI assistant for ${restaurant_name}.
Use the provided JSON context (sections, dishes, or dish) to answer questions about the menu.
Keys: s=section, n=name, d=description, p=price, a=allergens, t=tags.

Treat the memory summary as background knowledge about the user — their usual preferences or past statements.
Always prioritize the user's most recent message to determine current intent.
If it slightly contradicts the memory, politely follow the new request while acknowledging relevant past info.

TONE & STYLE:
- When describing specific dish, use warm, sensory, and appetizing language
- Paint a picture: mention textures (creamy, crispy), flavors (rich, delicate), and experience
- Sound like a knowledgeable chef or sommelier who loves food
- Example: Instead of "tomato and mozzarella", say "fresh tomatoes paired with creamy mozzarella"

CONSTRAINTS:
- You can infer things, but only from the JSON and memory
- Never contradict the allergen data
- Always prioritize allergen safety over suggestiveness
- If a dish includes an allergen the user said they cannot have, explicitly state that it is NOT suitable
- If no suitable dishes exist, say so honestly
- Use language like "typically" or "usually" when uncertain
- Keep the format customer friendly. When listing items, limit to 2-3 maximum
- Keep answers concise (2-3 sentences max)
- Never fabricate ingredients or details not in the data
- Return plain text only
`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    if (summary) {
      messages.push({
        role: "system",
        content: `User memory summary:\n${summary}`,
      });
    }

    messages.push({
      role: "system",
      content: `Restaurant context:\n${JSON.stringify(context)}`,
    });

    if (recent.length) {
      for (const m of recent) {
        messages.push({ role: m.role as "user" | "assistant", content: m.content });
      }
    }

    messages.push({ role: "user", content: question });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 400,
      messages,
    });

    const answer =
      completion.choices[0].message?.content?.trim() || "No answer.";

    // --- MEMORY UPDATE & LOGGING ---
    await saveTurn(sid, question, answer);
    await updateSummary(sid, summary, question, answer, openai);

    await supabase.from("llm_logs").insert({
      restaurant_id,
      dish_id,
      question,
      answer,
      tokens: completion.usage?.total_tokens || 0,
    });

    return NextResponse.json({ answer, session_id: sid });
  } catch (err) {
    console.error("Error in /api/ask:", err);
    if (err instanceof Error) {
      return NextResponse.json(
        { error: "Internal Server Error", details: err.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Unknown server error" },
      { status: 500 }
    );
  }
}
