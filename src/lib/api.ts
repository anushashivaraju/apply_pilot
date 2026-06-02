import { NextResponse } from "next/server"

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  return values.filter((value): value is string => typeof value === "string")
}

export function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

