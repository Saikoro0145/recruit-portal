'use client'

import { useEffect } from 'react'

export default function HashOpener() {
  useEffect(() => {
    const open = () => {
      const hash = window.location.hash.slice(1)
      if (!hash) return
      const el = document.getElementById(hash)
      if (el instanceof HTMLDetailsElement) {
        el.open = true
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])
  return null
}
