// Uso: node scripts/create-superadmin.mjs <email> <password>
// Ejemplo: node scripts/create-superadmin.mjs admin@chikiglam.com MiPassword123
import { writeFileSync } from 'fs'

const email    = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Uso: node scripts/create-superadmin.mjs <email> <password>')
  process.exit(1)
}

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
const hash = `${saltHex}:${hashHex}`

const id = 'superadmin-001'
const now = new Date().toISOString()

const sql = `INSERT OR REPLACE INTO users (id, name, email, password_hash, phone, role, is_active, created_at, updated_at)
VALUES ('${id}', 'Super Admin', '${email}', '${hash}', NULL, 'superadmin', 1, '${now}', '${now}');`

writeFileSync('superadmin.sql', sql)
console.log('✓ superadmin.sql generado. Ejecutá:')
console.log('  wrangler d1 execute chikiglam-db --remote --file superadmin.sql')
