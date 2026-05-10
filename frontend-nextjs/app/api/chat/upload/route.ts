import { NextRequest, NextResponse } from "next/server";

const rawBackend = process.env.BACKEND_CHAT_UPLOAD_URL || process.env.BACKEND_UPLOAD_URL || process.env.BACKEND_CHAT_URL;

// Normalize target: if a chat URL was provided (ends with /chat), prefer its /upload alias.
let BACKEND_CHAT_UPLOAD_URL: string | undefined = undefined;
if (rawBackend) {
  const cleaned = rawBackend.replace(/\/+$/, "");
  if (cleaned.endsWith("/chat")) {
    BACKEND_CHAT_UPLOAD_URL = cleaned + "/upload";
  } else if (cleaned.endsWith("/chat-with-image")) {
    BACKEND_CHAT_UPLOAD_URL = cleaned;
  } else if (cleaned.endsWith("/upload") || cleaned.endsWith("/upload/")) {
    BACKEND_CHAT_UPLOAD_URL = cleaned;
  } else {
    // assume the provided URL is already the correct upload endpoint
    BACKEND_CHAT_UPLOAD_URL = cleaned;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!BACKEND_CHAT_UPLOAD_URL) {
      return NextResponse.json({ detail: "Backend chat upload URL is not configured." }, { status: 500 });
    }

    const contentType = request.headers.get("content-type");
    const headers: Record<string, string> = {};
    if (contentType) headers["content-type"] = contentType;

    const backendResponse = await fetch(BACKEND_CHAT_UPLOAD_URL, {
      method: "POST",
      headers,
      body: request.body,
      // Required in some runtimes (Next.js / edge) when forwarding request body streams
      // See: RequestInit duplex option
      // @ts-ignore
      duplex: "half",
      cache: "no-store",
    });

    const text = await backendResponse.text();
    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { detail: "Backend trả về định dạng không phải JSON (có thể là trang HTML lỗi)." };
    }

    if (!backendResponse.ok) {
      return NextResponse.json({ detail: payload?.detail || "Backend chat upload failed." }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
