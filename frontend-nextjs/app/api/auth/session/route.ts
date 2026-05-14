import { NextRequest, NextResponse } from "next/server";

const LEGIT = new Set(["doctor", "patient", "admin"]);

export async function GET(request: NextRequest) {
  const raw = request.cookies.get("user_role")?.value;
  const role = raw && LEGIT.has(raw) ? raw : null;
  return NextResponse.json({ role });
}
