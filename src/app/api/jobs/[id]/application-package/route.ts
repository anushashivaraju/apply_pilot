import { NextResponse } from "next/server"
import { z } from "zod"
import { runApplicationPackageAgent } from "@/lib/agents/applicationPackageAgent"
import { jsonError } from "@/lib/api"
import { ensureCandidateProfileSummary, normalizeProfile } from "@/lib/profile"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import type { ApplicationStrategy, MatchResult } from "@/types"

export const runtime = "nodejs"

const generationSchema = z.object({
  language: z.enum(["english", "german"]).optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rawBody = await request.text()
    const options = rawBody ? generationSchema.parse(JSON.parse(rawBody)) : {}
    const supabase = getSupabaseAdmin()
    const profileResult = await supabase.from("profile").select("*").eq("id", 1).single()
    const jobResult = await supabase.from("jobs").select("*").eq("id", id).single()

    if (profileResult.error) throw profileResult.error
    if (jobResult.error) throw jobResult.error

    let profile = normalizeProfile(profileResult.data)

    if (!profile.resume_text) {
      return jsonError("Upload a resume in Settings before generating an application package.")
    }
    const resumeText = profile.resume_text

    profile = await ensureCandidateProfileSummary(supabase, profile)
    const candidateProfileSummary = profile.candidate_profile_summary
    if (!candidateProfileSummary) {
      throw new Error("Could not generate your resume profile summary. Try uploading the resume again.")
    }

    if (!jobResult.data.match_data) {
      return jsonError("Analyze this job before generating an application package.")
    }

    const applicationPackage = await runApplicationPackageAgent({
      candidateProfileSummary,
      originalResumeText: resumeText,
      profile,
      job: jobResult.data,
      matchResult: jobResult.data.match_data as MatchResult,
      applicationStrategy: (jobResult.data.application_strategy as ApplicationStrategy | null) ?? null,
      language: options.language,
    })

    const packageResult = await supabase
      .from("job_application_package")
      .upsert(
        {
          job_id: id,
          ...applicationPackage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "job_id" }
      )
      .select("*")
      .single()

    if (packageResult.error) throw packageResult.error

    await supabase
      .from("jobs")
      .update({
        cover_letter: packageResult.data.cover_letter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    return NextResponse.json(packageResult.data)
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not generate application package.", 400)
  }
}
