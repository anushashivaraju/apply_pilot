import { NextResponse } from "next/server"
import { z } from "zod"
import { runCoverLetterAgent } from "@/lib/agents/coverLetterAgent"
import { updateApplicationArtifacts } from "@/lib/application-artifacts"
import { jsonError } from "@/lib/api"
import { ensureCandidateProfileSummary, normalizeProfile } from "@/lib/profile"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import type { ApplicationStrategy } from "@/types"

export const runtime = "nodejs"

const generationSchema = z.object({
  language: z.enum(["english", "german"]).optional(),
  company_research_notes: z.string().optional().nullable(),
})

const updateSchema = z.object({
  cover_letter: z.string(),
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
    const originalResumeText = profile.resume_text

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
      originalResumeText,
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

    const applicationPackage = await updateApplicationArtifacts(supabase, id, { cover_letter: coverLetter })

    return NextResponse.json({
      cover_letter: data.cover_letter,
      application_package: applicationPackage,
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not generate cover letter.", 400)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { cover_letter } = updateSchema.parse(await request.json())
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from("jobs")
      .update({
        cover_letter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) throw error

    const applicationPackage = await updateApplicationArtifacts(supabase, id, { cover_letter })
    return NextResponse.json({ cover_letter, application_package: applicationPackage })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save cover letter.", 400)
  }
}
