// Tenant-scoped data store for the browser demo.
// Every call takes a tenantId, mirroring the phase 2 API (`/api/:tenant/:collection`)
// where PostgreSQL rows carry a tenant_id column. Swapping this file for fetch()
// calls is the only change the screens need.
import { useSyncExternalStore } from 'react'
import { buildSeed } from './seed'

const KEY = 'debuggers-care-hms:v3'
const SESSION_KEY = 'debuggers-care-hms:session'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

// Returning visitors keep their saved demo data; clinics added since their last
// visit are seeded fresh and merged in.
function withNewTenants(saved) {
  const fresh = buildSeed()
  // A clinic that has just switched from sample data to a clean live space is reseeded once.
  const missing = fresh.tenants.filter((t) => {
    const old = saved.tenants.find((s) => s.id === t.id)
    return !old || (t.live && !old.live)
  })
  if (!missing.length) return saved
  const pick = (obj) => Object.fromEntries(missing.map((t) => [t.id, obj[t.id]]))
  const ids = new Set(missing.map((t) => t.id))
  return { ...saved, tenants: [...saved.tenants.filter((t) => !ids.has(t.id)), ...missing], data: { ...saved.data, ...pick(fresh.data) }, counters: { ...saved.counters, ...pick(fresh.counters) } }
}

const saved = load()
let state = saved ? withNewTenants(saved) : buildSeed()
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

const PREFIX = { patients: 'P', appointments: 'A', prescriptions: 'RX', reports: 'LAB', bills: 'INV', medicines: 'M', sales: 'SL', beds: 'BED', admissions: 'IPD', emergencies: 'ER', payroll: 'PAY', staff: 'S', users: 'U', videos: 'V', shares: 'SH' }

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
  // Whole-clinic backup as one JSON file, and restore from it.
  exportTenant(tid) {
    return { kind: 'debuggers-care-backup', version: 1, exportedAt: new Date().toISOString(), tenant: state.tenants.find((t) => t.id === tid), data: state.data[tid], counters: state.counters[tid] }
  },
  importTenant(tid, backup) {
    if (backup?.kind !== 'debuggers-care-backup' || backup.tenant?.id !== tid || !backup.data) throw new Error('This file is not a backup of this clinic.')
    state.tenants = state.tenants.map((t) => (t.id === tid ? { ...t, ...backup.tenant } : t))
    state.data[tid] = backup.data
    state.counters[tid] = backup.counters || {}
    emit()
  },
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
