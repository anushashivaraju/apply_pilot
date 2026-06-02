import { z } from "zod"

function stringifyProfileItem(value: unknown) {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (!value || typeof value !== "object") return ""

  const record = value as Record<string, unknown>
  return Object.values(record)
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .filter((item): item is string | number | boolean => ["string", "number", "boolean"].includes(typeof item))
    .map(String)
    .filter(Boolean)
    .join(" - ")
}

const profileStringArraySchema = z.preprocess((value) => {
  if (!Array.isArray(value)) return value
  return value.map(stringifyProfileItem).filter(Boolean)
}, z.array(z.string()))

const aiStringSchema = z.preprocess(stringifyProfileItem, z.string())
const aiStringArraySchema = z.preprocess((value) => {
  if (value == null) return []
  if (!Array.isArray(value)) return [stringifyProfileItem(value)].filter(Boolean)
  return value.map(stringifyProfileItem).filter(Boolean)
}, z.array(z.string()))

const prioritySchema = z.preprocess((value) => {
  if (typeof value !== "string") return value
  const normalized = value.toLowerCase().replaceAll(" ", "_").replaceAll("-", "_")
  if (normalized.includes("apply")) return "apply_now"
  if (normalized.includes("maybe")) return "maybe"
  if (normalized.includes("skip")) return "skip"
  return normalized
}, z.enum(["apply_now", "maybe", "skip"]))

const tierSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value
  return value.toLowerCase()
}, z.enum(["strong", "moderate", "weak"]))

export const matchResultSchema = z.object({
  score: z.coerce.number().int().min(0).max(100),
  tier: tierSchema,
  priority: prioritySchema,
  summary: aiStringSchema,
  matched_skills: aiStringArraySchema,
  missing_skills: aiStringArraySchema,
  nice_to_have_skills: aiStringArraySchema,
  recommended: z.coerce.boolean(),
  reasoning: aiStringSchema,
  application_strategy: aiStringSchema,
  cover_letter_angle: aiStringSchema,
  resume_angle: aiStringSchema,
  interview_risks: aiStringArraySchema,
})

export const applicationStrategySchema = z.object({
  priority: prioritySchema,
  decision_summary: aiStringSchema,
  why_this_role_fits: aiStringArraySchema,
  concerns: aiStringArraySchema,
  what_to_emphasize: aiStringArraySchema,
  what_to_downplay: aiStringArraySchema,
  cover_letter_angle: aiStringSchema,
  resume_tailoring_suggestions: aiStringArraySchema,
  interview_preparation_points: aiStringArraySchema,
  salary_positioning: aiStringSchema.nullable(),
})

export const applicationPackageSchema = z.object({
  resume_tailoring_suggestions: z.array(z.string()),
  cover_letter: z.string().min(1),
  salary_recommendation: z.string().min(1),
  interview_questions: z.array(z.string()),
  interview_answers: z.array(z.string()),
  skills_to_emphasize: z.array(z.string()),
  gaps_to_prepare: z.array(z.string()),
})

export const candidateProfileSummarySchema = z.object({
  headline: z.string(),
  years_experience: z.number().nullable(),
  seniority: z.string().nullable(),
  target_roles: profileStringArraySchema,
  core_skills: profileStringArraySchema,
  technical_skills: profileStringArraySchema,
  domains: profileStringArraySchema,
  notable_experience: profileStringArraySchema,
  education: profileStringArraySchema,
  certifications: profileStringArraySchema,
  work_preferences: profileStringArraySchema,
  constraints: profileStringArraySchema,
  summary: z.string(),
  positioning_statement: z.string(),
  strongest_selling_points: profileStringArraySchema,
  proof_points: profileStringArraySchema,
  preferred_application_tone: z.string(),
  topics_to_avoid_or_downplay: profileStringArraySchema,
  career_direction: z.string(),
})

export const jobInputSchema = z.object({
  source_type: z.enum(["linkedin", "company_career_page", "manual", "other"]),
  source_url: z.string().url().optional().or(z.literal("")),
  title: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  remote_type: z.enum(["remote", "hybrid", "on-site"]).optional().nullable().or(z.literal("")),
  description: z.string().min(1, "Job description is required"),
})

export const profileUpdateSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  preferred_roles: z.array(z.string()),
  excluded_companies: z.array(z.string()),
  excluded_keywords: z.array(z.string()),
  cover_letter_threshold: z.number().int().min(0).max(100),
  dashboard_min_score: z.number().int().min(0).max(100),
})

export const jobPatchSchema = z.object({
  status: z.enum(["new", "saved", "applied", "dismissed"]).optional(),
  notes: z.string().nullable().optional(),
  application_date: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  salary_range: z.string().nullable().optional(),
  work_model: z.string().nullable().optional(),
  cover_letter: z.string().nullable().optional(),
})
