import { NextResponse, type NextRequest } from "next/server"
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-auth"

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/api/auth/login") {
    return NextResponse.next()
  }

  const isAuthenticated = await verifyAdminSessionToken(request.cookies.get(getAdminCookieName())?.value)
  if (isAuthenticated) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|xml|json)).*)",
  ],
}
