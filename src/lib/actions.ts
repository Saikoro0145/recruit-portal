'use server'
import fs from 'fs'
import path from 'path'
import { revalidatePath } from 'next/cache'
import { Company, CategoryDef, InternEvent } from '@/types'
import { encryptPassword } from './crypto'

const dataDir = path.join(process.cwd(), 'src/data')
const recruitRoot = process.env.RECRUIT_ROOT
  ? path.resolve(process.env.RECRUIT_ROOT)
  : path.join(process.cwd(), '..')

export async function updateCompanyNotes(id: string, notes: string) {
  const companies: Company[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'companies.json'), 'utf-8'))
  const company = companies.find(c => c.id === id)
  if (company?.readmePath) {
    fs.writeFileSync(path.join(recruitRoot, company.readmePath), notes)
  } else {
    const idx = companies.findIndex(c => c.id === id)
    if (idx !== -1) {
      companies[idx].notes = notes
      fs.writeFileSync(path.join(dataDir, 'companies.json'), JSON.stringify(companies, null, 2))
    }
  }
  revalidatePath('/companies')
  revalidatePath(`/companies/${id}`)
}

export async function updateEventStatus(id: string, status: string) {
  const events: InternEvent[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'events.json'), 'utf-8'))
  const idx = events.findIndex(e => e.id === id)
  if (idx !== -1) {
    events[idx].status = status as InternEvent['status']
    fs.writeFileSync(path.join(dataDir, 'events.json'), JSON.stringify(events, null, 2))
  }
  revalidatePath('/')
  revalidatePath('/companies')
}

export async function addEvent(event: Omit<InternEvent, 'id'>) {
  const events: InternEvent[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'events.json'), 'utf-8'))
  const newEvent: InternEvent = { ...event, id: `evt-${Date.now()}` }
  events.push(newEvent)
  fs.writeFileSync(path.join(dataDir, 'events.json'), JSON.stringify(events, null, 2))
  revalidatePath('/')
  revalidatePath('/companies')
}

export async function deleteEvent(id: string) {
  const events: InternEvent[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'events.json'), 'utf-8'))
  fs.writeFileSync(path.join(dataDir, 'events.json'), JSON.stringify(events.filter(e => e.id !== id), null, 2))
  revalidatePath('/')
  revalidatePath('/companies')
}

export async function addCompany(data: {
  id: string
  name: string
  category: string
  color: string
  url: string
  mypageUrl: string
  loginId: string
  webTestType?: string
  password?: string
}) {
  const companies: Company[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'companies.json'), 'utf-8'))
  if (companies.find(c => c.id === data.id)) throw new Error('ID already exists')
  const readmePath = `${data.category}/${data.id}/README.md`
  const readmeAbsPath = path.join(recruitRoot, readmePath)
  fs.mkdirSync(path.dirname(readmeAbsPath), { recursive: true })
  if (!fs.existsSync(readmeAbsPath)) fs.writeFileSync(readmeAbsPath, '')
  const encryptedPassword = data.password ? encryptPassword(data.password) : ''
  companies.push({
    ...data,
    readmePath,
    notes: '',
    category: data.category as Company['category'],
    password: encryptedPassword,
  })
  fs.writeFileSync(path.join(dataDir, 'companies.json'), JSON.stringify(companies, null, 2))
  revalidatePath('/')
  revalidatePath('/companies')
}

export async function updateCompanyAccount(id: string, mypageUrl: string, loginId: string, url: string, webTestType?: string, password?: string) {
  const companies: Company[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'companies.json'), 'utf-8'))
  const idx = companies.findIndex(c => c.id === id)
  if (idx !== -1) {
    companies[idx].mypageUrl = mypageUrl
    companies[idx].loginId = loginId
    companies[idx].url = url
    companies[idx].webTestType = webTestType ?? ''
    companies[idx].password = password ? encryptPassword(password) : ''
    fs.writeFileSync(path.join(dataDir, 'companies.json'), JSON.stringify(companies, null, 2))
  }
  revalidatePath(`/companies/${id}`)
}

export async function addCategory(data: CategoryDef) {
  const categoriesPath = path.join(dataDir, 'categories.json')
  const categories: CategoryDef[] = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'))
  if (categories.find(c => c.id === data.id)) throw new Error('ID already exists')
  categories.push(data)
  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2))
  fs.mkdirSync(path.join(recruitRoot, data.id), { recursive: true })
  revalidatePath('/')
  revalidatePath('/companies')
}

export async function deleteCompany(id: string) {
  const companiesPath = path.join(dataDir, 'companies.json')
  const eventsPath = path.join(dataDir, 'events.json')
  const companies: Company[] = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'))
  const company = companies.find(c => c.id === id)
  if (!company) throw new Error('Company not found')

  const folderRel = company.readmePath ? path.dirname(company.readmePath) : path.join(company.category, company.id)
  const folderAbs = path.join(recruitRoot, folderRel)
  if (fs.existsSync(folderAbs)) fs.rmSync(folderAbs, { recursive: true, force: true })

  fs.writeFileSync(companiesPath, JSON.stringify(companies.filter(c => c.id !== id), null, 2))

  const events: InternEvent[] = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'))
  fs.writeFileSync(eventsPath, JSON.stringify(events.filter(e => e.companyId !== id), null, 2))

  revalidatePath('/')
  revalidatePath('/companies')
}

export async function deleteCategory(id: string) {
  const companiesPath = path.join(dataDir, 'companies.json')
  const companies: Company[] = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'))
  const remaining = companies.filter(c => c.category === id)
  if (remaining.length > 0) throw new Error('Category has companies')

  const categoriesPath = path.join(dataDir, 'categories.json')
  const categories: CategoryDef[] = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'))
  fs.writeFileSync(categoriesPath, JSON.stringify(categories.filter(c => c.id !== id), null, 2))

  const folderAbs = path.join(recruitRoot, id)
  if (fs.existsSync(folderAbs)) {
    const entries = fs.readdirSync(folderAbs)
    if (entries.length === 0) fs.rmdirSync(folderAbs)
  }

  revalidatePath('/')
  revalidatePath('/companies')
}

export async function updateEvent(id: string, data: Partial<Omit<InternEvent, 'id' | 'companyId'>>) {
  const events: InternEvent[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'events.json'), 'utf-8'))
  const idx = events.findIndex(e => e.id === id)
  if (idx !== -1) {
    events[idx] = { ...events[idx], ...data }
    fs.writeFileSync(path.join(dataDir, 'events.json'), JSON.stringify(events, null, 2))
  }
  revalidatePath('/')
  revalidatePath('/companies')
}
