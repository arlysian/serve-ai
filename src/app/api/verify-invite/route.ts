import { NextResponse } from "next/server";

/**
 * This route redirects to Supabase's verification endpoint with the token,
 * which will then redirect back to our setup-password page.
 * This ensures the token is properly verified by Supabase.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const type = searchParams.get('type') || 'invite';

    if (!token) {
      return NextResponse.redirect(new URL('/auth/setup-password?error=missing_token', req.url));
    }

    // Get the site URL for redirect
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://serveai.net' : 'http://localhost:3000');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      return NextResponse.redirect(new URL('/auth/setup-password?error=server_error', req.url));
    }

    // Redirect to Supabase's verify endpoint, which will handle the token verification
    // and then redirect back to our setup-password page
    const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(token)}&type=${type}&redirect_to=${encodeURIComponent(`${siteUrl}/auth/setup-password`)}`;
    
    return NextResponse.redirect(verifyUrl);
  } catch (error) {
    console.error('Error in verify-invite:', error);
    return NextResponse.redirect(new URL('/auth/setup-password?error=server_error', req.url));
  }
}

