const SECRET = process.env.SESSION_SECRET!;

function encode(str: string) {
  return new TextEncoder().encode(str);
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encode(value));
  return toHex(new Uint8Array(signature));
}

export async function verify(value: string, sig: string): Promise<boolean> {
  const expected = await sign(value);

  if (expected.length !== sig.length) return false;

  let valid = 0;
  for (let i = 0; i < expected.length; i++) {
    valid |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return valid === 0;
}
