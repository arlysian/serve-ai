import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (!token) {
      return NextResponse.redirect(new URL('/auth/forgot-password?error=invalid_token', req.url));
    }

    // Use serveai.net as default in production, localhost for development
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://serveai.net' : 'http://localhost:3000');
    
    // Exchange the token with Supabase's verify endpoint
    // Supabase will redirect back with the access_token in the hash
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.redirect(new URL('/auth/forgot-password?error=configuration_error', req.url));
    }

    // Build the Supabase verify URL that will redirect back to our setup-password page
    const verifyUrl = new URL(`${supabaseUrl}/auth/v1/verify`);
    verifyUrl.searchParams.set('token', token);
    verifyUrl.searchParams.set('type', type || 'recovery');
    verifyUrl.searchParams.set('redirect_to', `${siteUrl}/auth/setup-password`);
    
    // Redirect to Supabase's verify endpoint, which will then redirect to our setup-password page
    return NextResponse.redirect(verifyUrl.toString());
  } catch (error) {
    console.error("Error in reset-password route:", error);
    return NextResponse.redirect(new URL('/auth/forgot-password?error=server_error', req.url));
  }
}

