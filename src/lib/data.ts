import fs from 'fs'
import path from 'path'
import { Company, CategoryDef, InternEvent } from '@/types'
import { decryptPassword, isEncrypted } from './crypto'

const dataDir = path.join(process.cwd(), 'src/data')
const recruitRoot = process.env.RECRUIT_ROOT
  ? path.resolve(process.env.RECRUIT_ROOT)
  : path.join(process.cwd(), '..')

export function getCompanies(): Company[] {
  const companies: Company[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'companies.json'), 'utf-8'))
  return companies.map(c => {
    if (c.readmePath) {
      try {
        c.notes = fs.readFileSync(path.join(recruitRoot, c.readmePath), 'utf-8')
      } catch {
        // readmePath が見つからない場合は JSON の notes にフォールバック
      }
    }
    if (c.password && isEncrypted(c.password)) {
      try {
        c.password = decryptPassword(c.password)
      } catch (err) {
        console.error(`[crypto] failed to decrypt password for ${c.id}:`, err)
        c.password = ''
      }
    }
    return c
  })
}

export function getCategories(): CategoryDef[] {
  return JSON.parse(fs.readFileSync(path.join(dataDir, 'categories.json'), 'utf-8'))
}

export function getEvents(): InternEvent[] {
  return JSON.parse(fs.readFileSync(path.join(dataDir, 'events.json'), 'utf-8'))
}

export interface CompanyFile {
  name: string
  fullPath: string
  relativePath: string
  ext: string
}

export function getCompanyFiles(company: Company): CompanyFile[] {
  if (!company.readmePath) return []
  const folder = path.join(recruitRoot, path.dirname(company.readmePath))
  try {
    return fs.readdirSync(folder)
      .filter(f => !f.startsWith('.'))
      .map(name => {
        const fullPath = path.join(folder, name)
        return {
          name,
          fullPath,
          relativePath: path.relative(recruitRoot, fullPath),
          ext: path.extname(name).toLowerCase().slice(1),
        }
      })
  } catch {
    return []
  }
}
