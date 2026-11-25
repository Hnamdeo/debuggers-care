import { useEffect, useState } from 'react'

// Screen look, saved on this device only (each doctor can pick their own).
// ds    = Debuggers Space: light pages with the dark AI menu and AI panel
// day   = everything light
// night = everything dark
// pro   = Enterprise (the default): flat, quiet business look with a top bar (search, + New, AI button)
export const LOOKS = [
  { id: 'pro', name: 'Enterprise', hint: 'Flat business look, top search bar' },
  { id: 'ds', name: 'Debuggers Space', hint: 'Light pages, dark AI menu and panel' },
  { id: 'day', name: 'Day', hint: 'Everything light' },
  { id: 'night', name: 'Night', hint: 'Everything dark, easy on the eyes' },
]
const KEY = 'hms-look'

// Enterprise became the default on 25 Nov 2026. A device that had a saved look from before
// is moved to it once; after that, whatever the person picks is kept.
const MOVED = 'hms-look-pro-default'
export function getLook() {
  try {
    if (!localStorage.getItem(MOVED)) { localStorage.setItem(MOVED, '1'); localStorage.setItem(KEY, 'pro') }
    const v = localStorage.getItem(KEY)
    return LOOKS.some((l) => l.id === v) ? v : 'pro'
  } catch { return 'pro' }
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
