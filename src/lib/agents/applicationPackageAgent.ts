import type { ApplicationStrategy, CandidateProfileSummary, Job, MatchResult, Profile } from "@/types"
import { getOpenAI, getOpenAIGenerationModel } from "@/lib/openai"
import { applicationPackageSchema } from "@/lib/validation"

const systemPrompt = `You are an AI job application assistant.
Generate a complete application package only after the user requests it.

Truthfulness rules:
- Never overwrite or mutate the original resume.
- Never invent skills, experience, companies, dates, degrees, certifications, metrics, or achievements.
- Do not generate a full rewritten resume.
- Provide practical resume tailoring suggestions based only on the original resume and candidate profile summary.
- Suggestions can reorder, rephrase, and emphasize existing content, but must not create new facts.

Salary recommendation rules:
- Use job location, seniority, role title, company type signals, and candidate experience.
- Return a realistic salary range with a confidence level.
- If salary data is uncertain, clearly say so.
- Do not present salary as guaranteed.

Return only valid JSON.
No markdown.
No preamble.`

export async function runApplicationPackageAgent(input: {
  candidateProfileSummary: CandidateProfileSummary
  originalResumeText: string
  job: Pick<Job, "title" | "company" | "location" | "remote_type" | "description">
  profile: Profile
  matchResult: MatchResult
  applicationStrategy: ApplicationStrategy | null
  language?: "english" | "german"
}) {
  const userPrompt = JSON.stringify({
    candidate: {
      name: input.profile.name,
      email: input.profile.email,
      profile_summary: input.candidateProfileSummary,
      original_resume_text: input.originalResumeText,
    },
    job: input.job,
    match_result: input.matchResult,
    application_strategy: input.applicationStrategy,
    language: input.language ?? "english",
    expected_json_shape: {
      resume_tailoring_suggestions: [],
      cover_letter: "",
      salary_recommendation: "",
      interview_questions: [],
      interview_answers: [],
      skills_to_emphasize: [],
      gaps_to_prepare: [],
    },
  })

  const call = async () => {
    const completion = await getOpenAI().chat.completions.create({
      model: getOpenAIGenerationModel(),
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
      return applicationPackageSchema.parse(JSON.parse(content))
    } catch {
      if (attempt === 1) {
        throw new Error("AI returned invalid application package JSON after retry.")
      }
    }
  }

  throw new Error("AI application package generation failed.")
}
