import type { ApplicationStrategy, CandidateProfileSummary, Job, MatchResult, Profile } from "@/types"
import { getOpenAI, getOpenAIGenerationModel } from "@/lib/openai"
import { interviewPrepSchema } from "@/lib/validation"

export async function runInterviewPrepAgent(input: {
  candidateProfileSummary: CandidateProfileSummary
  originalResumeText: string
  job: Pick<Job, "title" | "company" | "description">
  profile: Profile
  matchResult: MatchResult
  applicationStrategy: ApplicationStrategy | null
  language?: "english" | "german"
}) {
  const completion = await getOpenAI().chat.completions.create({
    model: getOpenAIGenerationModel(),
    messages: [
      {
        role: "system",
        content: `Create personalized interview preparation for one candidate and one job.

Rules:
- Ground suggested answers in the supplied resume only.
- Never invent achievements, metrics, employers, skills, or projects.
- Include likely role-specific, behavioral, and gap-testing questions.
- Answers should be concise talking points the candidate can adapt, not scripts to memorize.
- Explicitly identify weak areas or evidence the candidate should prepare.
- Return only valid JSON with the requested shape.
- Write in the requested language.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          language: input.language ?? "english",
          candidate: {
            name: input.profile.name,
            profile_summary: input.candidateProfileSummary,
            original_resume_text: input.originalResumeText,
          },
          job: input.job,
          match_result: input.matchResult,
          application_strategy: input.applicationStrategy,
          expected_json_shape: {
            interview_questions: [],
            interview_answers: [],
            gaps_to_prepare: [],
          },
        }),
      },
    ],
    response_format: { type: "json_object" },
  })

  const content = completion.choices[0]?.message.content ?? ""
  return interviewPrepSchema.parse(JSON.parse(content))
}
