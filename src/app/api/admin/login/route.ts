import { NextResponse } from "next/server";
import { createAdminCookie, getAdminCookieName } from "@/lib/adminAuth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password } = body;

    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      console.error("ADMIN_PASSWORD environment variable is not set");
      return NextResponse.json(
        { error: "Admin authentication not configured" },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const cookieValue = await createAdminCookie();
    const cookieName = getAdminCookieName();

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

