import { NextRequest, NextResponse } from "next/server";

/** Ví dụ BACKEND_CHAT_URL: http://localhost:8000/api/v1/chat/chat → .../chat/chat-stream */
function getBackendChatStreamUrl(): string | null {
    const base = process.env.BACKEND_CHAT_URL?.replace(/\/$/, "");
    if (!base) return null;
    if (base.endsWith("/chat")) {
        return `${base}-stream`;
    }
    return `${base}/chat-stream`;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const query = typeof body?.query === "string" ? body.query.trim() : "";

        if (!query) {
            return NextResponse.json({ detail: "Query cannot be empty." }, { status: 400 });
        }

        const streamUrl = getBackendChatStreamUrl();
        if (!streamUrl) {
            return NextResponse.json({ detail: "Backend chat URL is not configured." }, { status: 500 });
        }

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const token = request.cookies.get("access_token")?.value;
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const backendResponse = await fetch(streamUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ query }),
            cache: "no-store",
        });

        if (!backendResponse.ok) {
            const text = await backendResponse.text();
            let detail = "Backend request failed.";
            try {
                const j = text ? JSON.parse(text) : {};
                if (typeof j?.detail === "string") detail = j.detail;
            } catch {
                if (text && !text.trimStart().startsWith("<")) detail = text.slice(0, 500);
            }
            return NextResponse.json({ detail }, { status: backendResponse.status });
        }

        if (!backendResponse.body) {
            return NextResponse.json({ detail: "Empty stream from backend." }, { status: 502 });
        }

        return new Response(backendResponse.body, {
            status: 200,
            headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ detail: message }, { status: 500 });
    }
}
