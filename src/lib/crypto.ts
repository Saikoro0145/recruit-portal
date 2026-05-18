import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto'

/**
 * AES-256-GCM によるパスワード文字列の暗号化・復号。
 *
 * 保存形式: enc:v1:<base64(iv)>:<base64(ciphertext)>:<base64(tag)>
 *   - iv: 12 byte (96 bit)
 *   - tag: 16 byte (128 bit)
 *
 * 鍵は環境変数 RECRUIT_SECRET_KEY (Base64 32 byte) から取得する。
 */

const PREFIX = 'enc:v1:'
const IV_LEN = 12
const TAG_LEN = 16
const KEY_LEN = 32

let cachedKey: Buffer | null = null

function loadKey(): Buffer {
  if (cachedKey) return cachedKey
  const b64 = process.env.RECRUIT_SECRET_KEY
  if (!b64) {
    throw new Error(
      'RECRUIT_SECRET_KEY is not set. Run `npm run gen-key` to generate one and add it to .env.local'
    )
  }
  let key: Buffer
  try {
    key = Buffer.from(b64, 'base64')
  } catch {
    throw new Error('RECRUIT_SECRET_KEY must be a valid Base64 string')
  }
  if (key.length !== KEY_LEN) {
    throw new Error(
      `RECRUIT_SECRET_KEY must decode to ${KEY_LEN} bytes (got ${key.length}). Regenerate with \`npm run gen-key\``
    )
  }
  cachedKey = key
  return key
}

export function hasKey(): boolean {
  return !!process.env.RECRUIT_SECRET_KEY
}

export function isEncrypted(s: string | undefined | null): boolean {
  return typeof s === 'string' && s.startsWith(PREFIX)
}

export function encryptPassword(plain: string): string {
  if (plain === '') return ''
  const key = loadKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${ct.toString('base64')}:${tag.toString('base64')}`
}

export function decryptPassword(stored: string | undefined | null): string {
  if (!stored) return ''
  if (!isEncrypted(stored)) {
    // 平文 (lazy migration 前のデータ) はそのまま返す
    return stored
  }
  const key = loadKey()
  const rest = stored.slice(PREFIX.length)
  const parts = rest.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted password format')
  }
  const [ivB64, ctB64, tagB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const ct = Buffer.from(ctB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new Error('Invalid encrypted password format')
  }
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(ct), decipher.final()])
  return plain.toString('utf-8')
}
