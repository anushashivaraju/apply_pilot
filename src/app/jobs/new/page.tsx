"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, LinkIcon, WandSparkles } from "lucide-react"
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
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const extract = async () => {
    setExtracting(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/jobs/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source_url: form.source_url }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setForm((current) => ({
        ...current,
        title: data.title ?? current.title,
        company: data.company ?? current.company,
        location: data.location ?? current.location,
        remote_type: data.remote_type ?? current.remote_type,
        description: data.description ?? current.description,
      }))
      setMessage(
        data.extraction_confidence === "low"
          ? "Extraction confidence is low. Review and edit the job details before analysis."
          : `Extracted fields are ready to review. Confidence: ${data.extraction_confidence ?? "medium"}.`
      )
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed. You can paste the job manually.")
      return null
    } finally {
      setExtracting(false)
    }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      let payload = {
        ...form,
        source_type: getSourceType(form.source_url, form.description),
      }

      if (!payload.description.trim() && payload.source_url.trim()) {
        const extracted = await extract()
        if (!extracted?.description) {
          throw new Error("I could not read enough from that URL. Paste the job description and try again.")
        }

        payload = {
          ...payload,
          title: extracted.title ?? payload.title,
          company: extracted.company ?? payload.company,
          location: extracted.location ?? payload.location,
          remote_type: extracted.remote_type ?? payload.remote_type,
          description: extracted.description,
        }
      }

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      router.push(`/jobs/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze job.")
    } finally {
      setLoading(false)
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
                <Button type="button" variant="secondary" onClick={extract} disabled={extracting || !form.source_url}>
                  {extracting ? "Extracting" : "Extract"}
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

            <div className="flex justify-end">
              <Button type="submit" disabled={loading || extracting || (!form.source_url.trim() && !form.description.trim())}>
                <WandSparkles className="h-4 w-4" />
                {loading ? "Analyzing" : "Analyze fit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </AppShell>
  )
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
