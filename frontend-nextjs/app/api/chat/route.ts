import { NextRequest, NextResponse } from "next/server";

const BACKEND_CHAT_URL = process.env.BACKEND_CHAT_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ detail: "Query cannot be empty." }, { status: 400 });
    }

    if (!BACKEND_CHAT_URL) {
      return NextResponse.json({ detail: "Backend chat URL is not configured." }, { status: 500 });
    }
    const response = await fetch(BACKEND_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });

    const text = await response.text();
    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { detail: "Backend trả về định dạng không phải JSON (có thể là trang HTML lỗi)." };
    }

    if (!response.ok) {
      return NextResponse.json(
        { detail: payload?.detail || "Backend request failed." },
        { status: response.status }
      );
    }

    return NextResponse.json({ answer: payload?.answer || "Không có phản hồi." }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
