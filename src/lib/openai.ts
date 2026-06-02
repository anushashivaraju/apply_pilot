import OpenAI from "openai"

let client: OpenAI | null = null

export function getOpenAI() {
  if (client) {
    return client
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.")
  }

  client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  return client
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || getOpenAIGenerationModel()
}

export function getOpenAIAnalysisModel() {
  return process.env.OPENAI_ANALYSIS_MODEL || "gpt-5-mini"
}

export function getOpenAIGenerationModel() {
  return process.env.OPENAI_GENERATION_MODEL || process.env.OPENAI_MODEL || "gpt-5"
}
