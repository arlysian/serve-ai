import { NextResponse } from "next/server";
import { createClient, PostgrestSingleResponse } from "@supabase/supabase-js";
import OpenAI from "openai";
import { verify } from "../../../lib/sign";
import {
  getOrCreateSession,
  loadMemory,
  saveTurn,
  updateSummary,
} from "../../../lib/memory";
import { checkRateLimit } from "../../../lib/rateLimit";
import { extractAllergens } from "../../../lib/allergens";

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
}

interface MenuSection {
  name: string;
  menu_items?: MenuItem[];
}

interface Restaurant {
  name: string;
}

//PARSE COOKIE HELPER
function parseCookie(str?: string | null) {
  if (!str) return {};
  try {
    return Object.fromEntries(
      str.split(";").map(v => {
        const [k, val] = v.trim().split("=");
        return [k, val || ""];
      })
    );
  } catch {
    return {};
  }
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}


// --- FILTER HELPER ---
const filterMenuByAllergens = (
  sections: MenuSection[],
  allergens: string[]
): MenuSection[] => {
  if (allergens.length === 0) return sections;

  return sections.map(section => ({
    ...section,
    menu_items: (section.menu_items || []).filter(item => {
      const itemAllergens = item.allergens || [];
      return !itemAllergens.some(a => allergens.includes(a));
    })
  }));
};

// --- COMPRESSOR ---
const compressMenu = (sections: MenuSection[]) =>
  sections.map(s => ({
    s: s.name,
    i: (s.menu_items || []).map(m => ({
      n: m.name,
      d: m.description ? m.description.slice(0, 120) : "",
      p: m.price,
      a: m.allergens,
      t: m.tags,
    })),
  }));

// --- 3. HANDLER ---
export async function POST(req: Request) {
  
  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookie(cookieHeader);
  const sess = cookies["sess"];

  if (!sess) return unauthorized();

  const [id, sig] = sess.split(".");
  if (!id || !sig || !(await verify(id, sig))) {
    return unauthorized();
  }

  try {
    const body = await req.json() as {
      restaurant_id?: string;
      question?: string;
      session_id?: string;
    };

    const { restaurant_id, question, session_id } = body;

    // --- VALIDATION ---
    if (!restaurant_id || !question) {
      return NextResponse.json(
        { error: "Missing restaurant_id or question" },
        { status: 400 }
      );
    }

    if (question.length > 800) {
      return NextResponse.json(
        { error: "Message too long. Maximum 800 characters allowed." },
        { status: 400 }
      );
    }

    // --- RATE LIMITING ---
    const sessionIdentifier = session_id || "no-session";
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown-ip";

    // 6 requests per minute per session
    const sessionLimited = !(await checkRateLimit(
      `session:${sessionIdentifier}`,
      6,
      60 * 1000
    ));
    // 30 requests per minute per IP
    const ipLimited = !(await checkRateLimit(
      `ip:${ipAddress}`,
      30,
      60 * 1000
    ));
    // 300 requests per day per IP
    const ipDailyLimited = !(await checkRateLimit(
      `ip-daily:${ipAddress}`,
      300,
      24 * 60 * 60 * 1000
    ));
    if (sessionLimited || ipLimited || ipDailyLimited) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before trying again.", retryAfter: 60 },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // --- SESSION & MEMORY ---
    const sid = await getOrCreateSession(restaurant_id, session_id);
    const { summary, recent, allergens: sessionAllergens } = await loadMemory(sid);

    // --- EXTRACT CURRENT TURN ALLERGENS ---
    const extracted = await extractAllergens(question);

    // --- MERGE ALLERGENS (SESSION + NEW) ---
    let mergedAllergens = [...sessionAllergens];
    if (extracted && extracted.length > 0) {
      mergedAllergens = Array.from(new Set([...mergedAllergens, ...extracted]));
    }

    // --- FETCH RESTAURANT NAME ---
    const restaurantRes: PostgrestSingleResponse<Restaurant> = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", restaurant_id)
      .single();

    const restaurant_name = restaurantRes.data?.name || "";

    // --- FETCH & FILTER MENU SECTIONS ---
    const sectionsRes: PostgrestSingleResponse<MenuSection[]> = await supabase
      .from("menu_sections")
      .select(`
        name,
        menu_items (
          name,
          description,
          price,
          allergens,
          tags
        )
      `)
      .eq("restaurant_id", restaurant_id);

    const rawSections = sectionsRes.data ?? [];
    const filteredSections = filterMenuByAllergens(rawSections, mergedAllergens);

    // --- CONTEXT (ALWAYS SECTIONS MODE) ---
    const context = {
      restaurant: restaurant_name,
      sections: compressMenu(filteredSections),
    };

    // --- 4. OPENAI CALL ---
    const systemPrompt = `
You are the AI assistant for ${restaurant_name}.
Use the provided JSON context (sections, dishes, or dish) to answer questions about the menu.
The JSON is filtered by allergens, meaning you can safely recommend dishes that are in it. 
Keys: s=section, n=name, d=description, p=price, a=allergens, t=tags.

Treat the memory summary as background knowledge about the user — their usual preferences or past statements.
Always prioritize the user's most recent message to determine current intent.

TONE & STYLE:
- When describing specific dish, use warm, sensory, and appetizing language
- Paint a picture: mention textures (creamy, crispy), flavors (rich, delicate), and experience
- Sound like a knowledgeable chef or sommelier who loves food
- Example: Instead of "tomato and mozzarella", say "fresh tomatoes paired with creamy mozzarella"

CONSTRAINTS:
- You can infer things, but only from the JSON and memory
- Use language like "typically" or "usually" when uncertain
- Keep the format customer friendly. When listing items, limit to 2-3 maximum
- Keep answers concise (2-3 sentences max)
- Never fabricate ingredients or details not in the data
- Return plain text only
- Use dish names only from the JSON data and output them exactly as written. Never translate, abbreviate, or adjust the dish names.
`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "system", content: `Restaurant context:\n${JSON.stringify(context)}` }
    ];

    for (const m of recent) {
      messages.push({ role: m.role as "user" | "assistant", content: m.content });
    }

    messages.push({ role: "user", content: question });

    // --- STREAMING SETUP ---
    const stream = new ReadableStream({
      async start(controller) {
        let fullAnswer = "";
        let totalTokens = 0;

        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.2,
            max_tokens: 400,
            messages,
            stream: true,
          });

          // Stream chunks to client
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullAnswer += content;
              // Send chunk to client
              const data = `data: ${JSON.stringify({ content, done: false })}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
            
            // Track token usage
            if (chunk.usage?.total_tokens) {
              totalTokens = chunk.usage.total_tokens;
            }
          }

          // Send final message
          const finalData = `data: ${JSON.stringify({ done: true, session_id: sid })}\n\n`;
          controller.enqueue(new TextEncoder().encode(finalData));
          controller.close();

          // --- MEMORY UPDATE (after streaming completes) ---
          const answer = fullAnswer.trim() || "No answer.";
          await saveTurn(sid, question, answer);
          await updateSummary(sid, summary, question, answer, openai);

          // --- UPDATE ALLERGEN MEMORY ---
          await supabase
            .from("chat_memory")
            .upsert({ session_id: sid, allergens: mergedAllergens }, { onConflict: "session_id" });

          // --- LOGGING ---
          await supabase.from("llm_logs").insert({
            restaurant_id,
            question,
            answer,
            tokens: totalTokens || 0,
          });
        } catch (error) {
          console.error("Streaming error:", error);
          const errorData = `data: ${JSON.stringify({ error: "Streaming failed", done: true })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (err) {
    console.error("Error in /api/chat:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
