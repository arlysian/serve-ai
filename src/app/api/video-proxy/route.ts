import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Get the URL from search params
  const videoUrl = req.nextUrl.searchParams.get("url");
  
  if (!videoUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Only allow proxying from Supabase storage
  if (!videoUrl.includes("supabase.co/storage")) {
    return NextResponse.json({ error: "Invalid video URL" }, { status: 403 });
  }
  
  // Re-encode spaces in the URL path for the fetch request
  const encodedUrl = videoUrl.replace(/ /g, '%20');

  try {
    // Fetch without Range header - Supabase returns JSON with Range requests
    const response = await fetch(encodedUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch video" },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "video/mp4";
    const contentLength = response.headers.get("content-length");

    const responseHeaders: HeadersInit = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Video proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy video" },
      { status: 500 }
    );
  }
}

