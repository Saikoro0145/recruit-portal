#!/usr/bin/env node
// 32 byte ランダムキーを Base64 で出力する。
// .env.local に RECRUIT_SECRET_KEY=<出力> として保存して使う。
import { randomBytes } from 'crypto'

const key = randomBytes(32).toString('base64')
console.log()
console.log('Generated RECRUIT_SECRET_KEY (Base64, 32 bytes):')
console.log()
console.log(`RECRUIT_SECRET_KEY=${key}`)
console.log()
console.log('Append the line above to recruit-portal/.env.local')
console.log()
