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
  // 20 transcriptions per minute per session
  const isAllowed = await checkRateLimit(`transcribe:${id}`, 20, 60 * 1000);
  if (!isAllowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Convert File to a format Whisper can use
    // OpenAI SDK expects a File-like object with stream() method
    const audioBuffer = await audioFile.arrayBuffer();
    
    // Create a File object for OpenAI (needs proper name and type)
    const file = new File([audioBuffer], "audio.webm", { 
      type: audioFile.type || "audio/webm" 
    });

    // Transcribe using Whisper with auto language detection
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      // language: undefined means auto-detect
      response_format: "text",
    });

    // When response_format is "text", transcription is a string directly
    return NextResponse.json({ 
      text: transcription as string
    });

  } catch (err) {
    console.error("Error in /api/transcribe:", err);
    return NextResponse.json(
      { error: "Transcription failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
