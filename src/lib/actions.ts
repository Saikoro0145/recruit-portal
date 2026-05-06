'use server'
import fs from 'fs'
import path from 'path'
import { revalidatePath } from 'next/cache'
import { Company, CategoryDef, InternEvent } from '@/types'

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
}) {
  const companies: Company[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'companies.json'), 'utf-8'))
  if (companies.find(c => c.id === data.id)) throw new Error('ID already exists')
  companies.push({ ...data, notes: '', category: data.category as Company['category'] })
  fs.writeFileSync(path.join(dataDir, 'companies.json'), JSON.stringify(companies, null, 2))
  revalidatePath('/')
  revalidatePath('/companies')
}

export async function updateCompanyAccount(id: string, mypageUrl: string, loginId: string, url: string) {
  const companies: Company[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'companies.json'), 'utf-8'))
  const idx = companies.findIndex(c => c.id === id)
  if (idx !== -1) {
    companies[idx].mypageUrl = mypageUrl
    companies[idx].loginId = loginId
    companies[idx].url = url
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
