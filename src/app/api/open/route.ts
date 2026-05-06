import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

const recruitRoot = process.env.RECRUIT_ROOT
  ? path.resolve(process.env.RECRUIT_ROOT)
  : path.resolve(process.cwd(), '..')

export async function POST(req: NextRequest) {
  const { filePath } = await req.json()
  if (typeof filePath !== 'string' || !filePath.startsWith(recruitRoot)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }
  exec(`open "${filePath}"`)
  return NextResponse.json({ ok: true })
}
