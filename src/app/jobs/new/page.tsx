"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ChevronDown, LinkIcon, Loader2, WandSparkles } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { StatusMessage } from "@/components/status-message"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type FormState = {
  source_type: "linkedin" | "company_career_page" | "manual" | "other"
  source_url: string
  company: string
  title: string
  location: string
  remote_type: "" | "remote" | "hybrid" | "on-site"
  description: string
}

type ExtractedJob = {
  title?: string | null
  company?: string | null
  location?: string | null
  remote_type?: FormState["remote_type"] | null
  description?: string | null
  extraction_confidence?: "high" | "medium" | "low" | null
}

type SubmitPhase = "idle" | "extracting" | "analyzing"
type ProgressStep = "ready" | "extracting" | "analyzing" | "opening" | "error"

const initialForm: FormState = {
  source_type: "linkedin",
  source_url: "",
  company: "",
  title: "",
  location: "",
  remote_type: "",
  description: "",
}

export default function NewJobPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialForm)
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle")
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [progressStep, setProgressStep] = useState<ProgressStep>("ready")

  const busy = submitPhase !== "idle"

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    if (error) setError("")
  }

  const extractFromUrl = async (sourceUrl: string, options: { showMessage?: boolean } = {}) => {
    setSubmitPhase("extracting")
    setProgressStep("extracting")
    setError("")
    setMessage(options.showMessage ? "" : "Reading the job page...")
    try {
      const response = await fetch("/api/jobs/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source_url: sourceUrl }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      const extracted = data as ExtractedJob
      setForm((current) => ({
        ...current,
        title: extracted.title ?? current.title,
        company: extracted.company ?? current.company,
        location: extracted.location ?? current.location,
        remote_type: extracted.remote_type ?? current.remote_type,
        description: extracted.description ?? current.description,
      }))
      if (options.showMessage) {
        setMessage(
          extracted.extraction_confidence === "low"
            ? "Extraction confidence is low. Review and edit the job description before analysis."
            : `Extracted job description. Confidence: ${extracted.extraction_confidence ?? "medium"}.`
        )
        setProgressStep("ready")
      }
      return extracted
    } catch (err) {
      if (options.showMessage) {
        setError(err instanceof Error ? err.message : "Extraction failed. Paste the job description manually.")
        setProgressStep("error")
      }
      return null
    } finally {
      if (options.showMessage) {
        setSubmitPhase("idle")
      }
    }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitPhase("analyzing")
    setProgressStep("analyzing")
    setError("")
    setMessage("")
    try {
      const sourceUrl = form.source_url.trim()
      const description = form.description.trim()
      let payload = {
        ...form,
        source_url: sourceUrl,
        description,
        source_type: getSourceType(sourceUrl, description),
      }

      if (!description && sourceUrl) {
        const extracted = await extractFromUrl(sourceUrl)
        if (!extracted?.description) {
          throw new Error("I could not read enough from that URL. Paste the job description into the box and click Analyze fit again.")
        }

        payload = {
          ...payload,
          title: extracted.title ?? payload.title,
          company: extracted.company ?? payload.company,
          location: extracted.location ?? payload.location,
          remote_type: extracted.remote_type ?? payload.remote_type,
          description: extracted.description.trim(),
          source_type: getSourceType(sourceUrl, extracted.description),
        }
      }

      setSubmitPhase("analyzing")
      setProgressStep("analyzing")
      setMessage("Analyzing fit against your resume...")
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      if (!data.id) throw new Error("Analysis finished, but the job page could not be opened.")
      setProgressStep("opening")
      setMessage("Analysis complete. Opening the job report...")
      router.push(`/jobs/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze job.")
      setMessage("")
      setProgressStep("error")
    } finally {
      setSubmitPhase("idle")
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Add Job</h1>
        <p className="text-sm text-muted-foreground">Paste a job URL or description. The assistant will fill in the rest when it can.</p>
      </div>

      <form onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Job input</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            {error ? <StatusMessage title="Action needed" message={error} /> : null}
            {message ? <StatusMessage title="Ready" message={message} /> : null}

            <div className="space-y-2">
              <Label htmlFor="source_url">Job URL</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="source_url"
                    value={form.source_url}
                    onChange={(event) => update("source_url", event.target.value)}
                    placeholder="https://company.com/careers/job"
                    className="pl-9"
                  />
                </div>
                <Button type="button" variant="secondary" onClick={() => extractFromUrl(form.source_url.trim(), { showMessage: true })} disabled={busy || !form.source_url.trim()}>
                  {submitPhase === "extracting" ? "Extracting" : "Extract"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Paste the LinkedIn/job post text here if the URL cannot be extracted."
                className="min-h-72"
              />
            </div>

            <div className="border-t pt-4">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md py-2 text-left text-sm font-medium text-slate-700 hover:text-slate-950"
                onClick={() => setDetailsOpen((current) => !current)}
                aria-expanded={detailsOpen}
              >
                <span>{getDetailsSummary(form)}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
              </button>

              {detailsOpen ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field id="company" label="Company" value={form.company} onChange={(value) => update("company", value)} />
                  <Field id="title" label="Title" value={form.title} onChange={(value) => update("title", value)} />
                  <Field id="location" label="Location" value={form.location} onChange={(value) => update("location", value)} />
                  <div className="space-y-2">
                    <Label>Remote type</Label>
                    <Select value={form.remote_type || "none"} onValueChange={(value) => value && update("remote_type", value === "none" ? "" : value)}>
                      <SelectTrigger>
                        <SelectValue>{form.remote_type ? remoteTypeLabel(form.remote_type) : "Not set"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not set</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="on-site">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
            </div>

            <ProgressStatus step={progressStep} phase={submitPhase} error={error} message={message} hasDescription={Boolean(form.description.trim())} hasSourceUrl={Boolean(form.source_url.trim())} />

            <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between gap-3 border-t bg-white/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/80">
              <p className="text-sm text-slate-500">
                {busy ? "Please wait. The report opens automatically when analysis finishes." : "Ready when you are."}
              </p>
              <Button type="submit" disabled={busy || (!form.source_url.trim() && !form.description.trim())}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                {getSubmitLabel(submitPhase, form)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </AppShell>
  )
}

function ProgressStatus({
  step,
  phase,
  error,
  message,
  hasDescription,
  hasSourceUrl,
}: {
  step: ProgressStep
  phase: SubmitPhase
  error: string
  message: string
  hasDescription: boolean
  hasSourceUrl: boolean
}) {
  if (step === "ready" && !message && !error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {hasDescription
          ? "Click Analyze fit to score this job against your resume."
          : hasSourceUrl
            ? "Click Extract and analyze to read the page, then score it against your resume."
            : "Paste a job URL or description to start."}
      </div>
    )
  }

  const activeLabel =
    phase === "extracting"
      ? "Extracting the job description"
      : phase === "analyzing"
        ? "Analyzing fit against your resume"
        : step === "opening"
          ? "Opening the job report"
          : "Ready"

  return (
    <div aria-live="polite" className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
      <div className="flex items-start gap-3">
        {error ? <span className="mt-0.5 h-2 w-2 rounded-full bg-red-500" /> : step === "opening" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />}
        <div className="space-y-1">
          <p className="font-medium">{error ? "Something stopped the analysis" : activeLabel}</p>
          <p className={error ? "text-red-700" : "text-blue-700"}>
            {error || message || "This can take 30-90 seconds because the app is running AI matching and application strategy."}
          </p>
        </div>
      </div>
    </div>
  )
}

function getSubmitLabel(phase: SubmitPhase, form: FormState) {
  if (phase === "extracting") return "Extracting job"
  if (phase === "analyzing") return "Analyzing fit"
  if (!form.description.trim() && form.source_url.trim()) return "Extract and analyze"
  return "Analyze fit"
}

function getSourceType(sourceUrl: string, description: string): FormState["source_type"] {
  if (sourceUrl.includes("linkedin.com")) return "linkedin"
  if (sourceUrl.trim()) return "company_career_page"
  if (description.trim()) return "manual"
  return "other"
}

function getDetailsSummary(form: FormState) {
  const details = [form.company, form.title, form.location, form.remote_type ? remoteTypeLabel(form.remote_type) : ""].filter(Boolean)
  return details.length ? `Details: ${details.join(" · ")}` : "Optional details"
}

function remoteTypeLabel(value: Exclude<FormState["remote_type"], "">) {
  if (value === "on-site") return "On-site"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
