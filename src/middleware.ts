import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { sign } from "./lib/sign";

export const config = {
  // Exclude API routes from middleware - they handle their own auth
  matcher: ["/((?!_next|static|favicon.ico|images|fonts|api).*)"],
};

export async function middleware(req: Request) {
  // Handle regular session cookie for all routes
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
