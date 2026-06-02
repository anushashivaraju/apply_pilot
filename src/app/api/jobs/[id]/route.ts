import { NextResponse } from "next/server"
import { jsonError } from "@/lib/api"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { jobPatchSchema } from "@/lib/validation"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.from("jobs").select("*").eq("id", id).single()
    if (error) throw error

    const packageResult = await supabase
      .from("job_application_package")
      .select("*")
      .eq("job_id", id)
      .maybeSingle()

    if (packageResult.error) throw packageResult.error

    return NextResponse.json({
      ...data,
      application_package: packageResult.data ?? null,
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not load job.", 404)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = jobPatchSchema.parse(await request.json())
    const { data, error } = await getSupabaseAdmin()
      .from("jobs")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update job.", 400)
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error } = await getSupabaseAdmin().from("jobs").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not delete job.", 400)
  }
}
