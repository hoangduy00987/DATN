import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.BACKEND_CHAT_URL ? process.env.BACKEND_CHAT_URL.replace("/chat/chat", "") : "http://localhost:8000/api/v1";
const BACKEND_INGEST_URL = `${API_BASE_URL}/ingest/ingest`;

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get("content-type");
        const headers: Record<string, string> = {};
        if (contentType) headers["content-type"] = contentType;
        const token = request.cookies.get("access_token")?.value;
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const backendResponse = await fetch(BACKEND_INGEST_URL, {
            method: "POST",
            headers,
            body: request.body,
            // @ts-ignore
            duplex: "half",
            cache: "no-store",
        });

        const text = await backendResponse.text();
        let payload: any = {};
        try {
            payload = text ? JSON.parse(text) : {};
        } catch {
            payload = { detail: "Backend trả về định dạng không hợp lệ." };
        }

        if (!backendResponse.ok) {
            return NextResponse.json(
                { detail: payload?.detail || "Lỗi khi upload tài liệu." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(payload, { status: backendResponse.status });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ detail: message }, { status: 500 });
    }
}
