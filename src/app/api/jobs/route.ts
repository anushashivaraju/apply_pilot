import { NextResponse } from "next/server"
import { runApplicationStrategyAgent } from "@/lib/agents/applicationStrategyAgent"
import { runMatchingAgent } from "@/lib/agents/matchingAgent"
import { jsonError } from "@/lib/api"
import { ensureCandidateProfileSummary, normalizeProfile } from "@/lib/profile"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { jobInputSchema } from "@/lib/validation"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const input = jobInputSchema.parse(await request.json())
    const supabase = getSupabaseAdmin()

    const profileResult = await supabase.from("profile").select("*").eq("id", 1).single()
    if (profileResult.error) throw profileResult.error

    let profile = normalizeProfile(profileResult.data)
    if (!profile.resume_text) {
      return jsonError("Upload a resume in Settings before analyzing jobs.")
    }

    profile = await ensureCandidateProfileSummary(supabase, profile)
    const candidateProfileSummary = profile.candidate_profile_summary
    if (!candidateProfileSummary) {
      throw new Error("Could not generate your resume profile summary. Try uploading the resume again.")
    }

    if (input.source_url) {
      const existing = await supabase
        .from("jobs")
        .select("*")
        .eq("source_url", input.source_url)
        .maybeSingle()

      if (existing.error) throw existing.error
      if (existing.data) {
        const packageResult = await supabase
          .from("job_application_package")
          .select("*")
          .eq("job_id", existing.data.id)
          .maybeSingle()

        if (packageResult.error) throw packageResult.error

        return NextResponse.json({
          ...existing.data,
          application_package: packageResult.data ?? null,
        })
      }
    }

    const matchResult = await runMatchingAgent({
      candidateProfileSummary,
      jobDescription: input.description,
      profile,
    })

    const applicationStrategy = await runApplicationStrategyAgent({
      candidateProfileSummary,
      profile,
      job: {
        title: input.title ?? null,
        company: input.company ?? null,
        location: input.location ?? null,
        remote_type: input.remote_type || null,
        description: input.description,
      },
      matchResult,
    })

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        source_type: input.source_type,
        source_url: input.source_url || null,
        title: input.title || null,
        company: input.company || null,
        location: input.location || null,
        remote_type: input.remote_type || null,
        description: input.description,
        fetched_at: input.source_type === "company_career_page" ? new Date().toISOString() : null,
        match_score: matchResult.score,
        match_score_5: Math.max(1, Math.ceil(matchResult.score / 20)),
        match_tier: matchResult.tier,
        match_summary: matchResult.summary,
        match_data: matchResult,
        application_strategy: applicationStrategy,
        worth_applying: applicationStrategy.priority === "apply_now",
        recommendation_reason: applicationStrategy.decision_summary,
        status: "new",
      })
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ ...data, application_package: null })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save job.", 400)
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const tier = url.searchParams.get("tier")
    const status = url.searchParams.get("status")
    const search = url.searchParams.get("search")
    const minScore = url.searchParams.get("min_score")
    const sort = url.searchParams.get("sort") || "created_at"

    let query = getSupabaseAdmin().from("jobs").select("*")

    if (tier && tier !== "all") query = query.eq("match_tier", tier)
    if (status && status !== "all") query = query.eq("status", status)
    if (minScore) query = query.gte("match_score", Number(minScore))
    if (search) {
      query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%`)
    }

    if (sort === "match_score") {
      query = query.order("match_score", { ascending: false, nullsFirst: false })
    } else if (sort === "company") {
      query = query.order("company", { ascending: true, nullsFirst: false })
    } else {
      query = query.order("created_at", { ascending: false })
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not load jobs.", 500)
  }
}
