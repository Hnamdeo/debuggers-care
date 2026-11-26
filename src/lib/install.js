// Installable app: the browser offers "Install" once the app qualifies; we keep that offer
// and show our own "Install app" button. iPhones have no such offer, so there we explain
// Share > Add to Home Screen instead.
import { useEffect, useState } from 'react'

let offer = null
const subs = new Set()
const tell = () => subs.forEach((f) => f())

export const standalone = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)
const ios = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)

export function startInstall() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); offer = e; tell() })
  window.addEventListener('appinstalled', () => { offer = null; tell() })
  // The single-file demo build has no service worker file next to it.
  if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.MODE !== 'single' && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
  }
}

// The installed app should carry the clinic's own name and open into that clinic.
export function useClinicManifest(tenant) {
  useEffect(() => {
    if (!tenant) return
    try { localStorage.setItem('last-clinic', tenant.slug) } catch {}
    const link = document.getElementById('app-manifest')
    if (!link || !import.meta.env.PROD) return
    const before = link.getAttribute('href')
    link.setAttribute('href', `/api/manifest.php?t=${encodeURIComponent(tenant.slug)}&n=${encodeURIComponent(tenant.name || '')}`)
    return () => link.setAttribute('href', before)
  }, [tenant?.slug, tenant?.name])
}

export function lastClinic() {
  try { return localStorage.getItem('last-clinic') } catch { return null }
}

export function useInstall() {
  const [, bump] = useState(0)
  useEffect(() => {
    const f = () => bump((n) => n + 1)
    subs.add(f)
    return () => subs.delete(f)
  }, [])
  const installed = standalone()
  return {
    installed,
    canInstall: !installed && !!offer,
    iosHint: !installed && !offer && ios(),
    async install() {
      if (!offer) return false
      offer.prompt()
      const r = await offer.userChoice.catch(() => ({}))
      offer = null
      tell()
      return r?.outcome === 'accepted'
    },
  }
}
