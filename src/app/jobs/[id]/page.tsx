"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CheckCircle2, Copy, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { StatusMessage } from "@/components/status-message"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { tierTone } from "@/lib/jobs"
import type { Job } from "@/types"

type JobAction = "idle" | "package" | "cover-letter" | "saving"
type FeedbackAction = Exclude<JobAction, "idle" | "saving"> | null

export default function JobDetailPage() {
  const params = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeAction, setActiveAction] = useState<JobAction>("idle")
  const [lastAction, setLastAction] = useState<FeedbackAction>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [copiedLabel, setCopiedLabel] = useState("")

  const generatingPackage = activeAction === "package"
  const generatingCoverLetter = activeAction === "cover-letter"
  const busy = activeAction !== "idle"

  useEffect(() => {
    fetch(`/api/jobs/${params.id}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setJob(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [params.id])

  const patch = async (payload: Partial<Job>) => {
    if (!job) return
    setSaving(true)
    setActiveAction("saving")
    setError("")
    setMessage("")
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setJob(data)
      setMessage("Job updated.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update job.")
    } finally {
      setSaving(false)
      setActiveAction("idle")
    }
  }

  const regenerate = async () => {
    if (!job) return
    setActiveAction("cover-letter")
    setLastAction("cover-letter")
    setError("")
    setMessage("Writing a fresh cover letter from the saved strategy...")
    try {
      const response = await fetch(`/api/jobs/${job.id}/cover-letter`, { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setJob((current) => current && { ...current, cover_letter: data.cover_letter })
      setMessage("Cover letter regenerated.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not regenerate cover letter.")
      setMessage("")
    } finally {
      setActiveAction("idle")
    }
  }

  const generateApplicationPackage = async () => {
    if (!job) return
    setActiveAction("package")
    setLastAction("package")
    setError("")
    setMessage("Generating resume suggestions, cover letter, salary guidance, and interview prep...")
    try {
      const response = await fetch(`/api/jobs/${job.id}/application-package`, { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setJob((current) => current && { ...current, application_package: data, cover_letter: data.cover_letter })
      setMessage("Application package generated.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate application package.")
      setMessage("")
    } finally {
      setActiveAction("idle")
    }
  }

  const copyText = async (value: string | null | undefined, label: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopiedLabel(label)
    setMessage(`${label} copied.`)
    window.setTimeout(() => setCopiedLabel((current) => (current === label ? "" : current)), 1800)
  }

  const downloadText = (value: string | null | undefined, filename: string) => {
    if (!value) return
    const blob = new Blob([value], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <AppShell>
        <Skeleton className="h-96" />
      </AppShell>
    )
  }

  if (!job) {
    return (
      <AppShell>
        <StatusMessage title="Job not found" message={error || "Could not load this job."} />
      </AppShell>
    )
  }

  const match = job.match_data
  const strategy = job.application_strategy
  const applicationPackage = job.application_package

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className={tierTone(job.match_tier)}>{job.match_tier || "unscored"}</Badge>
            <Badge variant="outline">{job.status}</Badge>
          </div>
          <h1 className="text-2xl font-semibold">{job.title || "Untitled role"}</h1>
          <p className="text-sm text-muted-foreground">
            {job.company || "Unknown company"} · {job.location || "Location not set"}
          </p>
        </div>
        {job.source_url ? (
          <a className={buttonVariants({ variant: "secondary" })} href={job.source_url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Source URL
          </a>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {error ? <StatusMessage title="Could not complete action" message={error} /> : null}
          {message ? <StatusMessage title="Done" message={message} /> : null}

          <Card>
            <CardHeader>
              <CardTitle>Match analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-end gap-3">
                <span className="text-6xl font-semibold">{job.match_score ?? 0}</span>
                <span className="pb-3 text-sm text-muted-foreground">match score</span>
              </div>
              <p>{job.match_summary}</p>
              <section className="space-y-2">
                <h2 className="font-medium">Priority</h2>
                <p className="text-sm text-muted-foreground">
                  {strategy?.priority?.replace("_", " ") || match?.priority?.replace("_", " ") || "Not set"} · {job.recommendation_reason || strategy?.decision_summary || "No recommendation saved."}
                </p>
              </section>
              <Separator />
              <section className="space-y-2">
                <h2 className="font-medium">Full reasoning</h2>
                <p className="text-sm text-muted-foreground">{match?.reasoning || "No reasoning saved."}</p>
              </section>
              <SkillList title="Matched skills" items={match?.matched_skills ?? []} />
              <SkillList title="Missing skills" items={match?.missing_skills ?? []} />
              <SkillList title="Nice-to-have skills" items={match?.nice_to_have_skills ?? []} />
              <section className="space-y-2">
                <h2 className="font-medium">Recommendation</h2>
                <p className="text-sm text-muted-foreground">{match?.recommended ? "Recommended" : "Not recommended"}</p>
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">{strategy?.decision_summary || match?.application_strategy || "No strategy saved."}</p>
              <PackageList title="Why this role fits" items={strategy?.why_this_role_fits ?? []} />
              <PackageList title="Concerns" items={strategy?.concerns ?? []} />
              <PackageList title="What to emphasize" items={strategy?.what_to_emphasize ?? []} />
              <PackageList title="What to downplay" items={strategy?.what_to_downplay ?? []} />
              <section className="space-y-2">
                <h2 className="font-medium">Cover letter angle</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{strategy?.cover_letter_angle || match?.cover_letter_angle || "No angle saved."}</p>
              </section>
              <PackageList title="Resume tailoring suggestions" items={strategy?.resume_tailoring_suggestions ?? []} />
              <PackageList title="Interview preparation points" items={strategy?.interview_preparation_points ?? match?.interview_risks ?? []} />
              {strategy?.salary_positioning ? (
                <section className="space-y-2">
                  <h2 className="font-medium">Salary positioning</h2>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{strategy.salary_positioning}</p>
                </section>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application package</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ActionStatus
                active={generatingPackage}
                done={lastAction === "package" && message === "Application package generated."}
                error={lastAction === "package" && activeAction === "idle" ? error : ""}
                title="Generating application package"
                activeMessage="This can take 30-90 seconds. The app is preparing resume suggestions, a cover letter, salary guidance, and interview prep."
                doneMessage="Application package generated and saved to this job."
              />
              {!applicationPackage ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {job.match_score && job.match_score >= 80
                      ? "This is a strong match. Generate the full package when you are ready to apply."
                      : "Application packages are on demand, so generate one only when this job is worth the extra work."}
                  </p>
                  <Button type="button" onClick={generateApplicationPackage} disabled={busy}>
                    {generatingPackage ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {generatingPackage ? "Generating package" : "Generate package"}
                  </Button>
                </div>
              ) : (
                <>
                  <ResumeTailoringPlan
                    suggestions={applicationPackage.resume_tailoring_suggestions}
                    onCopy={() => copyText(applicationPackage.resume_tailoring_suggestions.join("\n"), "Resume tailoring suggestions")}
                    copied={copiedLabel === "Resume tailoring suggestions"}
                    onDownload={() =>
                      downloadText(
                        applicationPackage.resume_tailoring_suggestions.join("\n"),
                        `${job.company || "company"}-${job.title || "resume-suggestions"}.txt`
                      )
                    }
                  />
                  <PackageText
                    title="Cover letter"
                    value={applicationPackage.cover_letter}
                    onCopy={() => copyText(applicationPackage.cover_letter, "Cover letter")}
                    copied={copiedLabel === "Cover letter"}
                    onDownload={() =>
                      downloadText(
                        applicationPackage.cover_letter,
                        `${job.company || "company"}-${job.title || "cover-letter"}.txt`
                      )
                    }
                  />
                  <section className="space-y-2">
                    <h2 className="font-medium">Salary recommendation</h2>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{applicationPackage.salary_recommendation}</p>
                  </section>
                  <PackageList title="Interview questions" items={applicationPackage.interview_questions} />
                  <PackageList title="Suggested answers" items={applicationPackage.interview_answers} />
                  <PackageList title="Skills to emphasize" items={applicationPackage.skills_to_emphasize} />
                  <PackageList title="Gaps to prepare for" items={applicationPackage.gaps_to_prepare} />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Full job description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cover letter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ActionStatus
                active={generatingCoverLetter}
                done={lastAction === "cover-letter" && message === "Cover letter regenerated."}
                error={lastAction === "cover-letter" && activeAction === "idle" ? error : ""}
                title="Writing cover letter"
                activeMessage="Using the match analysis and application strategy to write a tailored letter."
                doneMessage="Cover letter regenerated and saved."
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => copyText(job.cover_letter, "Cover letter")} disabled={!job.cover_letter}>
                  <Copy className="h-4 w-4" />
                  {copiedLabel === "Cover letter" ? "Copied" : "Copy"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => downloadText(job.cover_letter, `${job.company || "company"}-${job.title || "cover-letter"}.txt`)}
                  disabled={!job.cover_letter}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button type="button" onClick={regenerate} disabled={busy}>
                  {generatingCoverLetter ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {generatingCoverLetter ? "Regenerating" : "Regenerate"}
                </Button>
              </div>
              <Textarea
                className="min-h-72"
                value={job.cover_letter ?? ""}
                onChange={(event) => setJob((current) => current && { ...current, cover_letter: event.target.value })}
                onBlur={() => patch({ cover_letter: job.cover_letter })}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={job.status} onValueChange={(status) => status && patch({ status: status as Job["status"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="saved">Saved</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DateField label="Application date" value={job.application_date} onChange={(value) => patch({ application_date: value })} />
            <DateField label="Deadline" value={job.deadline} onChange={(value) => patch({ deadline: value })} />
            <TextField label="Contact person" value={job.contact_person} onChange={(value) => patch({ contact_person: value })} />
            <TextField label="Contact email" value={job.contact_email} onChange={(value) => patch({ contact_email: value })} />
            <TextField label="Salary range" value={job.salary_range} onChange={(value) => patch({ salary_range: value })} />
            <TextField label="Work model" value={job.work_model} onChange={(value) => patch({ work_model: value })} />
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={job.notes ?? ""}
                onChange={(event) => setJob((current) => current && { ...current, notes: event.target.value })}
                onBlur={() => patch({ notes: job.notes })}
              />
            </div>
            {saving ? <p className="text-sm text-muted-foreground">Saving</p> : null}
          </CardContent>
        </Card>
      </div>
      <CopyToast label={copiedLabel} />
    </AppShell>
  )
}

function ActionStatus({
  active,
  done,
  error,
  title,
  activeMessage,
  doneMessage,
}: {
  active: boolean
  done: boolean
  error: string
  title: string
  activeMessage: string
  doneMessage: string
}) {
  if (!active && !done && !error) return null

  if (error) {
    return (
      <div aria-live="polite" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <p className="font-medium">Something stopped this action</p>
        <p className="mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div aria-live="polite" className={`rounded-lg border px-4 py-3 text-sm ${active ? "border-blue-200 bg-blue-50 text-blue-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      <div className="flex items-start gap-3">
        {active ? <Loader2 className="mt-0.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
        <div>
          <p className="font-medium">{active ? title : "Done"}</p>
          <p className="mt-1">{active ? activeMessage : doneMessage}</p>
        </div>
      </div>
    </div>
  )
}

function SkillList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {items.length ? items.map((item) => <Badge key={item} variant="secondary">{item}</Badge>) : <span className="text-sm text-muted-foreground">None listed</span>}
      </div>
    </section>
  )
}

function PackageText({
  title,
  value,
  onCopy,
  copied,
  onDownload,
}: {
  title: string
  value: string
  onCopy: () => void
  copied?: boolean
  onDownload: () => void
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{title}</h2>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCopy}>
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
      <p className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        {value}
      </p>
    </section>
  )
}

