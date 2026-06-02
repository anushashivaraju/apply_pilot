import { NextResponse } from "next/server"
import { z } from "zod"
import { runCoverLetterAgent } from "@/lib/agents/coverLetterAgent"
import { jsonError } from "@/lib/api"
import { ensureCandidateProfileSummary, normalizeProfile } from "@/lib/profile"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import type { ApplicationStrategy } from "@/types"

export const runtime = "nodejs"

const generationSchema = z.object({
  language: z.enum(["english", "german"]).optional(),
  company_research_notes: z.string().optional().nullable(),
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
      return jsonError("Upload a resume in Settings before generating a cover letter.")
    }

    profile = await ensureCandidateProfileSummary(supabase, profile)
    const candidateProfileSummary = profile.candidate_profile_summary
    if (!candidateProfileSummary) {
      throw new Error("Could not generate your resume profile summary. Try uploading the resume again.")
    }

    if (!jobResult.data.match_data) {
      return jsonError("Analyze this job before generating a cover letter.")
    }

    const coverLetter = await runCoverLetterAgent({
      candidateProfileSummary,
      profile,
      job: jobResult.data,
      matchResult: jobResult.data.match_data,
      applicationStrategy: (jobResult.data.application_strategy as ApplicationStrategy | null) ?? null,
      language: options.language,
      companyResearchNotes: options.company_research_notes,
    })

    const { data, error } = await supabase
      .from("jobs")
      .update({
        cover_letter: coverLetter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ cover_letter: data.cover_letter })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not generate cover letter.", 400)
  }
}
