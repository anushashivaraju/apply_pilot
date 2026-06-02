import type { ApplicationStrategy, CandidateProfileSummary, Job, MatchResult, Profile } from "@/types"
import { getOpenAI, getOpenAIGenerationModel } from "@/lib/openai"

export async function runCoverLetterAgent(input: {
  candidateProfileSummary: CandidateProfileSummary
  job: Pick<Job, "title" | "company" | "description">
  profile: Profile
  matchResult: MatchResult
  applicationStrategy?: ApplicationStrategy | null
  language?: "english" | "german"
  companyResearchNotes?: string | null
}) {
  const completion = await getOpenAI().chat.completions.create({
    model: getOpenAIGenerationModel(),
    messages: [
      {
        role: "system",
        content: `Generate a tailored cover letter.

Tone:
- warm
- confident
- specific
- human
- direct
- thoughtful
- not overly corporate
- not generic
- not boastful
- not too long

Avoid:
- "I am excited to apply"
- "I am passionate about"
- generic filler
- repeating the CV
- overclaiming experience
- inventing skills, roles, companies, dates, degrees, or achievements
- sounding robotic

Focus on:
- the value the candidate brings
- the practical application strategy
- the candidate's natural application style
- important gaps only when they matter, reframed through learning ability or adjacent experience

Structure:
- strong opening connected to role/company
- 2-3 specific reasons I fit
- one paragraph connecting my working style/interests to the company
- concise closing

Length:
250-350 words.

Language:
Write in the requested language. If German is requested, use natural professional German, not translated English.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          language: input.language ?? "english",
          candidate: {
            name: input.profile.name,
            email: input.profile.email,
            profile_summary: input.candidateProfileSummary,
          },
          job: input.job,
          match_result: input.matchResult,
          application_strategy: input.applicationStrategy ?? null,
          company_research_notes: input.companyResearchNotes ?? null,
        }),
      },
    ],
  })

  return completion.choices[0]?.message.content?.trim() ?? ""
}
