"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { CalendarCheck, CheckCircle2, Copy, Download, ExternalLink, FilePenLine, Loader2, RefreshCw, UserRoundSearch } from "lucide-react"
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

type JobAction = "idle" | "resume" | "cover-letter" | "interview" | "saving"
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
  const [coverLetterDirty, setCoverLetterDirty] = useState(false)
  const [coverLetterSaveState, setCoverLetterSaveState] = useState<"saved" | "saving" | "error">("saved")
  const coverLetterRevision = useRef(0)

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

  useEffect(() => {
    if (!job || !coverLetterDirty) return

    const revision = coverLetterRevision.current
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/jobs/${job.id}/cover-letter`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cover_letter: job.cover_letter ?? "" }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setJob((current) =>
          current
            ? {
                ...current,
                application_package: data.application_package,
              }
            : current,
        )
        if (coverLetterRevision.current === revision) {
          setCoverLetterDirty(false)
          setCoverLetterSaveState("saved")
        }
      } catch {
        setCoverLetterSaveState("error")
      }
    }, 900)

    return () => window.clearTimeout(timer)
  }, [coverLetterDirty, job])

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
      setJob((current) => ({ ...data, application_package: current?.application_package ?? null }))
      setMessage("Job updated.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update job.")
    } finally {
      setSaving(false)
      setActiveAction("idle")
    }
  }

  const generateArtifact = async (
    action: Exclude<JobAction, "idle" | "saving">,
    endpoint: string,
    progressMessage: string,
  ) => {
    if (!job) return
    setActiveAction(action)
    setLastAction(action)
    setError("")
    setMessage(progressMessage)
    try {
      const response = await fetch(`/api/jobs/${job.id}/${endpoint}`, { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setJob((current) =>
        current && {
          ...current,
          application_package: data.application_package ?? data,
          cover_letter: data.cover_letter ?? data.application_package?.cover_letter ?? current.cover_letter,
        },
      )
      setCoverLetterDirty(false)
      setCoverLetterSaveState("saved")
      setMessage(
        action === "resume"
          ? "Resume modifications generated."
          : action === "cover-letter"
            ? "Personalized cover letter generated."
            : "Interview preparation generated.",
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate this artifact.")
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
            {job.interviewing ? <Badge className="bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200">Interview</Badge> : null}
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
              <CardTitle>Application decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">{strategy?.decision_summary || "No decision saved."}</p>
              <PackageList title="Why this role fits" items={strategy?.why_this_role_fits ?? []} />
              <PackageList title="Concerns" items={strategy?.concerns ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <p className="text-sm text-muted-foreground">
                Generate only what you need. Each artifact is saved independently and can be regenerated without replacing the others.
              </p>

              <ArtifactSection
                title="Resume modifications"
                description="Get concrete, evidence-based edits for this role without rewriting your source resume."
                icon={FilePenLine}
                actionLabel={applicationPackage?.resume_tailoring_suggestions.length ? "Regenerate modifications" : "Generate modifications"}
                active={activeAction === "resume"}
                disabled={busy}
                onGenerate={() =>
                  generateArtifact("resume", "resume-tailoring", "Generating targeted resume modifications...")
                }
              >
                {applicationPackage?.resume_tailoring_suggestions.length ? (
                  <>
                    <ResumeTailoringPlan
                      suggestions={applicationPackage.resume_tailoring_suggestions}
                      onCopy={() => copyText(applicationPackage.resume_tailoring_suggestions.join("\n"), "Resume tailoring suggestions")}
                      copied={copiedLabel === "Resume tailoring suggestions"}
                      onDownload={() =>
                        downloadText(
                          applicationPackage.resume_tailoring_suggestions.join("\n"),
                          `${job.company || "company"}-${job.title || "resume-suggestions"}.txt`,
                        )
                      }
                    />
                    <PackageList title="Skills to emphasize" items={applicationPackage.skills_to_emphasize} />
                    <PackageList title="Gaps to prepare for" items={applicationPackage.gaps_to_prepare} />
                  </>
                ) : null}
              </ArtifactSection>

              <Separator />

              <ArtifactSection
                title="Cover letter / motivation letter"
                description="Create a highly personalized one-page letter using evidence from your full resume."
                icon={FilePenLine}
                actionLabel={job.cover_letter ? "Regenerate letter" : "Generate letter"}
                active={activeAction === "cover-letter"}
                disabled={busy}
                onGenerate={() =>
                  generateArtifact("cover-letter", "cover-letter", "Writing a personalized cover letter...")
                }
              >
                {job.cover_letter ? (
                  <CoverLetterEditor
                    value={job.cover_letter}
                    saveState={coverLetterSaveState}
                    onChange={(value) => {
                      setJob((current) => current && { ...current, cover_letter: value })
                      coverLetterRevision.current += 1
                      setCoverLetterDirty(true)
                      setCoverLetterSaveState("saving")
                    }}
                    onCopy={() => copyText(job.cover_letter, "Cover letter")}
                    copied={copiedLabel === "Cover letter"}
                    onDownload={() => window.location.assign(`/api/jobs/${job.id}/cover-letter/pdf`)}
                  />
                ) : null}
              </ArtifactSection>

              <Separator />

              <ArtifactSection
                title="Interview preparation"
                description="Generate likely questions, grounded answer points, and gaps to prepare for."
                icon={UserRoundSearch}
                actionLabel={applicationPackage?.interview_questions.length ? "Regenerate interview prep" : "Generate interview prep"}
                active={activeAction === "interview"}
                disabled={busy}
                onGenerate={() =>
                  generateArtifact("interview", "interview-prep", "Preparing role-specific interview questions and answers...")
                }
              >
                {applicationPackage?.interview_questions.length ? (
                  <>
                    <PackageList title="Interview questions" items={applicationPackage.interview_questions} />
                    <PackageList title="Suggested answer points" items={applicationPackage.interview_answers} />
                    <PackageList title="Gaps to prepare for" items={applicationPackage.gaps_to_prepare} />
                  </>
                ) : null}
              </ArtifactSection>

              <ActionStatus
                active={activeAction !== "idle" && activeAction !== "saving"}
                done={Boolean(lastAction && message)}
                error={lastAction && activeAction === "idle" ? error : ""}
                title="Generating material"
                activeMessage={message || "This usually takes 30-90 seconds."}
                doneMessage={message || "Generated and saved."}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Full job description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-96"
                value={job.description}
                onChange={(event) => setJob((current) => current && { ...current, description: event.target.value })}
                onBlur={() => patch({ description: job.description })}
              />
            </CardContent>
          </Card>

        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <section className="space-y-4">
              <h2 className="text-sm font-medium">Job details</h2>
              <TextField label="Title" value={job.title} onChange={(value) => patch({ title: value || null })} />
              <TextField label="Company" value={job.company} onChange={(value) => patch({ company: value || null })} />
              <TextField label="Location" value={job.location} onChange={(value) => patch({ location: value || null })} />
              <div className="space-y-2">
                <Label>Remote type</Label>
                <Select value={job.remote_type || "none"} onValueChange={(value) => value && patch({ remote_type: value === "none" ? null : (value as Job["remote_type"]) })}>
                  <SelectTrigger>
                    <SelectValue>{job.remote_type ? remoteTypeLabel(job.remote_type) : "Not set"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="on-site">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <TextField label="Source URL" value={job.source_url} onChange={(value) => patch({ source_url: value || null })} />
            </section>
            <Separator />
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
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {job.status === "rejected" ? (
              <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                <div>
                  <h2 className="text-sm font-medium text-rose-950">Rejection details</h2>
                  <p className="mt-1 text-xs leading-5 text-rose-700">
                    These details will make later interview and rejection analysis more useful.
                  </p>
                </div>
                <DateField label="Rejection date" value={job.rejection_date} onChange={(value) => patch({ rejection_date: value })} />
                <div className="space-y-2">
                  <Label>Rejection stage</Label>
                  <Select
                    value={job.rejection_stage || "unknown"}
                    onValueChange={(value) => value && patch({ rejection_stage: value as Job["rejection_stage"] })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{rejectionStageLabel(job.rejection_stage)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="application">Application review</SelectItem>
                      <SelectItem value="recruiter_screen">Recruiter screen</SelectItem>
                      <SelectItem value="hiring_manager">Hiring manager</SelectItem>
                      <SelectItem value="technical">Technical interview</SelectItem>
                      <SelectItem value="take_home">Take-home task</SelectItem>
                      <SelectItem value="onsite">Onsite / panel</SelectItem>
                      <SelectItem value="final">Final round</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rejection reason or feedback</Label>
                  <Textarea
                    placeholder="Paste recruiter feedback or note what happened."
                    value={job.rejection_reason ?? ""}
                    onChange={(event) =>
                      setJob((current) => current && { ...current, rejection_reason: event.target.value })
                    }
                    onBlur={() => patch({ rejection_reason: job.rejection_reason })}
                  />
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Interview</Label>
              <Button
                type="button"
                variant={job.interviewing ? "default" : "secondary"}
                className={job.interviewing ? "w-full bg-cyan-600 hover:bg-cyan-700" : "w-full"}
                onClick={() => patch({ interviewing: !job.interviewing })}
                disabled={busy}
              >
                <CalendarCheck className="h-4 w-4" />
                {job.interviewing ? "Interview marked" : "Mark interview"}
              </Button>
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

function ArtifactSection({
  title,
  description,
  icon: Icon,
  actionLabel,
  active,
  disabled,
  onGenerate,
  children,
}: {
  title: string
  description: string
  icon: typeof FilePenLine
  actionLabel: string
  active: boolean
  disabled: boolean
  onGenerate: () => void
  children?: React.ReactNode
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={onGenerate} disabled={disabled} className="shrink-0">
          {active ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {active ? "Generating" : actionLabel}
        </Button>
      </div>
      {children ? <div className="space-y-5">{children}</div> : null}
    </section>
  )
}

function CoverLetterEditor({
  value,
  saveState,
  onChange,
  onCopy,
  copied,
  onDownload,
}: {
  value: string
  saveState: "saved" | "saving" | "error"
  onChange: (value: string) => void
  onCopy: () => void
  copied: boolean
  onDownload: () => void
}) {
  const wordCount = value.split(/\s+/).filter(Boolean).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {wordCount} words ·{" "}
          <span className={saveState === "error" ? "text-red-600" : saveState === "saving" ? "text-amber-600" : "text-emerald-600"}>
            {saveState === "saving" ? "Saving changes..." : saveState === "error" ? "Autosave failed" : "All changes saved"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCopy}>
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button type="button" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-100/70 p-3 sm:p-6">
        <Textarea
          aria-label="Editable cover letter"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mx-auto min-h-[842px] max-w-[596px] resize-none rounded-none border-0 bg-white px-7 py-16 font-sans text-[13px] leading-[1.45] text-slate-950 shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-300 sm:px-12"
        />
      </div>
    </div>
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
      <Input key={value ?? ""} defaultValue={value ?? ""} onBlur={(event) => onChange(event.target.value)} />
    </div>
  )
}

function remoteTypeLabel(value: NonNullable<Job["remote_type"]>) {
  return {
    remote: "Remote",
    hybrid: "Hybrid",
    "on-site": "On-site",
  }[value]
}

function rejectionStageLabel(value: Job["rejection_stage"]) {
  return {
    application: "Application review",
    recruiter_screen: "Recruiter screen",
    hiring_manager: "Hiring manager",
    technical: "Technical interview",
    take_home: "Take-home task",
    onsite: "Onsite / panel",
    final: "Final round",
    unknown: "Unknown",
  }[value ?? "unknown"]
}

function DateField({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="date" value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
