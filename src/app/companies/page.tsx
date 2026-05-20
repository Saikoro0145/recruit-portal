import CompaniesClient from '@/components/CompaniesClient'
import { getCategories, getCompanies, getEvents } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default function CompaniesPage() {
  const companies = getCompanies()
  const events = getEvents()
  const categories = getCategories()

  return (
    <CompaniesClient
      companies={companies}
      events={events}
      categories={categories}
    />
  )
}
