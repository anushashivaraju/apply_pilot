import { z } from "zod"

export const matchResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  tier: z.enum(["strong", "moderate", "weak"]),
  priority: z.enum(["apply_now", "maybe", "skip"]),
  summary: z.string(),
  matched_skills: z.array(z.string()),
  missing_skills: z.array(z.string()),
  nice_to_have_skills: z.array(z.string()),
  recommended: z.boolean(),
  reasoning: z.string(),
  application_strategy: z.string(),
  cover_letter_angle: z.string(),
  resume_angle: z.string(),
  interview_risks: z.array(z.string()),
})

export const applicationStrategySchema = z.object({
  priority: z.enum(["apply_now", "maybe", "skip"]),
  decision_summary: z.string(),
  why_this_role_fits: z.array(z.string()),
  concerns: z.array(z.string()),
  what_to_emphasize: z.array(z.string()),
  what_to_downplay: z.array(z.string()),
  cover_letter_angle: z.string(),
  resume_tailoring_suggestions: z.array(z.string()),
  interview_preparation_points: z.array(z.string()),
  salary_positioning: z.string().nullable(),
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
  target_roles: z.array(z.string()),
  core_skills: z.array(z.string()),
  technical_skills: z.array(z.string()),
  domains: z.array(z.string()),
  notable_experience: z.array(z.string()),
  education: z.array(z.string()),
  certifications: z.array(z.string()),
  work_preferences: z.array(z.string()),
  constraints: z.array(z.string()),
  summary: z.string(),
  positioning_statement: z.string(),
  strongest_selling_points: z.array(z.string()),
  proof_points: z.array(z.string()),
  preferred_application_tone: z.string(),
  topics_to_avoid_or_downplay: z.array(z.string()),
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
