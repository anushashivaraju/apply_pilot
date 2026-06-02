import { NextResponse } from "next/server"
import { z } from "zod"
import { runJobExtractionAgent } from "@/lib/agents/jobExtractionAgent"
import { jsonError } from "@/lib/api"

export const runtime = "nodejs"

const extractSchema = z.object({
  source_url: z.string().url(),
})

export async function POST(request: Request) {
  try {
    const { source_url } = extractSchema.parse(await request.json())
    const extracted = await runJobExtractionAgent(source_url)
    return NextResponse.json(extracted)
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? `Extraction failed: ${error.message}. You can paste the job details manually.`
        : "Extraction failed. You can paste the job details manually.",
      400,
    )
  }
}

