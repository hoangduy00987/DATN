import { NextRequest, NextResponse } from "next/server";

const BACKEND_DETECT_URL = process.env.BACKEND_DETECT_URL || process.env.BACKEND_UPLOAD_URL || process.env.BACKEND_CHAT_UPLOAD_URL;

export async function POST(request: NextRequest) {
  try {
    if (!BACKEND_DETECT_URL) {
      return NextResponse.json({ detail: "Backend detect URL is not configured." }, { status: 500 });
    }

    // Forward the incoming multipart/form-data body to the backend detect endpoint
    const contentType = request.headers.get("content-type");
    const headers: Record<string, string> = {};
    if (contentType) headers["content-type"] = contentType;

    // Forward the request body directly to avoid Buffer/Edge runtime issues
    const backendResponse = await fetch(BACKEND_DETECT_URL, {
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
      payload = { raw: text };
    }

    if (!backendResponse.ok) {
      return NextResponse.json({ detail: payload?.detail || "Backend detect failed." }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
