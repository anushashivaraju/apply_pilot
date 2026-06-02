import type { CandidateProfileSummary } from "@/types"
import { getOpenAI, getOpenAIAnalysisModel } from "@/lib/openai"
import { candidateProfileSummarySchema } from "@/lib/validation"

const systemPrompt = `You convert a resume into a compact candidate profile JSON for job matching and cover letter generation.

Preserve facts from the resume. Do not infer unsupported credentials, employers, degrees, locations, or years.
Keep the JSON compact but specific enough for technical recruiting decisions.
Also extract the candidate's application positioning:
- strongest selling points
- proof points from work/projects
- career direction
- preferred roles
- topics to emphasize
- topics to avoid or downplay
- tone for applications
Return only valid JSON.
No markdown.
No preamble.`

export async function runCandidateProfileAgent(resumeText: string): Promise<CandidateProfileSummary> {
  const completion = await getOpenAI().chat.completions.create({
    model: getOpenAIAnalysisModel(),
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          resume_text: resumeText,
          expected_json_shape: {
            headline: "",
            years_experience: null,
            seniority: null,
            target_roles: [],
            core_skills: [],
            technical_skills: [],
            domains: [],
            notable_experience: [],
            education: [],
            certifications: [],
            work_preferences: [],
            constraints: [],
            summary: "",
            positioning_statement: "",
            strongest_selling_points: [],
            proof_points: [],
            preferred_application_tone: "",
            topics_to_avoid_or_downplay: [],
            career_direction: "",
          },
        }),
      },
    ],
    response_format: { type: "json_object" },
  })

  const content = completion.choices[0]?.message.content ?? ""
  return candidateProfileSummarySchema.parse(JSON.parse(content))
}
