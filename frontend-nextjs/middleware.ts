import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const LOGIN_PATH = "/login";
const CHAT_PATH = "/chat";
const PATIENT_HOME = "/chat/dat-lich";

const CHAT_ROLES = new Set(["doctor", "admin"]);
const LEGIT_ROLES = new Set(["doctor", "patient", "admin"]);

function getBackendApiBase(): string {
  if (process.env.BACKEND_CHAT_URL) {
    return process.env.BACKEND_CHAT_URL.replace("/chat/chat", "").replace(/\/$/, "");
  }
  return "http://localhost:8000/api/v1";
}

function hasSessionCookie(request: NextRequest): boolean {
  const access = request.cookies.get("access_token")?.value;
  const refresh = request.cookies.get("refresh_token")?.value;
  return Boolean(access || refresh);
}

function cookieUserRole(request: NextRequest): string | null {
  const v = request.cookies.get("user_role")?.value;
  if (!v || !LEGIT_ROLES.has(v)) return null;
  return v;
}

function applyUserRoleCookie(res: NextResponse, role: string) {
  res.cookies.set({
    name: "user_role",
    value: role,
    httpOnly: true,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
    sameSite: "strict",
  });
}

async function roleFromVerifiedJwt(
  token: string,
  expectedType: "access" | "refresh"
): Promise<string | null> {
  const secret = process.env.JWT_SECRET ?? "supersecretkey123";
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    if (payload.type !== expectedType) return null;
    const r = payload.role;
    if (typeof r === "string" && LEGIT_ROLES.has(r)) return r;
    return null;
  } catch {
    return null;
  }
}

async function roleFromMeApi(accessToken: string): Promise<string | null> {
  try {
    const url = `${getBackendApiBase()}/auth/me`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { role?: string };
    const role = data.role;
    if (typeof role === "string" && LEGIT_ROLES.has(role)) return role;
    return null;
  } catch {
    return null;
  }
}

/** Cookie user_role, hoặc đọc từ JWT /auth/me (phiên cũ thiếu cookie). */
async function resolveEffectiveRole(request: NextRequest): Promise<{
  role: string | null;
  syncUserRoleCookie: boolean;
}> {
  const fromCookie = cookieUserRole(request);
  if (fromCookie) {
    return { role: fromCookie, syncUserRoleCookie: false };
  }

  const access = request.cookies.get("access_token")?.value;
  const refresh = request.cookies.get("refresh_token")?.value;

  let resolved: string | null = null;

  if (access) {
    resolved = await roleFromVerifiedJwt(access, "access");
    if (!resolved) {
      resolved = await roleFromMeApi(access);
    }
  }
  if (!resolved && refresh) {
    resolved = await roleFromVerifiedJwt(refresh, "refresh");
  }

  if (resolved) {
    return { role: resolved, syncUserRoleCookie: true };
  }
  return { role: null, syncUserRoleCookie: false };
}

function canUseDoctorChat(role: string | null): boolean {
  return role != null && CHAT_ROLES.has(role);
}

/** Trang đặt lịch / kết quả — chỉ role patient. */
function isPatientPortalPath(pathname: string): boolean {
  return (
    pathname === "/chat/dat-lich" ||
    pathname.startsWith("/chat/dat-lich/") ||
    pathname === "/chat/ket-qua" ||
    pathname.startsWith("/chat/ket-qua/")
  );
}

function redirectToLogin(request: NextRequest, reason: "patient" | "forbidden" | "reauth") {
  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.search = `reason=${reason}`;
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = hasSessionCookie(request);
  const { role, syncUserRoleCookie } = await resolveEffectiveRole(request);
  const doctorChatOk = canUseDoctorChat(role);

  const patch = (res: NextResponse) => {
    if (syncUserRoleCookie && role) applyUserRoleCookie(res, role);
    return res;
  };

  if (pathname === "/") {
    if (!loggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = LOGIN_PATH;
      url.search = "";
      return patch(NextResponse.redirect(url));
    }
    if (!role) {
      return patch(redirectToLogin(request, "reauth"));
    }
    if (doctorChatOk) {
      const url = request.nextUrl.clone();
      url.pathname = CHAT_PATH;
      return patch(NextResponse.redirect(url));
    }
    if (role === "patient") {
      const url = request.nextUrl.clone();
      url.pathname = PATIENT_HOME;
      return patch(NextResponse.redirect(url));
    }
    return patch(redirectToLogin(request, "patient"));
  }

  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    if (loggedIn && doctorChatOk) {
      const url = request.nextUrl.clone();
      url.pathname = CHAT_PATH;
      return patch(NextResponse.redirect(url));
    }
    if (loggedIn && role === "patient") {
      const url = request.nextUrl.clone();
      url.pathname = PATIENT_HOME;
      return patch(NextResponse.redirect(url));
    }
    return patch(NextResponse.next());
  }

  if (pathname === CHAT_PATH || pathname.startsWith(`${CHAT_PATH}/`)) {
    if (!loggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = LOGIN_PATH;
      url.search = "";
      return patch(NextResponse.redirect(url));
    }
    if (!role) {
      return patch(redirectToLogin(request, "reauth"));
    }

    if (pathname === "/chat/lich-da-dat" || pathname.startsWith("/chat/lich-da-dat/")) {
      return patch(NextResponse.next());
    }

    if (isPatientPortalPath(pathname)) {
      if (role === "patient") {
        return patch(NextResponse.next());
      }
      const url = request.nextUrl.clone();
      url.pathname = CHAT_PATH;
      url.search = "";
      return patch(NextResponse.redirect(url));
    }

    if (!doctorChatOk) {
      if (role === "patient") {
        const url = request.nextUrl.clone();
        url.pathname = PATIENT_HOME;
        return patch(NextResponse.redirect(url));
      }
      return patch(redirectToLogin(request, "forbidden"));
    }

    return patch(NextResponse.next());
  }

  return patch(NextResponse.next());
}

export const config = {
  matcher: ["/", "/login", "/login/:path*", "/chat", "/chat/:path*"],
};
