"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { BadgeCheck, BriefcaseBusiness, CalendarCheck, FileText, Inbox, LayoutGrid, List, Plus, Search, Send } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { StatusMessage } from "@/components/status-message"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardStats, tierTone } from "@/lib/jobs"
import { cn } from "@/lib/utils"
import type { Job } from "@/types"

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tier, setTier] = useState("all")
  const [status, setStatus] = useState("all")
  const [interview, setInterview] = useState("all")
  const [sort, setSort] = useState("match_score")
  const [search, setSearch] = useState("")
  const [minScore, setMinScore] = useState(0)
  const [view, setView] = useState<"cards" | "list">("cards")

  useEffect(() => {
    fetch("/api/profile")
      .then(async (response) => {
        const data = await response.json()
        if (response.ok) setMinScore(Number(data.dashboard_min_score ?? 0))
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ tier, status, interview, sort })
    if (search) params.set("search", search)
    if (minScore) params.set("min_score", String(minScore))

    fetch(`/api/jobs?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setJobs(data)
        setError("")
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [tier, status, interview, sort, search, minScore])

  const stats = useMemo(() => getDashboardStats(jobs), [jobs])

  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Review AI job-fit analysis and application strategy.</p>
        </div>
        <Link className={buttonVariants({ className: "rounded-xl bg-indigo-600 shadow-sm shadow-indigo-200 hover:bg-indigo-700" })} href="/jobs/new">
          <Plus className="h-4 w-4" />
          Add Job
        </Link>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <StatCard label="Total jobs" value={stats.total} icon={BriefcaseBusiness} tone="slate" />
        <StatCard label="Strong matches" value={stats.strong_matches} icon={BadgeCheck} tone="emerald" />
        <StatCard label="Packages" value={stats.cover_letters} icon={FileText} tone="violet" />
        <StatCard label="Interviews" value={stats.interviews} icon={CalendarCheck} tone="cyan" />
        <StatCard label="Applied" value={stats.applied} icon={Send} tone="blue" />
      </div>

      <Card className="mb-6 border-slate-200/80 bg-white/95">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_150px_150px_150px_170px_auto]">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search by title/company</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-9 shadow-inner shadow-slate-100 transition focus-visible:border-indigo-300 focus-visible:ring-indigo-100"
              />
            </div>
          </div>
          <Filter label="Fit" value={tier} onChange={setTier} values={["all", "strong", "moderate", "weak"]} />
          <Filter label="Status" value={status} onChange={setStatus} values={["all", "new", "saved", "applied", "dismissed"]} />
          <Filter label="Interview" value={interview} onChange={setInterview} values={["all", "yes", "no"]} />
          <Filter label="Sort" value={sort} onChange={setSort} values={["match_score", "date", "company"]} />
          <ViewToggle value={view} onChange={setView} />
        </CardContent>
      </Card>

      {error ? <StatusMessage title="Could not load jobs" message={error} /> : null}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState />
      ) : view === "list" ? (
        <JobList jobs={jobs} />
      ) : (
        <JobCards jobs={jobs} />
      )}
    </AppShell>
  )
}

function ViewToggle({ value, onChange }: { value: "cards" | "list"; onChange: (value: "cards" | "list") => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">View</Label>
      <div className="grid h-10 grid-cols-2 rounded-xl border border-slate-200 bg-slate-50/80 p-1 shadow-inner shadow-slate-100">
        <Button
          type="button"
          size="sm"
          variant={value === "cards" ? "default" : "ghost"}
          className={cn("h-8 rounded-lg px-3", value === "cards" ? "bg-white text-slate-950 shadow-sm hover:bg-white" : "text-slate-500 hover:bg-white/70")}
          onClick={() => onChange("cards")}
          aria-pressed={value === "cards"}
        >
          <LayoutGrid className="h-4 w-4" />
          Cards
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value === "list" ? "default" : "ghost"}
          className={cn("h-8 rounded-lg px-3", value === "list" ? "bg-white text-slate-950 shadow-sm hover:bg-white" : "text-slate-500 hover:bg-white/70")}
          onClick={() => onChange("list")}
          aria-pressed={value === "list"}
        >
          <List className="h-4 w-4" />
          List
        </Button>
      </div>
    </div>
  )
}

function JobCards({ jobs }: { jobs: Job[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {jobs.map((job) => (
        <Link key={job.id} href={`/jobs/${job.id}`}>
          <Card className="h-full border-slate-200/80 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/60">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="line-clamp-2 text-base font-semibold text-slate-950">{job.title || "Untitled role"}</CardTitle>
                  <p className="text-sm text-slate-500">{job.company || "Unknown company"}</p>
                </div>
                <Badge className={tierTone(job.match_tier)}>{job.match_tier || "unscored"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <ScoreBadge score={job.match_score} tier={job.match_tier} />
                <PackageBadge hasPackage={Boolean(job.application_package || job.cover_letter)} />
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-slate-600">{job.match_summary || job.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{job.location || "Location not set"}</span>
                <div className="flex flex-wrap justify-end gap-2">
                  {job.interviewing ? <InterviewBadge /> : null}
                  <StatusBadge status={job.status} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function JobList({ jobs }: { jobs: Job[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-sm">
      <div className="hidden grid-cols-[minmax(0,1.25fr)_120px_130px_120px_120px_110px] gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
        <span>Role</span>
        <span>Fit</span>
        <span>Location</span>
        <span>Status</span>
        <span>Interview</span>
        <span>Package</span>
      </div>
      {jobs.map((job) => (
        <Link
          key={job.id}
          href={`/jobs/${job.id}`}
          className="grid gap-3 border-b border-slate-100 px-4 py-4 transition last:border-b-0 hover:bg-indigo-50/40 lg:grid-cols-[minmax(0,1.25fr)_120px_130px_120px_120px_110px] lg:items-center lg:gap-4"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-slate-950">{job.title || "Untitled role"}</h2>
              <Badge className={tierTone(job.match_tier)}>{job.match_tier || "unscored"}</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-slate-500">{job.company || "Unknown company"}</p>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 lg:hidden">{job.match_summary || job.description}</p>
          </div>
          <ScoreBadge score={job.match_score} tier={job.match_tier} />
          <span className="truncate text-sm text-slate-500">{job.location || "Location not set"}</span>
          <StatusBadge status={job.status} />
          {job.interviewing ? <InterviewBadge /> : <span className="text-sm text-slate-400">No</span>}
          <PackageBadge hasPackage={Boolean(job.application_package || job.cover_letter)} />
        </Link>
      ))}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof BriefcaseBusiness
  tone: "slate" | "emerald" | "violet" | "cyan" | "blue"
}) {
  const tones = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
  }

  return (
    <Card className="border-slate-200/80 bg-white/95">
      <CardContent className="flex items-center justify-between pt-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={cn("flex size-11 items-center justify-center rounded-2xl ring-1", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  )
}

function ScoreBadge({ score, tier }: { score: number | null; tier: Job["match_tier"] }) {
  const className =
    tier === "strong"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tier === "moderate"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : tier === "weak"
          ? "bg-rose-50 text-rose-700 ring-rose-200"
          : "bg-slate-50 text-slate-600 ring-slate-200"

  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1", className)}>
      {score ?? 0}
      <span className="ml-1 font-medium opacity-75">score</span>
    </span>
  )
}

function StatusBadge({ status }: { status: Job["status"] }) {
  const className = {
    new: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    saved: "bg-violet-50 text-violet-700 ring-violet-200",
    applied: "bg-blue-50 text-blue-700 ring-blue-200",
    dismissed: "bg-slate-100 text-slate-600 ring-slate-200",
  }[status]

  return <Badge className={cn("capitalize ring-1", className)}>{status}</Badge>
}

function PackageBadge({ hasPackage }: { hasPackage: boolean }) {
  return (
    <Badge className={cn("ring-1", hasPackage ? "bg-violet-50 text-violet-700 ring-violet-200" : "bg-slate-50 text-slate-500 ring-slate-200")}>
      {hasPackage ? "Package" : "No package"}
    </Badge>
  )
}

function InterviewBadge() {
  return <Badge className="bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200">Interview</Badge>
}

function EmptyState() {
  return (
    <Card className="border-dashed border-indigo-200 bg-white/90">
      <CardContent className="flex flex-col items-center py-14 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
          <Inbox className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-slate-950">No jobs analyzed yet</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          Add a company career page or paste a LinkedIn description to get a match score and application strategy.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link className={buttonVariants({ variant: "secondary", className: "rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100" })} href="/settings">
            Upload resume
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function Filter({
  label,
  value,
  onChange,
  values,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  values: string[]
}) {
  const labelFor = (item: string) =>
    ({
      all: "All",
      strong: "Strong",
      moderate: "Moderate",
      weak: "Weak",
      new: "New",
      saved: "Saved",
      applied: "Applied",
      dismissed: "Dismissed",
      yes: "Yes",
      no: "No",
      match_score: "Match score",
      date: "Date",
      company: "Company",
    })[item] ?? item

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Label>
      <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
        <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 shadow-inner shadow-slate-100 transition hover:bg-white focus-visible:border-indigo-300 focus-visible:ring-indigo-100">
          <SelectValue>{labelFor(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {values.map((item) => (
            <SelectItem key={item} value={item}>
              {labelFor(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
