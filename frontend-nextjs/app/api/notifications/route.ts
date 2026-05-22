import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_BASE_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    try {
        const res = await fetch(`${BACKEND}/api/v1/notifications/`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });
        const data = await res.json();
        return NextResponse.json(Array.isArray(data) ? data : [], { status: res.status });
    } catch {
        return NextResponse.json([], { status: 500 });
    }
}
