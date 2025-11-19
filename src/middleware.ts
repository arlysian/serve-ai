import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { sign } from "./lib/sign";
import { verifyAdminCookie } from "./lib/adminAuth";

export async function middleware(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Handle admin routes
  if (pathname.startsWith("/admin")) {
    // Allow access to login page
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    // Check admin cookie for other admin routes
    const cookieHeader = req.headers.get("cookie");
    const isAuthenticated = await verifyAdminCookie(cookieHeader);

    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    return NextResponse.next();
  }

  // Handle regular session cookie for non-admin routes
  const res = NextResponse.next();

  const cookie = req.headers.get("cookie");
  const match = cookie?.match(/(?:^|;\s*)sess=([^;]+)/);
  const existing = match?.[1];

  if (!existing) {
    const id = nanoid();
    const signature = await sign(id);

    res.cookies.set("sess", `${id}.${signature}`, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 6,
    });
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico|images|fonts).*)"],
};
