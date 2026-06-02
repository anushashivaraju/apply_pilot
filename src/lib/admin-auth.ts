const COOKIE_NAME = "apply_pilot_admin"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || ""
}

function base64Url(bytes: Uint8Array) {
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function hmac(message: string, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
  return crypto.subtle.sign("HMAC", key, encoder.encode(message))
}

export function getAdminCookieName() {
  return COOKIE_NAME
}

export function getAdminSessionMaxAge() {
  return SESSION_MAX_AGE_SECONDS
}

export async function createAdminSessionToken() {
  const secret = getSecret()
  if (!secret) {
    throw new Error("ADMIN_PASSWORD is not configured.")
  }

  const createdAt = String(Date.now())
  const signature = new Uint8Array(await hmac(createdAt, secret))
  return `${createdAt}.${base64Url(signature)}`
}

export async function verifyAdminSessionToken(token: string | undefined) {
  const secret = getSecret()
  if (!secret || !token) return false

  const [createdAt, signature] = token.split(".")
  if (!createdAt || !signature) return false

  const timestamp = Number(createdAt)
  if (!Number.isFinite(timestamp)) return false
  if (Date.now() - timestamp > SESSION_MAX_AGE_SECONDS * 1000) return false

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )

    return crypto.subtle.verify("HMAC", key, fromBase64Url(signature), encoder.encode(createdAt))
  } catch {
    return false
  }
}

export function isAdminPassword(value: string) {
  return Boolean(process.env.ADMIN_PASSWORD && value === process.env.ADMIN_PASSWORD)
}
