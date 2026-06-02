import { NextResponse } from "next/server"
import { z } from "zod"
import {
  createAdminSessionToken,
  getAdminCookieName,
  getAdminSessionMaxAge,
  isAdminPassword,
} from "@/lib/admin-auth"
import { jsonError } from "@/lib/api"

export const runtime = "nodejs"

const loginSchema = z.object({
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const { password } = loginSchema.parse(await request.json())

    if (!process.env.ADMIN_PASSWORD) {
      return jsonError("Admin password is not configured.", 500)
    }

    if (!isAdminPassword(password)) {
      return jsonError("Incorrect password.", 401)
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set({
      name: getAdminCookieName(),
      value: await createAdminSessionToken(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getAdminSessionMaxAge(),
    })

    return response
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not sign in.", 400)
  }
}
