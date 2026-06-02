import type { DashboardStats, Job } from "@/types"

export function getDashboardStats(jobs: Job[]): DashboardStats {
  return {
    total: jobs.length,
    strong_matches: jobs.filter((job) => job.match_tier === "strong").length,
    cover_letters: jobs.filter((job) => Boolean(job.application_package || job.cover_letter)).length,
    applied: jobs.filter((job) => job.status === "applied").length,
  }
}

export function tierTone(tier: Job["match_tier"]) {
  if (tier === "strong") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  if (tier === "moderate") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  if (tier === "weak") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
  return "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
}
