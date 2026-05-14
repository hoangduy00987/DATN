import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.BACKEND_CHAT_URL ? process.env.BACKEND_CHAT_URL.replace("/chat/chat", "") : "http://localhost:8000/api/v1";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get("taskId");

        if (!taskId) {
            return NextResponse.json({ detail: "Missing taskId" }, { status: 400 });
        }

        const BACKEND_STATUS_URL = `${API_BASE_URL}/ingest/ingest/status/${taskId}`;

        const headers: Record<string, string> = {};
        const token = request.cookies.get("access_token")?.value;
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const backendResponse = await fetch(BACKEND_STATUS_URL, {
            method: "GET",
            headers,
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
                { detail: payload?.detail || "Lỗi khi kiểm tra trạng thái." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(payload, { status: backendResponse.status });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ detail: message }, { status: 500 });
    }
}
