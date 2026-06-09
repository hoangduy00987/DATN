import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.BACKEND_CHAT_URL ? process.env.BACKEND_CHAT_URL.replace("/chat/chat", "") : "http://localhost:8000/api/v1";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        let authHeader = request.headers.get("Authorization");

        // Nếu không có header, lấy từ cookie (giống logic statistics)
        if (!authHeader) {
            const token = request.cookies.get("access_token")?.value;
            if (token) {
                authHeader = `Bearer ${token}`;
            }
        }

        const backendResponse = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authHeader ? { "Authorization": authHeader } : {})
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const data = await backendResponse.json();
        return NextResponse.json(data, { status: backendResponse.status });
    } catch (error) {
        return NextResponse.json({ detail: "Lỗi kết nối server." }, { status: 500 });
    }
}
