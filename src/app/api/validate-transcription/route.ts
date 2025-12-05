import { NextResponse } from "next/server";
import OpenAI from "openai";
import { verify } from "@/lib/sign";
import { checkRateLimit } from "@/lib/rateLimit";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Parse cookie helper
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

export async function POST(req: Request) {
  // --- SESSION VERIFICATION ---
  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookie(cookieHeader);
  const sess = cookies["sess"];

  if (!sess) return unauthorized();

  const [id, sig] = sess.split(".");
  if (!id || !sig || !(await verify(id, sig))) {
    return unauthorized();
  }

  // --- RATE LIMITING ---
  // 20 validations per minute per session
  const isAllowed = await checkRateLimit(`validate:${id}`, 20, 60 * 1000);
  if (!isAllowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();

    // Check if text is semantically meaningful and relevant
    // This filters out hallucinations, random noise, or completely irrelevant text
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a semantic validator. Your job is to determine if a transcribed text is:
1. Semantically meaningful (not random words, gibberish, or hallucinations)
2. Context: this is dialogue between a customer and an AI assistant in a restaurant context. You can allow for inference. 
3. Don't be too strict. Allow for exceptions. Allow greetings, small talk, closure.
4. Not just background noise, microphone clicks, or empty audio artifacts
Return ONLY "valid" if the text is meaningful and relevant, or "invalid" if it's gibberish, hallucinations, or completely irrelevant.`
        },
        {
          role: "user",
          content: `Validate this transcription: "${trimmedText}"`
        }
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const validation = response.choices[0]?.message?.content?.toLowerCase().trim();
    const isValid = validation === "valid";

    return NextResponse.json({ 
      valid: isValid,
      text: isValid ? trimmedText : null
    });

  } catch (err) {
    console.error("Error in /api/validate-transcription:", err);
    // On error, be conservative and return invalid
    return NextResponse.json(
      { valid: false, text: null },
      { status: 200 }
    );
  }
}
