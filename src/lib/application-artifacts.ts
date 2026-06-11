import type { SupabaseClient } from "@supabase/supabase-js"

type ApplicationArtifactUpdates = {
  resume_tailoring_suggestions: string[]
  cover_letter: string
  salary_recommendation: string
  interview_questions: string[]
  interview_answers: string[]
  skills_to_emphasize: string[]
  gaps_to_prepare: string[]
}

const emptyPackage: ApplicationArtifactUpdates = {
  resume_tailoring_suggestions: [],
  cover_letter: "",
  salary_recommendation: "",
  interview_questions: [],
  interview_answers: [],
  skills_to_emphasize: [],
  gaps_to_prepare: [],
}

export async function updateApplicationArtifacts(
  supabase: SupabaseClient,
  jobId: string,
  updates: Partial<ApplicationArtifactUpdates>,
) {
  const existing = await supabase
    .from("job_application_package")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle()

  if (existing.error) throw existing.error

  const result = await supabase
    .from("job_application_package")
    .upsert(
      {
        ...emptyPackage,
        ...(existing.data ?? {}),
        ...updates,
        job_id: jobId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "job_id" },
    )
    .select("*")
    .single()

  if (result.error) throw result.error
  return result.data
}
