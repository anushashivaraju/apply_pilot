import type { CandidateProfileSummary, MatchResult, Profile } from "@/types"
import { getOpenAI, getOpenAIAnalysisModel } from "@/lib/openai"
import { matchResultSchema } from "@/lib/validation"

const systemPrompt = `You are an expert technical recruiter and career coach.
Evaluate the job description against the candidate resume and return a structured JSON match analysis.

Scoring rubric:
80-100 = strong: candidate meets most important requirements, role fits experience level and career direction.
50-79 = moderate: possible fit, but there are meaningful gaps or lower-priority alignment.
0-49 = weak: significant skill gaps, wrong seniority, wrong domain, or poor location/work-model fit.

Priority:
apply_now = strong fit and worth prioritizing.
maybe = possible fit; apply only if the candidate is interested.
skip = weak fit or poor use of application time.

Weight heavily:
- core technical skills overlap
- seniority and experience alignment
- AI/ML/software engineering relevance
- full-stack/backend/frontend relevance
- location and work-model compatibility
- candidate preferences
- excluded companies and excluded keywords

Do not only summarize the match. Include practical application strategy:
- what angle to use in the cover letter
- what angle to use in resume tailoring
- interview risks or gaps to prepare for

Return only valid JSON.
No markdown.
No preamble.`

export async function runMatchingAgent(input: {
  candidateProfileSummary: CandidateProfileSummary
  jobDescription: string
  profile: Profile
}): Promise<MatchResult> {
  const userPrompt = JSON.stringify({
    candidate_profile_summary: input.candidateProfileSummary,
    job_description: input.jobDescription,
    candidate_preferences: {
      preferred_roles: input.profile.preferred_roles,
      excluded_companies: input.profile.excluded_companies,
      excluded_keywords: input.profile.excluded_keywords,
    },
    expected_json_shape: {
      score: 82,
      tier: "strong",
      priority: "apply_now",
      summary: "",
      matched_skills: [],
      missing_skills: [],
      nice_to_have_skills: [],
      recommended: true,
      reasoning: "",
      application_strategy: "",
      cover_letter_angle: "",
      resume_angle: "",
      interview_risks: [],
    },
  })

  const call = async () => {
    const completion = await getOpenAI().chat.completions.create({
      model: getOpenAIAnalysisModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    })

    return completion.choices[0]?.message.content ?? ""
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const content = await call()
    try {
      return matchResultSchema.parse(JSON.parse(content))
    } catch {
      if (attempt === 1) {
        throw new Error("AI returned invalid JSON after retry.")
      }
    }
  }

  throw new Error("AI analysis failed.")
}
