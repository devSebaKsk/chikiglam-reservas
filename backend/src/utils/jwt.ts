import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from '../types'

export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey)
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}
