import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const LOGIN_PATH = "/login";
const CHAT_PATH = "/chat";

function hasSessionCookie(request: NextRequest): boolean {
  const access = request.cookies.get("access_token")?.value;
  const refresh = request.cookies.get("refresh_token")?.value;
  return Boolean(access || refresh);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = hasSessionCookie(request);

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = loggedIn ? CHAT_PATH : LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    if (loggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = CHAT_PATH;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === CHAT_PATH || pathname.startsWith(`${CHAT_PATH}/`)) {
    if (!loggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = LOGIN_PATH;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/login/:path*", "/chat", "/chat/:path*"],
};
