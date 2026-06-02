import type { ApplicationStrategy, CandidateProfileSummary, Job, MatchResult, Profile } from "@/types"
import { getOpenAI, getOpenAIAnalysisModel } from "@/lib/openai"
import { applicationStrategySchema } from "@/lib/validation"

const systemPrompt = `You are a practical career advisor helping the candidate decide how to approach a job application.

Do not only summarize the match.
Give application strategy.

Return:
- whether the candidate should apply now, maybe apply, or skip
- why
- what to emphasize
- what to downplay
- what gaps to prepare for
- best cover letter angle
- resume tailoring suggestions
- interview preparation points
- salary positioning when there is enough context

Be honest but supportive.
Do not invent experience.
Do not flatter.
Prioritize realistic application decisions.
Return only valid JSON.
No markdown.
No preamble.`

export async function runApplicationStrategyAgent(input: {
  candidateProfileSummary: CandidateProfileSummary
  job: Pick<Job, "title" | "company" | "location" | "remote_type" | "description">
  profile: Profile
  matchResult: MatchResult
}): Promise<ApplicationStrategy> {
  const userPrompt = JSON.stringify({
    candidate: {
      name: input.profile.name,
      email: input.profile.email,
      profile_summary: input.candidateProfileSummary,
      preferences: {
        preferred_roles: input.profile.preferred_roles,
        excluded_companies: input.profile.excluded_companies,
        excluded_keywords: input.profile.excluded_keywords,
      },
    },
    job: input.job,
    match_result: input.matchResult,
    expected_json_shape: {
      priority: "apply_now",
      decision_summary: "",
      why_this_role_fits: [],
      concerns: [],
      what_to_emphasize: [],
      what_to_downplay: [],
      cover_letter_angle: "",
      resume_tailoring_suggestions: [],
      interview_preparation_points: [],
      salary_positioning: null,
    },
  })

  const completion = await getOpenAI().chat.completions.create({
    model: getOpenAIAnalysisModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  })

  const content = completion.choices[0]?.message.content ?? ""
  return applicationStrategySchema.parse(JSON.parse(content))
}
