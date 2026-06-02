import { NextResponse } from "next/server"
import { jsonError, normalizeList } from "@/lib/api"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { profileUpdateSchema } from "@/lib/validation"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("profile")
      .select("*")
      .eq("id", 1)
      .single()

    if (error) throw error

    return NextResponse.json({
      ...data,
      preferred_roles: normalizeList(data.preferred_roles),
      excluded_companies: normalizeList(data.excluded_companies),
      excluded_keywords: normalizeList(data.excluded_keywords),
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not load profile.", 500)
  }
}

export async function PUT(request: Request) {
  try {
    const payload = profileUpdateSchema.parse(await request.json())
    const { data, error } = await getSupabaseAdmin()
      .from("profile")
      .update({
        ...payload,
        email: payload.email || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update profile.", 400)
  }
}

