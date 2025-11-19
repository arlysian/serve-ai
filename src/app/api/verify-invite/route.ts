import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const type = searchParams.get('type') || 'invite';

    if (!token) {
      return NextResponse.redirect(new URL('/auth/setup-password?error=missing_token', req.url));
    }

    // Exchange the token with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as 'invite' | 'recovery',
    });

    if (error) {
      const errorMessage = error.message?.includes('expired') 
        ? 'expired' 
        : 'invalid';
      return NextResponse.redirect(new URL(`/auth/setup-password?error=${errorMessage}`, req.url));
    }

    if (data?.user) {
      // Token verified successfully, redirect to setup password page
      // The user session is now established, so they can set their password
      return NextResponse.redirect(new URL('/auth/setup-password', req.url));
    }

    // If we get here, something went wrong
    return NextResponse.redirect(new URL('/auth/setup-password?error=verification_failed', req.url));
  } catch (error) {
    console.error('Error in verify-invite:', error);
    return NextResponse.redirect(new URL('/auth/setup-password?error=server_error', req.url));
  }
}

