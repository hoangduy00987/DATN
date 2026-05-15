import { NextRequest, NextResponse } from "next/server";

const rawBackend = process.env.BACKEND_CHAT_UPLOAD_URL || process.env.BACKEND_UPLOAD_URL || process.env.BACKEND_CHAT_URL;

function resolveUploadStreamUrl(): string | null {
    if (!rawBackend) return null;
    const cleaned = rawBackend.replace(/\/+$/, "");
    let uploadBase: string;
    if (cleaned.endsWith("/chat")) {
        uploadBase = `${cleaned}/upload`;
    } else if (cleaned.endsWith("/upload")) {
        uploadBase = cleaned;
    } else if (cleaned.endsWith("/chat-with-image")) {
        uploadBase = cleaned.replace(/\/chat-with-image$/, "/upload");
    } else {
        uploadBase = cleaned;
    }
    if (uploadBase.endsWith("/upload")) {
        return `${uploadBase}-stream`;
    }
    return `${uploadBase}/upload-stream`;
}

export async function POST(request: NextRequest) {
    try {
        const streamUrl = resolveUploadStreamUrl();
        if (!streamUrl) {
            return NextResponse.json({ detail: "Backend chat upload URL is not configured." }, { status: 500 });
        }

        const contentType = request.headers.get("content-type");
        const headers: Record<string, string> = {};
        if (contentType) headers["content-type"] = contentType;
        const token = request.cookies.get("access_token")?.value;
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const backendResponse = await fetch(streamUrl, {
            method: "POST",
            headers,
            body: request.body,
            // @ts-ignore duplex for streaming body forward
            duplex: "half",
            cache: "no-store",
        });

        if (!backendResponse.ok) {
            const text = await backendResponse.text();
            let detail = "Backend chat upload failed.";
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
