import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

const recruitRoot = process.env.RECRUIT_ROOT
  ? path.resolve(process.env.RECRUIT_ROOT)
  : path.resolve(process.cwd(), '..')

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  md: 'text/markdown; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  html: 'text/html; charset=utf-8',
  json: 'application/json; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
}

// ブラウザ内で表示できる拡張子 (inline)。それ以外はダウンロード (attachment)
const INLINE_EXTS = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'txt', 'md', 'html', 'json',
])

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const relative = url.searchParams.get('path')
  if (!relative) {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }

  // path traversal 防止: 絶対パス化したものが recruitRoot 配下であることを検証
  const abs = path.resolve(recruitRoot, relative)
  const rootWithSep = recruitRoot.endsWith(path.sep) ? recruitRoot : recruitRoot + path.sep
  if (!abs.startsWith(rootWithSep)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  let stat: fs.Stats
  try {
    stat = fs.statSync(abs)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!stat.isFile()) {
    return NextResponse.json({ error: 'Not a file' }, { status: 400 })
  }

  const ext = path.extname(abs).toLowerCase().slice(1)
  const mime = MIME[ext] ?? 'application/octet-stream'
  const data = fs.readFileSync(abs)
  const filename = encodeURIComponent(path.basename(abs))
  const disposition = INLINE_EXTS.has(ext)
    ? `inline; filename*=UTF-8''${filename}`
    : `attachment; filename*=UTF-8''${filename}`

  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': disposition,
      'Content-Length': String(stat.size),
      'Cache-Control': 'no-cache',
    },
  })
}
