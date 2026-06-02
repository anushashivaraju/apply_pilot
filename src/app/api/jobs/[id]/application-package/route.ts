import { NextResponse } from "next/server"
import { z } from "zod"
import { runApplicationPackageAgent } from "@/lib/agents/applicationPackageAgent"
import { jsonError, normalizeList } from "@/lib/api"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import type { ApplicationStrategy, CandidateProfileSummary, MatchResult, Profile } from "@/types"

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

    const profile: Profile = {
      ...profileResult.data,
      candidate_profile_summary:
        (profileResult.data.candidate_profile_summary as CandidateProfileSummary | null) ?? null,
      preferred_roles: normalizeList(profileResult.data.preferred_roles),
      excluded_companies: normalizeList(profileResult.data.excluded_companies),
      excluded_keywords: normalizeList(profileResult.data.excluded_keywords),
    }

    if (!profile.resume_text) {
      return jsonError("Upload a resume in Settings before generating an application package.")
    }

    if (!profile.candidate_profile_summary) {
      return jsonError("Re-upload your resume in Settings to generate the candidate profile summary before generating an application package.")
    }

    if (!jobResult.data.match_data) {
      return jsonError("Analyze this job before generating an application package.")
    }

    const applicationPackage = await runApplicationPackageAgent({
      candidateProfileSummary: profile.candidate_profile_summary,
      originalResumeText: profile.resume_text,
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
