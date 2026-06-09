import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.BACKEND_CHAT_URL ? process.env.BACKEND_CHAT_URL.replace("/chat/chat", "") : "http://localhost:8000/api/v1";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type") || "overview";
        const days = searchParams.get("days") || "7";

        let endpoint = `${API_BASE_URL}/statistics/${type}`;

        // Chuyển tiếp toàn bộ query params sang backend
        const filteredParams = new URLSearchParams(searchParams);
        filteredParams.delete("type"); // Xóa type vì nó là một phần của path backend
        const queryString = filteredParams.toString();
        if (queryString) {
            endpoint += `?${queryString}`;
        }

        let authHeader = request.headers.get("Authorization");

        // Nếu không có header, thử lấy từ cookie
        if (!authHeader) {
            const token = request.cookies.get("access_token")?.value;
            if (token) {
                authHeader = `Bearer ${token}`;
            }
        }

        const backendResponse = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(authHeader ? { "Authorization": authHeader } : {})
            },
            cache: "no-store",
        });

        const data = await backendResponse.json();
        return NextResponse.json(data, { status: backendResponse.status });
    } catch (error) {
        return NextResponse.json({ detail: "Lỗi kết nối server." }, { status: 500 });
    }
}
