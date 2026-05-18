#!/usr/bin/env node
// src/data/companies.json 内の平文 password を一括で AES-256-GCM 暗号化する。
// 既に enc:v1: で始まるものはスキップ。
//
// 使い方:
//   1. .env.local に RECRUIT_SECRET_KEY を設定
//   2. node scripts/encrypt-existing.mjs (または npm run encrypt-existing)
import { createCipheriv, randomBytes } from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PREFIX = 'enc:v1:'
const IV_LEN = 12

// .env.local を簡易ロード (dotenv 依存を避ける)
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const b64 = process.env.RECRUIT_SECRET_KEY
if (!b64) {
  console.error('Error: RECRUIT_SECRET_KEY is not set. Run `npm run gen-key` first and add it to .env.local')
  process.exit(1)
}
const key = Buffer.from(b64, 'base64')
if (key.length !== 32) {
  console.error(`Error: RECRUIT_SECRET_KEY must decode to 32 bytes (got ${key.length})`)
  process.exit(1)
}

const companiesPath = path.join(__dirname, '..', 'src', 'data', 'companies.json')
if (!fs.existsSync(companiesPath)) {
  console.error(`Error: ${companiesPath} not found`)
  process.exit(1)
}

function encrypt(plain) {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${ct.toString('base64')}:${tag.toString('base64')}`
}

const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'))
let changed = 0
let skipped = 0
let emptySkipped = 0
for (const c of companies) {
  if (!c.password) { emptySkipped++; continue }
  if (typeof c.password !== 'string') { continue }
  if (c.password.startsWith(PREFIX)) { skipped++; continue }
  c.password = encrypt(c.password)
  changed++
  console.log(`  ✓ encrypted: ${c.id}`)
}

if (changed > 0) {
  fs.writeFileSync(companiesPath, JSON.stringify(companies, null, 2))
}

console.log()
console.log(`Done. encrypted=${changed}, already-encrypted=${skipped}, empty=${emptySkipped}`)
