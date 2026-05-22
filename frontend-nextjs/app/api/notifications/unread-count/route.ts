import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_BASE_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
        return NextResponse.json({ unread_count: 0 }, { status: 200 });
    }

    try {
        const res = await fetch(`${BACKEND}/api/v1/notifications/unread-count`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });
        const data = await res.json();
        return NextResponse.json({ unread_count: data?.unread_count ?? 0 });
    } catch {
        return NextResponse.json({ unread_count: 0 });
    }
}
