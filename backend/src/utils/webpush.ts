// PKCS8 wrapper prefix for a raw P-256 EC private key (32 bytes)
const EC_P256_PKCS8_PREFIX = new Uint8Array([
  0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06,
  0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
  0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
  0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01,
  0x01, 0x04, 0x20,
])

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function decodeB64url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

async function vapidJwt(audience: string, subject: string, privateKeyBase64url: string): Promise<string> {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = b64url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: subject,
  })))
  const signingInput = `${header}.${payload}`

  const rawKey = decodeB64url(privateKeyBase64url)
  const pkcs8 = new Uint8Array(EC_P256_PKCS8_PREFIX.length + rawKey.length)
  pkcs8.set(EC_P256_PKCS8_PREFIX)
  pkcs8.set(rawKey, EC_P256_PKCS8_PREFIX.length)

  const key = await crypto.subtle.importKey(
    'pkcs8', pkcs8,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput))
  return `${signingInput}.${b64url(sig)}`
}

export interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

export async function sendPush(
  subscription: PushSubscription,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<void> {
  const url = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const jwt = await vapidJwt(audience, vapidSubject, vapidPrivateKey)

  await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
      TTL: '86400',
    },
  })
}
