"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BriefcaseBusiness, LockKeyhole } from "lucide-react"
import { StatusMessage } from "@/components/status-message"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/dashboard"
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      router.replace(next.startsWith("/") ? next : "/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoginShell>
      <form onSubmit={submit} className="space-y-4">
        {error ? <StatusMessage title="Sign in failed" message={error} /> : null}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 rounded-xl border-slate-200 bg-slate-50/80 focus-visible:border-indigo-300 focus-visible:ring-indigo-100"
            required
          />
        </div>
        <Button type="submit" className="h-10 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
          {loading ? "Checking" : "Unlock"}
        </Button>
      </form>
    </LoginShell>
  )
}

function LoginShell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
            <BriefcaseBusiness className="h-5 w-5" />
          </span>
          Job Assistant
        </div>

        <Card className="border-slate-200/80 bg-white/95">
          <CardHeader className="items-center text-center">
            <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
              <LockKeyhole className="h-6 w-6" />
            </span>
            <CardTitle className="text-xl font-semibold text-slate-950">Admin access</CardTitle>
            <p className="text-sm text-slate-600">Enter the admin password to open the application assistant.</p>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  )
}
