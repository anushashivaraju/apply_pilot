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
      "user-agent": "JobMatchDashboard/1.0",
      accept: "text/html,application/xhtml+xml",
    },
  })

  if (!response.ok) {
    throw new Error("Could not fetch the career page.")
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  $("script, style, noscript, svg").remove()

  const title =
    clean($("meta[property='og:title']").attr("content")) ||
    clean($("h1").first().text()) ||
    clean($("title").text())

  const company =
    clean($("meta[property='og:site_name']").attr("content")) ||
    clean($("[data-company], .company, .job-company").first().text())

  const location = clean(
    $("[data-location], .location, .job-location, [class*='location']").first().text(),
  )

  let description =
    clean($("[data-job-description], .job-description, #job-description, [class*='description']").first().text()) ||
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
