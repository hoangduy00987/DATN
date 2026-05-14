import { NextResponse } from "next/server";

function clearAuthCookie(response: NextResponse, name: string) {
    response.cookies.set({
        name,
        value: "",
        httpOnly: true,
        path: "/",
        maxAge: 0,
        sameSite: "strict",
    });
}

export async function POST() {
    const response = NextResponse.json({ success: true });
    clearAuthCookie(response, "access_token");
    clearAuthCookie(response, "refresh_token");
    clearAuthCookie(response, "user_role");
    return response;
}
