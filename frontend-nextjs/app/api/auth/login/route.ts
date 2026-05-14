import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.BACKEND_CHAT_URL ? process.env.BACKEND_CHAT_URL.replace("/chat/chat", "") : "http://localhost:8000/api/v1";

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ detail: "Email và password là bắt buộc." }, { status: 400 });
        }

        const BACKEND_LOGIN_URL = `${API_BASE_URL}/auth/login`;

        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const backendResponse = await fetch(BACKEND_LOGIN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
            cache: "no-store",
        });

        const data = await backendResponse.json();

        if (!backendResponse.ok) {
            return NextResponse.json({ detail: data.detail || "Đăng nhập thất bại" }, { status: backendResponse.status });
        }

        const response = NextResponse.json({ success: true });

        // Set HTTPOnly Cookie for access_token (1 hour)
        response.cookies.set({
            name: "access_token",
            value: data.access_token,
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60, // 1 hour
            sameSite: "strict",
        });

        // Set HTTPOnly Cookie for refresh_token (7 days)
        response.cookies.set({
            name: "refresh_token",
            value: data.refresh_token,
            httpOnly: true,
            path: "/",
            maxAge: 7 * 24 * 60 * 60, // 7 days
            sameSite: "strict",
        });

        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ detail: message }, { status: 500 });
    }
}
