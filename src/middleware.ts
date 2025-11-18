import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { sign } from "./lib/sign";

export async function middleware(req: Request) {
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
