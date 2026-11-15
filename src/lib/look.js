import { useEffect, useState } from 'react'

// Screen look, saved on this device only (each doctor can pick their own).
// ds    = Debuggers Space: light pages with the dark AI menu and AI panel (the default)
// day   = everything light
// night = everything dark
export const LOOKS = [
  { id: 'ds', name: 'Debuggers Space', hint: 'Light pages, dark AI menu and panel' },
  { id: 'day', name: 'Day', hint: 'Everything light' },
  { id: 'night', name: 'Night', hint: 'Everything dark, easy on the eyes' },
]
const KEY = 'hms-look'

export function getLook() {
  try { const v = localStorage.getItem(KEY); return LOOKS.some((l) => l.id === v) ? v : 'ds' } catch { return 'ds' }
}

export function applyLook(look = getLook()) {
  const r = document.documentElement
  r.dataset.look = look
  r.dataset.theme = look === 'night' ? 'dark' : 'light'
}

export function setLook(look) {
  try { localStorage.setItem(KEY, look) } catch { /* private window: still applies for now */ }
  applyLook(look)
  window.dispatchEvent(new Event('hms-look'))
}

export function useLook() {
  const [look, set] = useState(getLook)
  useEffect(() => {
    const on = () => set(document.documentElement.dataset.look || getLook())
    window.addEventListener('hms-look', on)
    return () => window.removeEventListener('hms-look', on)
  }, [])
  return [look, setLook]
}