function ResumeTailoringPlan({
  suggestions,
  onCopy,
  copied,
  onDownload,
}: {
  suggestions: string[]
  onCopy: () => void
  copied?: boolean
  onDownload: () => void
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium">Resume tailoring plan</h2>
          <p className="text-sm text-muted-foreground">Concrete edits grouped by where to make them.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCopy}>
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {suggestions.length ? (
        <div className="grid gap-3">
          {suggestions.map((suggestion, index) => {
            const action = getResumeAction(suggestion)
            return (
              <article key={`${index}-${suggestion.slice(0, 24)}`} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                    {index + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-950">{action.where}</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Do this</p>
                  <p className="text-sm leading-6 text-slate-700">{action.change}</p>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">None listed</p>
      )}
    </section>
  )
}

function getResumeAction(suggestion: string) {
  const normalized = suggestion.trim()
  const arrowParts = normalized.split(/\s+(?:→|->)\s+/)
  if (arrowParts.length >= 2) {
    return {
      where: cleanResumeLocation(arrowParts[0]),
      change: arrowParts.slice(1).join(" -> "),
    }
  }

  const colonMatch = normalized.match(/^([^:]{3,80}):\s*(.+)$/)
  if (colonMatch) {
    return {
      where: cleanResumeLocation(colonMatch[1]),
      change: colonMatch[2],
    }
  }

  const inferredLocation = inferResumeLocation(normalized)
  return {
    where: inferredLocation,
    change: normalized,
  }
}

function cleanResumeLocation(value: string) {
  return value.replace(/^in\s+/i, "").replace(/^for\s+/i, "").trim()
}

function inferResumeLocation(value: string) {
  const lower = value.toLowerCase()
  if (lower.includes("skills")) return "Skills section"
  if (lower.includes("headline") || lower.includes("profile")) return "Headline/Profile"
  if (lower.includes("fellowork")) return "Fellowork experience"
  if (lower.includes("kit")) return "KIT experience"
  if (lower.includes("featured projects") || lower.includes("rag")) return "Featured Projects"
  if (lower.includes("sales offer")) return "Sales Offer Engine"
  if (lower.includes("cover letter")) return "Cover letter alignment"
  return "Resume"
}

function CopyToast({ label }: { label: string }) {
  if (!label) return null

  return (
    <div aria-live="polite" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">
      <CheckCircle2 className="h-4 w-4" />
      {label} copied
    </div>
  )
}

function PackageList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium">{title}</h2>
      {items.length ? (
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">None listed</p>
      )}
    </section>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value ?? ""} onChange={(event) => onChange(event.target.value)} onBlur={(event) => onChange(event.target.value)} />
    </div>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="date" value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
