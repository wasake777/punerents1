import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/adminSession";

// Gate every /admin page behind the session cookie. Server actions re-check
// on their own (defense in depth); this just keeps the pages themselves from
// rendering for strangers.

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!password || !token || !(await verifySession(token, password))) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
