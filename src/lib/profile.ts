import type { SupabaseClient } from "@supabase/supabase-js"
import { runCandidateProfileAgent } from "@/lib/agents/candidateProfileAgent"
import { normalizeList } from "@/lib/api"
import type { CandidateProfileSummary, Profile } from "@/types"

export function normalizeProfile(data: Record<string, unknown>): Profile {
  return {
    id: 1,
    name: (data.name as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    resume_text: (data.resume_text as string | null) ?? null,
    candidate_profile_summary: (data.candidate_profile_summary as CandidateProfileSummary | null) ?? null,
    resume_filename: (data.resume_filename as string | null) ?? null,
    resume_storage_path: (data.resume_storage_path as string | null) ?? null,
    preferred_roles: normalizeList(data.preferred_roles),
    excluded_companies: normalizeList(data.excluded_companies),
    excluded_keywords: normalizeList(data.excluded_keywords),
    cover_letter_threshold: Number(data.cover_letter_threshold ?? process.env.COVER_LETTER_THRESHOLD ?? 60),
    dashboard_min_score: Number(data.dashboard_min_score ?? 0),
  }
}

export async function ensureCandidateProfileSummary(supabase: SupabaseClient, profile: Profile) {
  if (profile.candidate_profile_summary) {
    return profile
  }

  if (!profile.resume_text) {
    throw new Error("Upload a resume in Settings before analyzing jobs.")
  }

  const candidateProfileSummary = await runCandidateProfileAgent(profile.resume_text)
  const { error } = await supabase
    .from("profile")
    .update({
      candidate_profile_summary: candidateProfileSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)

  if (error) throw error

  return {
    ...profile,
    candidate_profile_summary: candidateProfileSummary,
  }
}
