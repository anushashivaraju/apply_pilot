import type { ApplicationStrategy, CandidateProfileSummary, Job, MatchResult, Profile } from "@/types"
import { getOpenAI, getOpenAIGenerationModel } from "@/lib/openai"

export async function runCoverLetterAgent(input: {
  candidateProfileSummary: CandidateProfileSummary
  originalResumeText: string
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
        content: `Write a deeply personalized motivation letter or cover letter for one specific role.

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
- claims that are only loosely supported by the resume
- listing technologies without explaining why they matter for this role

Focus on:
- 2-3 concrete, relevant proof points from the original resume
- why this exact role, product, domain, or company context makes sense for the candidate
- the value the candidate brings to the employer's actual problems
- the practical application strategy
- the candidate's natural application style
- important gaps only when they matter, reframed through learning ability or adjacent experience

Structure:
- do not include sender address, recipient address, date, or subject line; the PDF template adds those
- begin directly with the salutation
- salutation
- strong opening connected specifically to the role and company
- 3-4 short body paragraphs, each with a distinct purpose
- concise sign-off with the candidate's name

Personalization standard:
- Every paragraph should contain information that would change for a different role or candidate.
- Use the full resume as the source of truth and select the strongest relevant evidence.
- Mirror the job's priorities naturally without copying the posting.
- If company research notes are absent, personalize from the company's domain and job description only.

Length:
300-450 words, suitable for a one-page A4 letter.

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
            original_resume_text: input.originalResumeText,
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
