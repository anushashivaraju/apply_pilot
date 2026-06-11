import { NextResponse } from "next/server"
import { z } from "zod"
import { runInterviewPrepAgent } from "@/lib/agents/interviewPrepAgent"
import { updateApplicationArtifacts } from "@/lib/application-artifacts"
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
    if (!profile.resume_text) return jsonError("Upload a resume before generating interview preparation.")
    const originalResumeText = profile.resume_text

    profile = await ensureCandidateProfileSummary(supabase, profile)
    if (!profile.candidate_profile_summary) throw new Error("Candidate profile summary is unavailable.")
    if (!jobResult.data.match_data) return jsonError("Analyze this job before generating interview preparation.")

    const result = await runInterviewPrepAgent({
      candidateProfileSummary: profile.candidate_profile_summary,
      originalResumeText,
      profile,
      job: jobResult.data,
      matchResult: jobResult.data.match_data as MatchResult,
      applicationStrategy: (jobResult.data.application_strategy as ApplicationStrategy | null) ?? null,
      language: options.language,
    })

    return NextResponse.json(await updateApplicationArtifacts(supabase, id, result))
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not generate interview preparation.", 400)
  }
}
