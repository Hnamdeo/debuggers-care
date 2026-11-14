// Tenant-scoped data store for the browser demo.
// Every call takes a tenantId, mirroring the phase 2 API (`/api/:tenant/:collection`)
// where PostgreSQL rows carry a tenant_id column. Swapping this file for fetch()
// calls is the only change the screens need.
import { useSyncExternalStore } from 'react'
import { buildSeed } from './seed'
import { toast } from '../components/ui'

const KEY = 'debuggers-care-hms:v3'
const SESSION_KEY = 'debuggers-care-hms:session'
const TOKENS_KEY = 'debuggers-care-hms:tokens'
const COLLS = ['staff', 'patients', 'appointments', 'prescriptions', 'reports', 'bills', 'medicines', 'sales', 'beds', 'admissions', 'emergencies', 'payroll', 'users', 'videos', 'shares', 'visits', 'images']
const EMPTY = () => Object.fromEntries(COLLS.map((c) => [c, []]))

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
  // Demo clinics that were renamed keep their records but take the new name and address.
  const NAME_FIELDS = ['slug', 'aliases', 'name', 'short']
  const renamed = saved.tenants.map((old) => {
    const t = fresh.tenants.find((f) => f.id === old.id)
    if (!t || t.live || NAME_FIELDS.every((k) => JSON.stringify(old[k]) === JSON.stringify(t[k]))) return old
    return { ...old, ...Object.fromEntries(NAME_FIELDS.map((k) => [k, t[k]])) }
  })
  // Whether a clinic runs on the server always follows the current code.
  const flagged = renamed.map((t) => {
    const f = fresh.tenants.find((x) => x.id === t.id)
    return f && !!f.server !== !!t.server ? { ...t, server: !!f.server } : t
  })
  if (flagged.some((t, i) => t !== saved.tenants[i])) saved = { ...saved, tenants: flagged }
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
// Server sign-in per clinic: { [tenantId]: token }
let tokens = (() => {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY)) || {}
  } catch {
    return {}
  }
})()
// Live state of each server clinic: { ready, loaded, staff, rev, error }
const remote = {}

