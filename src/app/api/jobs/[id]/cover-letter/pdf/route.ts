import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib"
import { jsonError } from "@/lib/api"
import { normalizeProfile } from "@/lib/profile"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export const runtime = "nodejs"

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN_X = 48
const TOP_Y = 778
const FONT_SIZE = 10
const LINE_HEIGHT = 13.5

function normalizePdfText(value: string) {
  return value
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u201c", '"')
    .replaceAll("\u201d", '"')
    .replaceAll("\u2022", "-")
    .replaceAll("\u2026", "...")
    .replaceAll("\u00a0", " ")
    .replaceAll("\u202f", " ")
    .replace(/\r\n/g, "\n")
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "")
}

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
    } else {
      if (current) lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines.length ? lines : [""]
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cover-letter"
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()
    const profileResult = await supabase.from("profile").select("*").eq("id", 1).single()
    const jobResult = await supabase.from("jobs").select("*").eq("id", id).single()

    if (profileResult.error) throw profileResult.error
    if (jobResult.error) throw jobResult.error
    if (!jobResult.data.cover_letter?.trim()) return jsonError("Generate or write a cover letter first.", 400)

    const profile = normalizeProfile(profileResult.data)
    const job = jobResult.data
    const germanLetter = /(?:^|\n)\s*Sehr geehrte|Mit freundlichen Gr[uü][sß]en/i.test(job.cover_letter)
    const document = await PDFDocument.create()
    const font = await document.embedFont(StandardFonts.Helvetica)
    const bold = await document.embedFont(StandardFonts.HelveticaBold)
    let page = document.addPage([A4_WIDTH, A4_HEIGHT])
    let y = TOP_Y

    const drawLine = (text: string, options: { font?: PDFFont; size?: number; gapAfter?: number } = {}) => {
      const selectedFont = options.font ?? font
      const size = options.size ?? FONT_SIZE
      page.drawText(normalizePdfText(text), {
        x: MARGIN_X,
        y,
        size,
        font: selectedFont,
        color: rgb(0.05, 0.05, 0.05),
      })
      y -= options.gapAfter ?? LINE_HEIGHT
    }

    const ensureSpace = (needed: number) => {
      if (y - needed > 48) return
      page = document.addPage([A4_WIDTH, A4_HEIGHT])
      y = TOP_Y
    }

    const drawParagraph = (paragraph: string) => {
      const lines = wrapLine(normalizePdfText(paragraph), font, FONT_SIZE, A4_WIDTH - MARGIN_X * 2)
      ensureSpace(lines.length * LINE_HEIGHT + LINE_HEIGHT)
      for (const line of lines) drawLine(line)
      y -= 7
    }

    drawLine(profile.name || "Applicant")
    if (profile.email) drawLine(profile.email)
    y -= 15

    drawLine(job.company || "Hiring team")
    if (job.location) drawLine(job.location)
    y -= 18

    drawLine(
      germanLetter
        ? `Bewerbung als ${job.title || "ausgeschriebene Position"}`
        : `Application for ${job.title || "the advertised position"}`,
      { font: bold },
    )
    y -= 14

    const paragraphs = normalizePdfText(job.cover_letter)
      .split(/\n\s*\n/)
      .map((paragraph: string) => paragraph.replace(/\s*\n\s*/g, " ").trim())
      .filter(Boolean)

    for (const paragraph of paragraphs) drawParagraph(paragraph)

    const bytes = await document.save()
    const filename = `${safeFilename(job.company || "")}-${safeFilename(job.title || "")}-cover-letter.pdf`

    return new Response(Buffer.from(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create cover-letter PDF.", 400)
  }
}
