/**
 * Enrol a TOTP secret for Google Authenticator.
 * Called by the signup / settings pages. Returns the otpauth URL, a QR
 * data-URI and the current demo code so the flow can be tested without
 * a phone (remove the demo code in production).
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const username = String(q.username ?? '').trim().toLowerCase()
  if (!username) throw badRequest('username required')

  const st = authStore()
  let secret = st.totp.get(username)
  if (!secret) {
    secret = generateTotpSecret()
    st.totp.set(username, secret)
  }
  const issuer = 'BusinessDesk ERP'
  const url = otpauthUrl(secret, issuer, username)
  const QRCode = await import('qrcode')
  const qr = await QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#0C231C', light: '#FFFFFF' } })

  return {
    secret,
    otpauth: url,
    qr,
    issuer,
    demoCode: currentTotp(secret),
    demoCodeExpiresIn: 30 - (Math.floor(Date.now() / 1000) % 30),
  }
})
