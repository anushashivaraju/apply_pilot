export interface Job {
  id: string

  source_type: "linkedin" | "company_career_page" | "manual" | "other"
  source_url: string | null

  title: string | null
  company: string | null
  location: string | null
  remote_type: "remote" | "hybrid" | "on-site" | null

  description: string

  posted_date: string | null
  fetched_at: string | null
  created_at: string
  updated_at: string

  match_score: number | null
  match_score_5: number | null
  match_tier: "strong" | "moderate" | "weak" | null
  match_summary: string | null
  match_data: MatchResult | null
  application_strategy: ApplicationStrategy | null
  worth_applying: boolean | null
  recommendation_reason: string | null

  cover_letter: string | null
  application_package?: JobApplicationPackage | null

  status: "new" | "saved" | "applied" | "dismissed"

  notes: string | null
  application_date: string | null
  deadline: string | null
  contact_person: string | null
  contact_email: string | null
  salary_range: string | null
  work_model: string | null
}

export interface MatchResult {
  score: number
  tier: "strong" | "moderate" | "weak"
  priority: "apply_now" | "maybe" | "skip"
  summary: string
  matched_skills: string[]
  missing_skills: string[]
  nice_to_have_skills: string[]
  recommended: boolean
  reasoning: string
  application_strategy: string
  cover_letter_angle: string
  resume_angle: string
  interview_risks: string[]
}

export interface ApplicationStrategy {
  priority: "apply_now" | "maybe" | "skip"
  decision_summary: string
  why_this_role_fits: string[]
  concerns: string[]
  what_to_emphasize: string[]
  what_to_downplay: string[]
  cover_letter_angle: string
  resume_tailoring_suggestions: string[]
  interview_preparation_points: string[]
  salary_positioning: string | null
}

export interface JobApplicationPackage {
  id: string
  job_id: string
  resume_tailoring_suggestions: string[]
  cover_letter: string
  salary_recommendation: string
  interview_questions: string[]
  interview_answers: string[]
  skills_to_emphasize: string[]
  gaps_to_prepare: string[]
  created_at: string
  updated_at: string
}

export interface CandidateProfileSummary {
  headline: string
  years_experience: number | null
  seniority: string | null
  target_roles: string[]
  core_skills: string[]
  technical_skills: string[]
  domains: string[]
  notable_experience: string[]
  education: string[]
  certifications: string[]
  work_preferences: string[]
  constraints: string[]
  summary: string
  positioning_statement: string
  strongest_selling_points: string[]
  proof_points: string[]
  preferred_application_tone: string
  topics_to_avoid_or_downplay: string[]
  career_direction: string
}

export interface Profile {
  id: number
  name: string | null
  email: string | null
  resume_text: string | null
  candidate_profile_summary: CandidateProfileSummary | null
  resume_filename: string | null
  resume_storage_path: string | null
  preferred_roles: string[]
  excluded_companies: string[]
  excluded_keywords: string[]
  cover_letter_threshold: number
  dashboard_min_score: number
}

export interface DashboardStats {
  total: number
  strong_matches: number
  cover_letters: number
  applied: number
}
