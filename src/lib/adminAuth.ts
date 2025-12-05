import { createClient } from "@supabase/supabase-js";

const ADMIN_COOKIE_NAME = "admin-auth";

// Get admin user IDs from environment variable (comma-separated)
function getAdminUserIds(): string[] {
  const adminIds = process.env.ADMIN_USER_IDS || "";
  return adminIds.split(",").map(id => id.trim()).filter(Boolean);
}

/**
 * Verify admin access via Supabase auth token
 * Checks if the authenticated user is in the list of admin user IDs
 */
export async function verifyAdminAuth(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;
  
  const token = authHeader.replace("Bearer ", "");
  if (!token) return false;
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return false;
    
    // Check if user ID is in the admin list
    const adminIds = getAdminUserIds();
    return adminIds.includes(user.id);
  } catch {
    return false;
  }
}

/**
 * @deprecated Use verifyAdminAuth instead for better security
 * Verify admin cookie (legacy method - kept for backwards compatibility)
 */
export async function verifyAdminCookie(cookieHeader: string | null): Promise<boolean> {
  // This method is deprecated - use verifyAdminAuth with Bearer token instead
  // For now, we'll keep it working but it requires the ADMIN_SECRET env var
  if (!cookieHeader) return false;
  
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`));
  const cookieValue = match?.[1];
  
  if (!cookieValue) return false;
  
  // Verify against ADMIN_SECRET (more secure than signing "admin")
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.warn("ADMIN_SECRET not set - admin cookie auth disabled");
    return false;
  }
  
  return cookieValue === adminSecret;
}

/**
 * Get admin cookie name
 */
export function getAdminCookieName(): string {
  return ADMIN_COOKIE_NAME;
}
