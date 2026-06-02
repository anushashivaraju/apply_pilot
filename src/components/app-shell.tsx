"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { BriefcaseBusiness, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/jobs/new", label: "Add Job" },
    { href: "/settings", label: "Settings" },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
              <BriefcaseBusiness className="h-4 w-4" />
            </span>
            Apply Pilot
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <nav className="grid w-full grid-cols-3 gap-1 rounded-2xl bg-slate-100/70 p-1 ring-1 ring-slate-200 sm:flex sm:w-auto sm:items-center">
              {links.map((link) => {
                const active = pathname === link.href || (link.href === "/dashboard" && pathname === "/")
                return (
                  <Link
                    key={link.href}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap text-slate-600 transition hover:bg-white/80 hover:text-slate-950",
                      active && "bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100"
                    )}
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-xl bg-white/80 text-slate-600 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-700"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" })
                router.replace("/login")
                router.refresh()
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
