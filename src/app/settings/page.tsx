import { getSettings } from '@/lib/data'
import SettingsClient from '@/components/SettingsClient'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const settings = getSettings()
  return <SettingsClient settings={settings} />
}
