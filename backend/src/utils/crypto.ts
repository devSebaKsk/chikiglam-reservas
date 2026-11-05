export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const keyMaterial = await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits'])
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${saltHex}:${hashHex}`
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [saltHex, storedHash] = hash.split(':')
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const keyMaterial = await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits'])
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex === storedHash
}
