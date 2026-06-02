"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { WandSparkles } from "lucide-react"
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed. You can paste the job manually.")
    } finally {
      setExtracting(false)
    }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
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
        <p className="text-sm text-muted-foreground">Add a company career page URL or paste a LinkedIn description for AI fit analysis.</p>
      </div>

      <form onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Job input</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            {error ? <StatusMessage title="Action needed" message={error} /> : null}
            {message ? <StatusMessage title="Ready" message={message} /> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Source type</Label>
                <Select value={form.source_type} onValueChange={(value) => value && update("source_type", value)}>
                  <SelectTrigger>
                    <SelectValue>{sourceTypeLabel(form.source_type)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="company_career_page">Company career page</SelectItem>
                    <SelectItem value="manual">Manual/other</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source_url">Source URL optional</Label>
                <div className="flex gap-2">
                  <Input id="source_url" value={form.source_url} onChange={(event) => update("source_url", event.target.value)} />
                  {form.source_type === "company_career_page" ? (
                    <Button type="button" variant="secondary" onClick={extract} disabled={extracting || !form.source_url}>
                      {extracting ? "Extracting" : "Extract"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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

            <div className="space-y-2">
              <Label htmlFor="description">Job description</Label>
              <Textarea id="description" value={form.description} onChange={(event) => update("description", event.target.value)} className="min-h-72" required />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
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

function sourceTypeLabel(value: FormState["source_type"]) {
  if (value === "linkedin") return "LinkedIn"
  if (value === "company_career_page") return "Company career page"
  if (value === "manual") return "Manual/other"
  return "Other"
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
