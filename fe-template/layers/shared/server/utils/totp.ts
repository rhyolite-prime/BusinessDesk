/**
 * TOTP (RFC 6238) + base32 — for Google Authenticator / Authy enrolment
 * and verification. Pure Node crypto; no external TOTP library needed.
 */
import crypto from 'node:crypto'

// ── base32 (RFC 4648, no padding required by authenticators) ──────────────
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
    value &= (1 << bits) - 1
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(secret: string): Buffer {
  const clean = secret.replace(/=+$/g, '').toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
      value &= (1 << bits) - 1
    }
  }
  return Buffer.from(bytes)
}

// ── TOTP ─────────────────────────────────────────────────────────────────
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20))
}

export function totpFromTime(secret: string, time: number, step = 30, digits = 6): string {
  const key = base32Decode(secret)
  const counter = Math.floor(time / step)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(code % 10 ** digits).padStart(digits, '0')
}

/** Verify a code with ±1 step window (clock drift tolerance). */
export function verifyTotp(secret: string, token: string, step = 30): boolean {
  const clean = String(token).replace(/\s+/g, '')
  if (!/^\d{6}$/.test(clean)) return false
  const now = Math.floor(Date.now() / 1000)
  for (const drift of [-1, 0, 1]) {
    if (totpFromTime(secret, now + drift * step, step) === clean) return true
  }
  return false
}

/** Current code (used by the dev demo hint and for testing). */
export function currentTotp(secret: string): string {
  return totpFromTime(secret, Math.floor(Date.now() / 1000))
}

export function otpauthUrl(secret: string, issuer: string, account: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  return `otpauth://totp/${label}?${params.toString()}`
}
