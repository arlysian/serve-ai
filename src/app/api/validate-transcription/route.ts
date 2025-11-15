import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
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