function persist() {
  try {
    // A clinic that lives on the server keeps no records in the browser: only its
    // starting data until its first sign-in uploads it.
    const onServer = state.tenants.filter((t) => t.server && remote[t.id]?.ready)
    const keep = onServer.length ? { ...state, data: { ...state.data }, counters: { ...state.counters } } : state
    onServer.forEach((t) => { keep.data[t.id] = EMPTY(); keep.counters[t.id] = {} })
    localStorage.setItem(KEY, JSON.stringify(keep))
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
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

const PREFIX = { visits: 'VS', images: 'IMG',  patients: 'P', appointments: 'A', prescriptions: 'RX', reports: 'LAB', bills: 'INV', medicines: 'M', sales: 'SL', beds: 'BED', admissions: 'IPD', emergencies: 'ER', payroll: 'PAY', staff: 'S', users: 'U', videos: 'V', shares: 'SH' }

export const db = {
  tenants: () => state.tenants,
  tenantBySlug: (slug) => state.tenants.find((t) => t.slug === slug || t.aliases?.includes(slug)),
  list: (tid, coll) => state.data[tid]?.[coll] || [],
  onServer: (tid) => !!tenantById(tid)?.server,
  get: (tid, coll, id) => (state.data[tid]?.[coll] || []).find((r) => r.id === id),
  add(tid, coll, rec) {
    if (db.onServer(tid)) {
      const { row } = call(tid, 'add', { coll, data: rec })
      applyRow(tid, coll, row)
      emit()
      return row
    }
    const c = (state.counters[tid] ||= {})
    const p = PREFIX[coll]
    c[p] = (c[p] || 1000) + 1
    const row = { id: `${p}-${c[p]}`, ...rec }
    state.data[tid] = { ...state.data[tid], [coll]: [...(state.data[tid][coll] || []), row] }
    emit()
    return row
  },
  update(tid, coll, id, patch) {
    if (db.onServer(tid)) {
      const cur = db.get(tid, coll, id)
      const p = typeof patch === 'function' ? patch(cur || {}) : patch
      const { row } = call(tid, 'update', { coll, id, patch: p })
      applyRow(tid, coll, row)
      emit()
      return
    }
    state.data[tid] = {
      ...state.data[tid],
      [coll]: (state.data[tid][coll] || []).map((r) => (r.id === id ? { ...r, ...(typeof patch === 'function' ? patch(r) : patch) } : r)),
    }
    emit()
  },
  updateTenant(tid, patch) {
    if (db.onServer(tid)) call(tid, 'tenant', { patch })
    state.tenants = state.tenants.map((t) => (t.id === tid ? { ...t, ...patch } : t))
    emit()
  },
  platformExtra: () => state.platformExtra || [],
  // Whole-clinic backup as one JSON file, and restore from it.
  exportTenant(tid) {
    return { kind: 'debuggers-care-backup', version: 1, exportedAt: new Date().toISOString(), tenant: state.tenants.find((t) => t.id === tid), data: state.data[tid], counters: state.counters[tid] }
  },
  importTenant(tid, backup) {
    if (db.onServer(tid)) {
      if (backup?.kind !== 'debuggers-care-backup' || !backup.data) throw new Error('This file is not a backup of this clinic.')
      call(tid, 'import', { backup })
      remote[tid].rev = 0
      state.data[tid] = EMPTY()
      pull(tid)
      return
    }
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
  token: (tid) => tokens[tid],
  login(tid, userId) {
    session = { ...session, [tid]: userId }
    emit()
  },
  logout(tid) {
    if (tokens[tid]) {
      const tok = tokens[tid]
      fetch(apiUrl(tid, 'logout'), { method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: '{}' }).catch(() => {})
      const { [tid]: __, ...others } = tokens
      tokens = others
    }
    const { [tid]: _, ...rest } = session
    session = rest
    emit()
  },
  current(tid) {
    // A live clinic needs a server sign-in; an old session left in this browser is not enough.
    if (db.onServer(tid) && !tokens[tid]) return null
    const uid = session[tid]
    return uid ? db.get(tid, 'users', uid) : null
  },
}

// Browsers that opened a clinic before the front desk login existed get one added before the clinic goes live.
function withFrontDesk(tid, data) {
  if (!data || data.users?.some((u) => u.role === 'receptionist')) return data
  const domain = (data.users?.find((u) => u.id === 'U-admin')?.email || '@clinic.in').split('@')[1]
  const staff = { id: 'S-FD', name: 'Front desk', gender: 'F', role: 'receptionist', dept: 'Reception', title: 'Receptionist', phone: '', email: `frontdesk@${domain}`, salary: 0, joinDate: new Date().toISOString().slice(0, 10) }
  return { ...data, staff: [...(data.staff || []), staff], users: [...(data.users || []), { id: 'U-front', role: 'receptionist', refId: staff.id, email: staff.email, password: 'demo123' }] }
}

// ---------------------------------------------------------------------------
// Live clinics on the server (api/index.php). Reads come from a full copy that
// every device pulls and then keeps up to date every few seconds; writes go to
// the server first, so two devices never give out the same patient number.

const POLL_MS = 4000
const tenantById = (tid) => state.tenants.find((t) => t.id === tid)
const apiUrl = (tid, action) => `${import.meta.env.BASE_URL}api/index.php?t=${encodeURIComponent(tenantById(tid).slug)}&a=${action}`

function applyRow(tid, coll, row) {
  const d = (state.data[tid] ||= EMPTY())
  const arr = d[coll] || []
  const i = arr.findIndex((r) => r.id === row.id)
  d[coll] = i === -1 ? [...arr, row] : arr.map((r, j) => (j === i ? row : r))
  state.data[tid] = { ...d }
}

function signedOut(tid, msg) {
  const { [tid]: _, ...rest } = tokens
  tokens = rest
  const { [tid]: __, ...s } = session
  session = s
  if (remote[tid]) { remote[tid].loaded = false; clearInterval(remote[tid].timer) }
  state.data[tid] = EMPTY()
  if (msg) toast(msg)
  emit()
  status(tid)
}

// Writes wait for the server (a fraction of a second) so the screens can keep
// using the new record straight away, exactly as before.
function call(tid, action, body) {
  const x = new XMLHttpRequest()
  try {
    x.open('POST', apiUrl(tid, action), false)
    x.setRequestHeader('Content-Type', 'application/json')
    if (tokens[tid]) x.setRequestHeader('Authorization', `Bearer ${tokens[tid]}`)
    x.send(JSON.stringify(body))
  } catch {
    toast('Not saved: no internet connection. Please try again.')
    throw new Error('offline')
  }
  let res = {}
  try { res = JSON.parse(x.responseText) } catch {}
  if (x.status === 401) { signedOut(tid, res.error); throw new Error(res.error) }
  if (x.status >= 400 || res.error) {
    toast(`Not saved: ${res.error || 'the server had a problem'}`)
    throw new Error(res.error || 'server error')
  }
  return res
}

async function post(tid, action, body = {}) {
  const r = await fetch(apiUrl(tid, action), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(tokens[tid] ? { Authorization: `Bearer ${tokens[tid]}` } : {}) },
    body: JSON.stringify(body),
  })
  let res = {}
  try { res = await r.json() } catch {}
  if (r.status === 401 && action !== 'login') { signedOut(tid, res.error); throw new Error(res.error || 'Please sign in.') }
  if (!r.ok || res.error) throw new Error(res.error || 'The server had a problem. Please try again.')
  return res
}

async function pull(tid) {
  const r = remote[tid]
  if (!tokens[tid] || r.busy) return
  r.busy = true
  try {
    const res = await post(tid, 'pull', { since: r.rev || 0 })
    if (res.reset || !r.rev) state.data[tid] = EMPTY()
    res.changes.forEach(({ coll, row }) => applyRow(tid, coll, row))
    if (res.tenant && (res.tenantRev !== r.tenantRev || !r.loaded)) {
      r.tenantRev = res.tenantRev
      state.tenants = state.tenants.map((t) => (t.id === tid ? { ...t, ...res.tenant, id: t.id, slug: t.slug, aliases: t.aliases, server: true, live: true } : t))
    }
    r.rev = res.rev
    r.ready = true
    r.loaded = true
    r.error = ''
    emit()
  } catch (e) {
    if (tokens[tid]) { r.error = e.message; emit() }
  } finally {
    r.busy = false
  }
}

async function status(tid) {
  const r = remote[tid]
  try {
    const res = await post(tid, 'status')
    r.ready = res.ready
    r.staff = res.staff
    r.checked = true
    r.error = ''
  } catch (e) {
    r.checked = true
    r.error = e.message
  }
  emit()
}

export const server = {
  // Called when a server clinic opens: check it, then keep this device in step.
  start(tid) {
    const r = (remote[tid] ||= { rev: 0 })
    if (r.started) return
    r.started = true
    if (tokens[tid]) {
      state.data[tid] = EMPTY()
      pull(tid)
    } else status(tid)
    r.timer = setInterval(() => tokens[tid] && pull(tid), POLL_MS)
    window.addEventListener('focus', () => tokens[tid] && pull(tid))
  },
  info: (tid) => remote[tid] || {},
  async login(tid, userId, password) {
    const r = (remote[tid] ||= { rev: 0 })
    const body = { userId, password }
    // The first sign-in sets the clinic up on the server with what this computer has.
    if (!r.ready) body.seed = { tenant: tenantById(tid), data: withFrontDesk(tid, state.data[tid]), counters: state.counters[tid] }
    const res = await post(tid, 'login', body)
    tokens = { ...tokens, [tid]: res.token }
    session = { ...session, [tid]: res.user.id }
    r.rev = 0
    state.data[tid] = EMPTY()
    applyRow(tid, 'users', res.user)
    await pull(tid)
    clearInterval(r.timer)
    r.timer = setInterval(() => tokens[tid] && pull(tid), POLL_MS)
  },
  // A patient signs in with their mobile number and the PIN the clinic gave them.
  async patientLogin(tid, phone, pin) {
    const r = (remote[tid] ||= { rev: 0 })
    const res = await post(tid, 'plogin', { phone, pin })
    tokens = { ...tokens, [tid]: res.token }
    session = { ...session, [tid]: res.user.id }
    r.rev = 0
    state.data[tid] = EMPTY()
    applyRow(tid, 'users', res.user)
    await pull(tid)
    clearInterval(r.timer)
    r.timer = setInterval(() => tokens[tid] && pull(tid), POLL_MS)
  },
  async setPin(tid, patientId) {
    return (await post(tid, 'setpin', { patientId })).pin
  },
  async exportTenant(tid) {
    return post(tid, 'export')
  },
  async register(tid, patient) {
    return post(tid, 'register', { patient })
  },
  async upload(tid, dataUrl) {
    return (await post(tid, 'upload', { data: dataUrl })).fileId
  },
  fileUrl(tid, fileId) {
    return `${apiUrl(tid, 'file')}&id=${encodeURIComponent(fileId)}&k=${encodeURIComponent(tokens[tid] || '')}`
  },
  async changePassword(tid, current, next) {
    return post(tid, 'password', { current, next })
  },
}
