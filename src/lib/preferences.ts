import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

export async function extractPreferences(
  message: string,
  sections: MenuSection[]
): Promise<string[] | null> {
  // Compress menu for the prompt
  const menuForPrompt = sections.map(s => ({
    section: s.name,
    items: (s.menu_items || []).map(item => ({
      name: item.name,
      description: item.description || "",
      tags: item.tags || [],
    }))
  }));

  const prompt = `
you are semantic filtering agent. 
You will receive Json with the restaurant menu, now you check the user request, see if it includes some preferences ("pasta without garlic", "etc." ). 
You return the name of the dishes that DO NOT fit this preference. 
Important: If all dishes fit, or user question is not about the preferences, return null.
- If a preference is detected → return {"exclude": ["Dish Name 1", "Dish Name 2", ...]}

User message:
"${message}"

Menu:
${JSON.stringify(menuForPrompt, null, 2)}
`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.0,
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt }
      ]
    });

    const parsed = JSON.parse(r.choices[0].message.content || "{}");
    if (parsed.exclude === null) return null;
    if (Array.isArray(parsed.exclude)) return parsed.exclude;
    return null;
  } catch {
    return null;
  }
}

