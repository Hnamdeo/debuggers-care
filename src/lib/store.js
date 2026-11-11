// Tenant-scoped data store for the browser demo.
// Every call takes a tenantId, mirroring the phase 2 API (`/api/:tenant/:collection`)
// where PostgreSQL rows carry a tenant_id column. Swapping this file for fetch()
// calls is the only change the screens need.
import { useSyncExternalStore } from 'react'
import { buildSeed } from './seed'

const KEY = 'debuggers-care-hms:v2'
const SESSION_KEY = 'debuggers-care-hms:session'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

let state = load() || buildSeed()
let session = (() => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || {}
  } catch {
    return {}
  }
})()
const listeners = new Set()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {}
}
function emit() {
  state = { ...state }
  persist()
  listeners.forEach((l) => l())
}
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useDb() {
  return useSyncExternalStore(subscribe, () => state)
}
export function useSession() {
  useSyncExternalStore(subscribe, () => state)
  return session
}

const PREFIX = { patients: 'P', appointments: 'A', prescriptions: 'RX', reports: 'LAB', bills: 'INV', medicines: 'M', sales: 'SL', beds: 'BED', admissions: 'IPD', emergencies: 'ER', payroll: 'PAY', staff: 'S', users: 'U' }

export const db = {
  tenants: () => state.tenants,
  tenantBySlug: (slug) => state.tenants.find((t) => t.slug === slug),
  list: (tid, coll) => state.data[tid]?.[coll] || [],
  get: (tid, coll, id) => (state.data[tid]?.[coll] || []).find((r) => r.id === id),
  add(tid, coll, rec) {
    const c = (state.counters[tid] ||= {})
    const p = PREFIX[coll]
    c[p] = (c[p] || 1000) + 1
    const row = { id: `${p}-${c[p]}`, ...rec }
    state.data[tid] = { ...state.data[tid], [coll]: [...state.data[tid][coll], row] }
    emit()
    return row
  },
  update(tid, coll, id, patch) {
    state.data[tid] = {
      ...state.data[tid],
      [coll]: state.data[tid][coll].map((r) => (r.id === id ? { ...r, ...(typeof patch === 'function' ? patch(r) : patch) } : r)),
    }
    emit()
  },
  updateTenant(tid, patch) {
    state.tenants = state.tenants.map((t) => (t.id === tid ? { ...t, ...patch } : t))
    emit()
  },
  platformExtra: () => state.platformExtra || [],
  reset() {
    state = buildSeed()
    session = {}
    emit()
  },
}

export const auth = {
  login(tid, userId) {
    session = { ...session, [tid]: userId }
    emit()
  },
  logout(tid) {
    const { [tid]: _, ...rest } = session
    session = rest
    emit()
  },
  current(tid) {
    const uid = session[tid]
    return uid ? db.get(tid, 'users', uid) : null
  },
}
