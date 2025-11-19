import { sign, verify } from "./sign";

const ADMIN_COOKIE_NAME = "admin-auth";

/**
 * Verify admin cookie
 */
export async function verifyAdminCookie(cookieHeader: string | null): Promise<boolean> {
  if (!cookieHeader) return false;
  
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`));
  const cookieValue = match?.[1];
  
  if (!cookieValue) return false;
  
  const [id, sig] = cookieValue.split(".");
  if (!id || !sig) return false;
  
  return await verify(id, sig);
}

/**
 * Create admin cookie value
 */
export async function createAdminCookie(): Promise<string> {
  const id = "admin";
  const signature = await sign(id);
  return `${id}.${signature}`;
}

/**
 * Get admin cookie name
 */
export function getAdminCookieName(): string {
  return ADMIN_COOKIE_NAME;
}

