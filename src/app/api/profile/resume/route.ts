import { NextResponse } from "next/server"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { PDFParse } from "pdf-parse"
import { runCandidateProfileAgent } from "@/lib/agents/candidateProfileAgent"
import { jsonError } from "@/lib/api"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export const runtime = "nodejs"

PDFParse.setWorker(
  pathToFileURL(join(process.cwd(), "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs")).href,
)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("resume")

    if (!(file instanceof File)) {
      return jsonError("Resume PDF is required.")
    }

    if (file.type !== "application/pdf") {
      return jsonError("Resume must be a PDF.")
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const parser = new PDFParse({ data: bytes })
    const parsed = await parser.getText()
    await parser.destroy()

    const resumeText = parsed.text.trim()
    if (!resumeText) {
      return jsonError("Could not parse text from the resume PDF.")
    }

    const candidateProfileSummary = await runCandidateProfileAgent(resumeText)

    const storagePath = `profile/${Date.now()}-${file.name}`
    const supabase = getSupabaseAdmin()
    const upload = await supabase.storage.from("resumes").upload(storagePath, bytes, {
      contentType: file.type,
      upsert: true,
    })

    if (upload.error) throw upload.error

    const { error } = await supabase
      .from("profile")
      .update({
        resume_text: resumeText,
        candidate_profile_summary: candidateProfileSummary,
        resume_filename: file.name,
        resume_storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)

    if (error) throw error

    return NextResponse.json({
      filename: file.name,
      wordCount: resumeText.split(/\s+/).filter(Boolean).length,
      candidateProfileSummary,
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not upload resume.", 400)
  }
}
