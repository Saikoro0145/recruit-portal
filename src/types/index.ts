export type Category = string
export type EventType = 'deadline' | 'internship' | 'selection' | 'event'
export type Status = 'pending' | 'applied' | 'in_progress' | 'passed' | 'rejected' | 'done'

export interface CategoryDef {
  id: string
  label: string
  color: string
}

export interface Company {
  id: string
  name: string
  category: Category
  color: string
  notes: string
  url: string
  readmePath?: string
  mypageUrl?: string
  loginId?: string
  webTestType?: string
  password?: string
}

export interface InternEvent {
  id: string
  companyId: string
  title: string
  type: EventType
  start: string
  end: string
  status: Status
  note: string
}
