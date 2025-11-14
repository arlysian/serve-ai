import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function extractAllergens(message: string): Promise<string[] | null> {
  const prompt = `
Extract ONLY explicit food allergens or intolerances the user says they CANNOT eat.

OUTPUT RULES:
- If the message does NOT clearly state an allergy/intolerance → return {"allergens": null}
- If the user explicitly states an allergy or intolerance → return {"allergens": ["milk","gluten",...]}
- Normalize allergens to this exact vocabulary:
  milk, lactose, gluten, nuts, peanuts, sesame, soy, egg, fish, shellfish, mustard, celery, sulphites, molluscs, lupin, dairy
- Do NOT infer allergies from vegan/vegetarian/halal/kosher/spicy/diet preferences.
- Return ONLY JSON.

User message:
"${message}"
`;

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.0,
    max_tokens: 80,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt }
    ]
  });

  try {
    const parsed = JSON.parse(r.choices[0].message.content || "{}");
    if (parsed.allergens === null) return null;        // no allergy info
    if (Array.isArray(parsed.allergens)) return parsed.allergens; // explicit allergies
    return null;
  } catch {
    return null;
  }
}
