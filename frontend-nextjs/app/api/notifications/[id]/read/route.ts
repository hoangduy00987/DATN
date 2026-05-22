import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_BASE_URL || "http://localhost:8000";

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    try {
        const res = await fetch(`${BACKEND}/api/v1/notifications/${params.id}/read`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ detail: "Error" }, { status: 500 });
    }
}
