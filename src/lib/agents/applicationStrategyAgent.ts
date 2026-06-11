import type { ApplicationStrategy, CandidateProfileSummary, Job, MatchResult, Profile } from "@/types"
import { getOpenAI, getOpenAIAnalysisModel } from "@/lib/openai"
import { applicationStrategySchema } from "@/lib/validation"

const systemPrompt = `You are a practical career advisor helping the candidate decide whether a job is worth applying to.

Return only:
- whether the candidate should apply now, maybe apply, or skip
- a concise decision summary
- the strongest reasons the role fits
- the material concerns or risks

Be honest but supportive.
Do not invent experience.
Do not flatter.
Prioritize realistic application decisions.
Do not generate resume modifications, cover-letter guidance, interview preparation, or salary advice.
Those belong to separate on-demand application materials.
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
