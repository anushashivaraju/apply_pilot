"use client"

import { useEffect, useState } from "react"
import { Upload } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { StatusMessage } from "@/components/status-message"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { Profile } from "@/types"

function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [wordCount, setWordCount] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/profile")
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setProfile(data)
        setWordCount(data.resume_text ? data.resume_text.split(/\s+/).filter(Boolean).length : null)
      })
      .catch((err) => setError(err.message))
  }, [])

  const uploadResume = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError("")
    setMessage("")
    const formData = new FormData()
    formData.append("resume", file)

    try {
      const response = await fetch("/api/profile/resume", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setProfile((current) => current && {
        ...current,
        resume_filename: data.filename,
        candidate_profile_summary: data.candidateProfileSummary,
      })
      setWordCount(data.wordCount)
      setMessage("Resume uploaded, parsed, and summarized.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload resume.")
    } finally {
      setUploading(false)
    }
  }

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setProfile(data)
      setMessage("Settings saved.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage the source resume, profile, and job preferences used by the assistant.</p>
      </div>

      <form onSubmit={save}>
        <Card>
          <CardHeader>
            <CardTitle>Profile settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            {error ? <StatusMessage title="Could not complete action" message={error} /> : null}
            {message ? <StatusMessage title="Saved" message={message} /> : null}

            <div className="grid gap-3 rounded-md border p-4">
              <Label htmlFor="resume">Resume PDF upload</Label>
              <Input id="resume" type="file" accept="application/pdf" onChange={uploadResume} disabled={uploading} />
              <div className="grid gap-1 text-sm text-muted-foreground">
                <span>Current resume filename: {profile?.resume_filename || "None"}</span>
                <span>Parsed word count: {wordCount ?? 0}</span>
                <span>Candidate profile summary: {profile?.candidate_profile_summary ? "Generated" : "Not generated"}</span>
              </div>
              <label htmlFor="resume" className={buttonVariants({ variant: "secondary", className: "w-fit cursor-pointer" })}>
                <Upload className="h-4 w-4" />
                {profile?.resume_filename ? "Replace resume" : "Upload resume"}
              </label>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" value={profile?.name ?? ""} onChange={(value) => setProfile((current) => current && { ...current, name: value })} />
              <Field label="Email" value={profile?.email ?? ""} onChange={(value) => setProfile((current) => current && { ...current, email: value })} />
              <NumberField label="Dashboard minimum score" value={profile?.dashboard_min_score ?? 0} onChange={(value) => setProfile((current) => current && { ...current, dashboard_min_score: value })} />
            </div>

            <TextList label="Preferred roles" value={profile?.preferred_roles ?? []} onChange={(value) => setProfile((current) => current && { ...current, preferred_roles: value })} />
            <TextList label="Excluded companies" value={profile?.excluded_companies ?? []} onChange={(value) => setProfile((current) => current && { ...current, excluded_companies: value })} />
            <TextList label="Excluded keywords" value={profile?.excluded_keywords ?? []} onChange={(value) => setProfile((current) => current && { ...current, excluded_keywords: value })} />

            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !profile}>{saving ? "Saving" : "Save settings"}</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </AppShell>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  )
}

function TextList({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea value={value.join("\n")} onChange={(event) => onChange(splitLines(event.target.value))} />
    </div>
  )
}
