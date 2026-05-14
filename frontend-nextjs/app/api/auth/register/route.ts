import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = "http://localhost:8000/api/v1";

export async function POST(request: NextRequest) {
    try {
        const { email, password, full_name } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { detail: "Email và password là bắt buộc." },
                { status: 400 }
            );
        }

        const backendResponse = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, full_name: full_name || "Doctor" }),
            cache: "no-store",
        });

        const data = await backendResponse.json();

        if (!backendResponse.ok) {
            return NextResponse.json(
                { detail: data.detail || "Đăng ký thất bại." },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ detail: message }, { status: 500 });
    }
}
