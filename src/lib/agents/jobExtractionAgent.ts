import { Readability } from "@mozilla/readability"
import * as cheerio from "cheerio"
import { JSDOM } from "jsdom"

export interface ExtractedJob {
  source_url: string
  title: string | null
  company: string | null
  location: string | null
  remote_type: "remote" | "hybrid" | "on-site" | null
  description: string | null
  extraction_confidence: "high" | "medium" | "low"
  raw_text_excerpt: string
}

function clean(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || null
}

function stripHtml(value?: string | null) {
  if (!value) return null
  return clean(value.replace(/<[^>]*>/g, " "))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = firstString(...value)
      if (nested) return nested
    }
    const text = asString(value)
    if (text) return text
  }
  return null
}

function findJobPosting(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value)
  if (!record) return null

  const type = record["@type"]
  const types = Array.isArray(type) ? type : [type]
  if (types.some((item) => typeof item === "string" && item.toLowerCase() === "jobposting")) {
    return record
  }

  for (const item of Object.values(record)) {
    if (Array.isArray(item)) {
      for (const nested of item) {
        const match = findJobPosting(nested)
        if (match) return match
      }
    } else {
      const match = findJobPosting(item)
      if (match) return match
    }
  }

  return null
}

function locationFromJobPosting(jobPosting: Record<string, unknown>) {
  const jobLocation = jobPosting.jobLocation
  const firstLocation = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation
  const locationRecord = asRecord(firstLocation)
  const address = asRecord(locationRecord?.address)
  return clean(
    [
      firstString(address?.addressLocality, address?.addressRegion),
      firstString(address?.addressCountry),
    ]
      .filter(Boolean)
      .join(", "),
  )
}

function extractStructuredJob($: cheerio.CheerioAPI) {
  for (const script of $("script[type='application/ld+json']").toArray()) {
    const rawJson = $(script).contents().text()
    if (!rawJson.trim()) continue

    try {
      const parsed = JSON.parse(rawJson)
      const jobPosting = findJobPosting(parsed)
      if (!jobPosting) continue

      const organization = asRecord(jobPosting.hiringOrganization)
      return {
        title: clean(firstString(jobPosting.title)),
        company: clean(firstString(organization?.name)),
        location: locationFromJobPosting(jobPosting),
        remote_type:
          firstString(jobPosting.jobLocationType)?.toUpperCase() === "TELECOMMUTE"
            ? "remote"
            : null,
        description: stripHtml(firstString(jobPosting.description)),
      } satisfies Partial<ExtractedJob>
    } catch {
      continue
    }
  }

  return null
}

function detectRemoteType(text: string): ExtractedJob["remote_type"] {
  const lower = text.toLowerCase()
  if (lower.includes("hybrid")) return "hybrid"
  if (lower.includes("remote")) return "remote"
  if (lower.includes("on-site") || lower.includes("onsite")) return "on-site"
  return null
}

function getExtractionConfidence(input: {
  title: string | null
  location: string | null
  description: string
}) {
  const hasJobSignals = /responsibilit|requirement|qualification|experience|skills|about the role|what you/i.test(
    input.description,
  )
  if (input.title && input.location && input.description.length > 1200 && hasJobSignals) return "high"
  if (input.title && input.description.length > 600) return "medium"
  return "low"
}

export async function runJobExtractionAgent(sourceUrl: string): Promise<ExtractedJob> {
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
  })

  if (!response.ok) {
    throw new Error("Could not fetch the career page.")
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const structuredJob = extractStructuredJob($)
  $("script, style, noscript, svg").remove()

  const title =
    structuredJob?.title ||
    clean($("meta[property='og:title']").attr("content")) ||
    clean($("h1").first().text()) ||
    clean($("title").text())

  const company =
    structuredJob?.company ||
    clean($("meta[property='og:site_name']").attr("content")) ||
    clean($("[data-company], .company, .job-company").first().text())

  const location =
    structuredJob?.location ||
    clean($("[data-location], .location, .job-location, [class*='location']").first().text())

  let description =
    structuredJob?.description ||
    clean(
      $(
        [
          "[data-job-description]",
          "[data-automation-id='jobPostingDescription']",
          "[data-testid='job-description']",
          ".job-description",
          ".posting-requirements",
          ".posting-description",
          ".description__text",
          "#job-description",
          "[class*='job-description']",
          "[class*='description']",
        ].join(", "),
      )
        .first()
        .text(),
    ) ||
    clean($("meta[name='description']").attr("content")) ||
    null

  if (!description || description.length < 300) {
    const dom = new JSDOM(html, { url: sourceUrl })
    const article = new Readability(dom.window.document).parse()
    description = clean(article?.textContent) || clean($("body").text())
  }

  if (!description || description.length < 100) {
    throw new Error("Could not extract enough job description text.")
  }

  const extractionConfidence = getExtractionConfidence({ title, location, description })

  return {
    source_url: sourceUrl,
    title,
    company,
    location,
    remote_type: detectRemoteType(`${title ?? ""} ${location ?? ""} ${description}`),
    description,
    extraction_confidence: extractionConfidence,
    raw_text_excerpt: description.slice(0, 1200),
  }
}
