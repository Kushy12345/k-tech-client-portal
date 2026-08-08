import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  DEFAULT_AUTHENTICATED_REDIRECT,
  DEFAULT_UNAUTHENTICATED_REDIRECT,
} from "@/lib/constants";

const PUBLIC_AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthPath = PUBLIC_AUTH_PATHS.some((path) => pathname.startsWith(path));
  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin");

  // Signed-out users hitting a protected route are bounced to /login,
  // with a redirect param so we can send them back after signing in.
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_UNAUTHENTICATED_REDIRECT;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Signed-in users don't need to see auth screens again.
  if (user && isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_AUTHENTICATED_REDIRECT;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and image optimization files,
     * so auth state stays fresh across the whole app.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
