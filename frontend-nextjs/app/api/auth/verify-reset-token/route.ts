import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.BACKEND_CHAT_URL ? process.env.BACKEND_CHAT_URL.replace("/chat/chat", "") : "http://localhost:8000/api/v1";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.json({ detail: "Thiếu mã xác thực." }, { status: 400 });
    }

    try {
        const backendResponse = await fetch(`${API_BASE_URL}/auth/verify-reset-token?token=${token}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
        });

        const data = await backendResponse.json();
        return NextResponse.json(data, { status: backendResponse.status });
    } catch (error) {
        return NextResponse.json({ detail: "Lỗi kết nối server." }, { status: 500 });
    }
}
