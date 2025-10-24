// memory.ts
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function getOrCreateSession(restaurant_id: string, session_id?: string) {
  if (session_id) {
    await sb.from("chat_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", session_id);
    return session_id;
  }
  const { data, error } = await sb.from("chat_sessions").insert({ restaurant_id }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function loadMemory(session_id: string) {
  const [{ data: mem }, { data: msgs }] = await Promise.all([
    sb.from("chat_memory").select("summary,prefs").eq("session_id", session_id).maybeSingle(),
    sb.from("chat_messages").select("role,content").eq("session_id", session_id)
      .order("created_at", { ascending: false }).limit(6)
  ]);
  return {
    summary: mem?.summary ?? "",
    prefs: mem?.prefs ?? {},
    recent: (msgs ?? []).reverse() // oldest → newest
  };
}

export async function saveTurn(session_id: string, userQ: string, assistantA: string) {
  await sb.from("chat_messages").insert([
    { session_id, role: "user", content: userQ },
    { session_id, role: "assistant", content: assistantA }
  ]);
}

export async function updateSummary(session_id: string, oldSummary: string, userQ: string, assistantA: string, openai: any) {
  // Ultra-cheap summarizer: keep deterministic & short; 4o-mini with low tokens.
  const prompt = `
Update the session summary (≤ 800 chars). Keep only stable facts and explicit user preferences.
Do NOT include prices; store diet constraints only as stated by the user.
Existing summary:
"""${oldSummary}"""
New turn:
User: "${userQ}"
Assistant: "${assistantA}"
Return only the updated summary.`;

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.0,
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }]
  });
  const updated = r.choices[0].message.content?.trim() ?? oldSummary;
  await sb.from("chat_memory")
    .upsert({ session_id, summary: updated }, { onConflict: "session_id" });
}

