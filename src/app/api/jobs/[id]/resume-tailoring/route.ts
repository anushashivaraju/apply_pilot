import { NextResponse } from "next/server"
import { runResumeTailoringAgent } from "@/lib/agents/resumeTailoringAgent"
import { updateApplicationArtifacts } from "@/lib/application-artifacts"
import { jsonError } from "@/lib/api"
import { ensureCandidateProfileSummary, normalizeProfile } from "@/lib/profile"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import type { ApplicationStrategy, MatchResult } from "@/types"

export const runtime = "nodejs"

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()
    const profileResult = await supabase.from("profile").select("*").eq("id", 1).single()
    const jobResult = await supabase.from("jobs").select("*").eq("id", id).single()

    if (profileResult.error) throw profileResult.error
    if (jobResult.error) throw jobResult.error

    let profile = normalizeProfile(profileResult.data)
    if (!profile.resume_text) return jsonError("Upload a resume before generating resume modifications.")
    const originalResumeText = profile.resume_text

    profile = await ensureCandidateProfileSummary(supabase, profile)
    if (!profile.candidate_profile_summary) throw new Error("Candidate profile summary is unavailable.")
    if (!jobResult.data.match_data) return jsonError("Analyze this job before generating resume modifications.")

    const result = await runResumeTailoringAgent({
      candidateProfileSummary: profile.candidate_profile_summary,
      originalResumeText,
      profile,
      job: jobResult.data,
      matchResult: jobResult.data.match_data as MatchResult,
      applicationStrategy: (jobResult.data.application_strategy as ApplicationStrategy | null) ?? null,
    })

    return NextResponse.json(await updateApplicationArtifacts(supabase, id, result))
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not generate resume modifications.", 400)
  }
}
