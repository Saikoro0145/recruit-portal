import { getCompanies, getEvents, getCategories } from '@/lib/data'
import CalendarClient from '@/components/CalendarClient'
import { Company, InternEvent } from '@/types'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    event: InternEvent
    company: Company
  }
}

export default function CalendarPage() {
  const companies = getCompanies()
  const events = getEvents()
  const categories = getCategories()

  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]))

  const calendarEvents: CalendarEvent[] = events
    .map(event => {
      const company = companyMap[event.companyId]
      if (!company) return null
      const isDeadline = event.type === 'deadline'
      return {
        id: event.id,
        title: event.title,
        start: event.start,
        end: isDeadline ? event.start : event.end,
        allDay: isDeadline ? true : !event.start.includes('T'),
        backgroundColor: company.color,
        borderColor: company.color,
        textColor: '#ffffff',
        extendedProps: { event, company },
      }
    })
    .filter((e): e is CalendarEvent => e !== null)

  return <CalendarClient events={calendarEvents} companies={companies} categories={categories} />
}
