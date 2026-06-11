import type { ApplicationStrategy, CandidateProfileSummary, Job, MatchResult, Profile } from "@/types"
import { getOpenAI, getOpenAIGenerationModel } from "@/lib/openai"
import { resumeTailoringSchema } from "@/lib/validation"

export async function runResumeTailoringAgent(input: {
  candidateProfileSummary: CandidateProfileSummary
  originalResumeText: string
  job: Pick<Job, "title" | "company" | "description">
  profile: Profile
  matchResult: MatchResult
  applicationStrategy: ApplicationStrategy | null
}) {
  const completion = await getOpenAI().chat.completions.create({
    model: getOpenAIGenerationModel(),
    messages: [
      {
        role: "system",
        content: `Create a precise resume modification plan for one job.

Rules:
- Never invent or inflate facts.
- Never rewrite the entire resume.
- Base every suggestion on the supplied original resume.
- Make each suggestion directly actionable and identify the exact resume section.
- Prefer stronger phrasing, ordering, emphasis, and relevant keywords already supported by evidence.
- Include 5-10 high-value changes, not cosmetic filler.
- Return only valid JSON with the requested shape.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          candidate: {
            name: input.profile.name,
            profile_summary: input.candidateProfileSummary,
            original_resume_text: input.originalResumeText,
          },
          job: input.job,
          match_result: input.matchResult,
          application_strategy: input.applicationStrategy,
          expected_json_shape: {
            resume_tailoring_suggestions: ["Section -> specific edit"],
            skills_to_emphasize: [],
            gaps_to_prepare: [],
          },
        }),
      },
    ],
    response_format: { type: "json_object" },
  })

  const content = completion.choices[0]?.message.content ?? ""
  return resumeTailoringSchema.parse(JSON.parse(content))
}
