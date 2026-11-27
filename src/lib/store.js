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
const COLLS = ['notes', 'staff', 'patients', 'appointments', 'prescriptions', 'reports', 'bills', 'medicines', 'sales', 'beds', 'admissions', 'emergencies', 'payroll', 'users', 'videos', 'shares', 'visits', 'images', 'estimates', 'consents', 'expenses', 'labwork', 'ipdnotes', 'deposits', 'ot', 'claims', 'materials', 'medorders']
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
    // A demo clinic whose sample set changed (its v went up) is reseeded too.
    return !old || (t.live && !old.live) || (t.v || 0) !== (old.v || 0)
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

const PREFIX = { medorders: 'MO', labwork: 'LW', ipdnotes: 'IN', deposits: 'DEP', ot: 'OT', claims: 'CL', materials: 'MAT', estimates: 'EST', consents: 'CN', expenses: 'EXP', notes: 'NT', visits: 'VS', images: 'IMG',  patients: 'P', appointments: 'A', prescriptions: 'RX', reports: 'LAB', bills: 'INV', medicines: 'M', sales: 'SL', beds: 'BED', admissions: 'IPD', emergencies: 'ER', payroll: 'PAY', staff: 'S', users: 'U', videos: 'V', shares: 'SH' }

// Names typed in small letters show as proper names: "himanshu namdeo" -> "Himanshu Namdeo".
// Only the first letter of each word changes, so "McDonald" or "D'Souza" stay as typed.
export const properName = (n) => typeof n === 'string' ? n.trim().replace(/\s+/g, ' ').replace(/(^|[\s.'-])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase()) : n
const NAMED = ['patients', 'staff']
const tidy = (coll, rec) => (NAMED.includes(coll) && rec && typeof rec.name === 'string' ? { ...rec, name: properName(rec.name) } : rec)
const shown = new WeakMap()
const tidyList = (coll, rows) => {
  if (!NAMED.includes(coll)) return rows
  // A patient merged into another (a duplicate registration) is hidden everywhere.
  if (!shown.has(rows)) shown.set(rows, rows.filter((r) => !r.mergedInto).map((r) => tidy(coll, r)))
  return shown.get(rows)
}

export const db = {
  tenants: () => state.tenants,
  tenantBySlug: (slug) => state.tenants.find((t) => t.slug === slug || t.aliases?.includes(slug)),
  list: (tid, coll) => tidyList(coll, state.data[tid]?.[coll] || []),
  onServer: (tid) => !!tenantById(tid)?.server,
  // A record made offline keeps answering to its temporary number after it syncs.
  get: (tid, coll, id) => db.list(tid, coll).find((r) => r.id === id) || (sync.alias[tid]?.[id] ? db.list(tid, coll).find((r) => r.id === sync.alias[tid][id]) : undefined),
  add(tid, coll, rec) {
    rec = tidy(coll, rec)
    if (db.onServer(tid)) {
      // With no internet the record gets a temporary number and waits on this computer.
      const cid = `${PREFIX[coll]}-X${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      const res = write(tid, 'add', { coll, data: rec, cid })
      const row = res ? res.row : { id: cid, ...rec }
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
      const p = tidy(coll, typeof patch === 'function' ? patch(cur || {}) : patch)
      const res = write(tid, 'update', { coll, id, patch: p })
      applyRow(tid, coll, res ? res.row : { ...cur, ...p, id })
      emit()
      return
    }
    state.data[tid] = {
      ...state.data[tid],
      [coll]: (state.data[tid][coll] || []).map((r) => (r.id === id ? { ...r, ...tidy(coll, typeof patch === 'function' ? patch(r) : patch) } : r)),
    }
    emit()
  },
  updateTenant(tid, patch) {
    if (db.onServer(tid)) write(tid, 'tenant', { patch })
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
      cacheDrop(tid)
      if (remote[tid]) { remote[tid].loaded = false; remote[tid].rev = 0 }
      if (sync.q[tid]?.length) toast(`${sync.q[tid].length} changes are still waiting for the internet. They will go to the server after the next sign-in.`)
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
  cacheDrop(tid)
  if (remote[tid]) remote[tid].rev = 0
  if (msg) toast(msg)
  emit()
  status(tid)
}

// Writes wait for the server (a fraction of a second) so the screens can keep
// using the new record straight away, exactly as before.
function call(tid, action, body, quiet = false) {
  const x = new XMLHttpRequest()
  try {
    x.open('POST', apiUrl(tid, action), false)
    x.setRequestHeader('Content-Type', 'application/json')
    if (tokens[tid]) x.setRequestHeader('Authorization', `Bearer ${tokens[tid]}`)
    x.send(JSON.stringify(body))
    // A proxy or captive page with no real connection behind it counts as offline too.
    if (x.status === 0 || x.status === 502 || x.status === 503 || x.status === 504) throw new Error('offline')
  } catch {
    if (!quiet) toast('Not saved: no internet connection. Please try again.')
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
    // Changes made offline go up first; the server copy is only read once they are all in.
    if (sync.q[tid]?.length) { await flush(tid); if (sync.q[tid]?.length) return }
    const res = await post(tid, 'pull', { since: r.rev || 0 })
    setOffline(tid, false)
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
    cacheSoon(tid)
  } catch (e) {
    if (e instanceof TypeError) setOffline(tid, true)
    if (tokens[tid]) { r.error = e instanceof TypeError ? 'no internet connection' : e.message; emit() }
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

// ---------------------------------------------------------------------------
// Working offline. When the internet drops, every save still happens on this
// computer and waits in an outbox (kept across reloads). When the connection is
// back the outbox goes to the server in order, then the screens refresh. Records
// made offline carry a temporary number (P-X...) that the server swaps for the
// next real one; sending the same record twice never makes two.

const OUTBOX_KEY = 'debuggers-care-hms:outbox'
const sync = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(OUTBOX_KEY)) || {}
    return { q: s.q || {}, failed: s.failed || {}, alias: s.alias || {}, offline: {}, busy: {}, done: {} }
  } catch {
    return { q: {}, failed: {}, alias: {}, offline: {}, busy: {}, done: {} }
  }
})()
function saveOutbox() {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify({ q: sync.q, failed: sync.failed, alias: sync.alias })) } catch {}
}
function setOffline(tid, v) {
  if (!!sync.offline[tid] === v) return
  sync.offline[tid] = v
  emit()
}
const isOffline = (tid) => sync.offline[tid] || (typeof navigator !== 'undefined' && navigator.onLine === false)

// Save to the server now when we can; otherwise keep it in the outbox. Returns the
// server's answer, or null when the change is waiting.
function write(tid, action, body) {
  if (!sync.q[tid]?.length && !isOffline(tid)) {
    try {
      return call(tid, action, body, true)
    } catch (e) {
      if (e.message !== 'offline') throw e
      sync.offline[tid] = true
    }
  }
  const first = !sync.q[tid]?.length
  ;(sync.q[tid] ||= []).push({ action, body, at: new Date().toISOString() })
  saveOutbox()
  cacheSoon(tid)
  if (first) toast('No internet. Saved on this computer; it goes to the clinic server when the internet is back.')
  return null
}

// Swap temporary numbers for the real ones the server gave.
function realIds(tid, v) {
  const a = sync.alias[tid]
  if (!a || !Object.keys(a).length) return v
  let t = JSON.stringify(v)
  for (const [tmp, id] of Object.entries(a)) t = t.split(`"${tmp}"`).join(`"${id}"`)
  return JSON.parse(t)
}

async function flush(tid) {
  if (sync.busy[tid] || !tokens[tid]) return
  sync.busy[tid] = true
  emit()
  let sent = 0
  try {
    while (sync.q[tid]?.length && tokens[tid]) {
      const item = sync.q[tid][0]
      const body = realIds(tid, item.body)
      let res
      try {
        res = await post(tid, item.action, body)
      } catch (e) {
        if (e instanceof TypeError) { sync.offline[tid] = true; break }
        if (!tokens[tid]) break // signed out: keep the change for the next sign-in
        // The server turned this one down (for example, the record was deleted meanwhile).
        sync.q[tid].shift()
        ;(sync.failed[tid] ||= []).push({ ...item, error: e.message })
        saveOutbox()
        toast(`One change could not be saved: ${e.message}`)
        continue
      }
      sync.offline[tid] = false
      sync.q[tid].shift()
      sent++
      if (item.action === 'add' && res.row) {
        const { coll, cid } = item.body
        const d = state.data[tid]
        if (cid && d?.[coll]) d[coll] = d[coll].filter((r) => r.id !== cid)
        if (cid && cid !== res.row.id) (sync.alias[tid] ||= {})[cid] = res.row.id
        applyRow(tid, coll, res.row)
      } else if (item.action === 'update' && res.row) applyRow(tid, item.body.coll, res.row)
      saveOutbox()
      emit()
    }
  } finally {
    sync.busy[tid] = false
    if (!sync.q[tid]?.length) {
      delete sync.q[tid]
      saveOutbox()
      if (sent) {
        sync.done[tid] = Date.now()
        toast(`Back online: ${sent} saved ${sent === 1 ? 'change' : 'changes'} sent to the clinic server.`)
        setTimeout(() => { delete sync.done[tid]; emit() }, 4000)
      }
    }
    emit()
  }
}

export const offline = {
  // What the sync badge shows for a clinic.
  info(tid) {
    return {
      server: db.onServer(tid),
      offline: isOffline(tid),
      pending: sync.q[tid]?.length || 0,
      failed: sync.failed[tid] || [],
      busy: !!sync.busy[tid],
      done: !!sync.done[tid],
    }
  },
  retry(tid) {
    const f = sync.failed[tid] || []
    sync.q[tid] = [...(sync.q[tid] || []), ...f.map(({ error, ...i }) => i)]
    delete sync.failed[tid]
    saveOutbox()
    emit()
    if (remote[tid]) pull(tid)
  },
  discard(tid) {
    delete sync.failed[tid]
    saveOutbox()
    emit()
  },
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => emit())
  window.addEventListener('offline', () => emit())
}

// A copy of a live clinic's records on this computer (IndexedDB), so the app opens
// and works with no internet. It is removed when the user signs out.
function idb() {
  return new Promise((ok, no) => {
    if (typeof indexedDB === 'undefined') return no(new Error('no indexedDB'))
    const r = indexedDB.open('clinic-cache', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('c')
    r.onsuccess = () => ok(r.result)
    r.onerror = () => no(r.error)
  })
}
async function idbDo(mode, fn) {
  const d = await idb()
  return new Promise((ok, no) => {
    const tx = d.transaction('c', mode)
    const req = fn(tx.objectStore('c'))
    tx.oncomplete = () => { ok(req?.result); d.close() }
    tx.onerror = () => { no(tx.error); d.close() }
  })
}
const cacheTimers = {}
function cacheSoon(tid) {
  clearTimeout(cacheTimers[tid])
  cacheTimers[tid] = setTimeout(() => {
    const r = remote[tid]
    if (!tokens[tid] || !r?.loaded) return
    const t = tenantById(tid)
    const rec = { data: state.data[tid], rev: r.rev, tenantRev: r.tenantRev, tenant: t, user: session[tid] }
    idbDo('readwrite', (s) => s.put(rec, tid)).catch(() => {})
  }, 800)
}
async function cacheLoad(tid) {
  try {
    const c = await idbDo('readonly', (s) => s.get(tid))
    return c && c.user === session[tid] ? c : null
  } catch {
    return null
  }
}
function cacheDrop(tid) {
  clearTimeout(cacheTimers[tid])
  idbDo('readwrite', (s) => s.delete(tid)).catch(() => {})
}

export const server = {
  // Called when a server clinic opens: check it, then keep this device in step.
  start(tid) {
    const r = (remote[tid] ||= { rev: 0 })
    if (r.started) return
    r.started = true
    if (tokens[tid]) {
      state.data[tid] = EMPTY()
      // Open straight away from the copy kept on this computer (works with no internet),
      // then fetch only what changed since.
      cacheLoad(tid).then((c) => {
        if (c && tokens[tid] && !r.loaded) {
          state.data[tid] = { ...EMPTY(), ...c.data }
          r.rev = c.rev
          r.tenantRev = c.tenantRev
          if (c.tenant) state.tenants = state.tenants.map((t) => (t.id === tid ? { ...t, ...c.tenant, id: t.id, slug: t.slug, aliases: t.aliases, server: true, live: true } : t))
          r.ready = true
          r.loaded = true
          emit()
        }
      }).finally(() => pull(tid))
    } else status(tid)
    r.timer = setInterval(() => tokens[tid] && pull(tid), POLL_MS)
    window.addEventListener('focus', () => tokens[tid] && pull(tid))
    window.addEventListener('online', () => { setOffline(tid, false); tokens[tid] && pull(tid) })
    window.addEventListener('offline', () => setOffline(tid, true))
  },
  info: (tid) => remote[tid] || {},
  // The sign-in screen asks again for the staff list when it has none (after sign-out or an expired session).
  refreshStaff(tid) {
    const r = (remote[tid] ||= { rev: 0 })
    if (r.asking) return
    r.asking = true
    status(tid).finally(() => { r.asking = false })
  },
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
    return server.patientStart(tid, await post(tid, 'plogin', { phone, pin }))
  },
  // Or with their mobile number and the email on their file: the server emails a 6-digit code.
  async patientCode(tid, phone, email) {
    return (await post(tid, 'pcode', { phone, email })).sentTo
  },
  // Returns { choose: [{id, name}] } when the mobile and email belong to more than one family member.
  async patientVerify(tid, phone, email, code, patientId = '') {
    const res = await post(tid, 'pverify', { phone, email, code, patientId })
    if (res.choose) return res
    await server.patientStart(tid, res)
    return {}
  },
  async patientStart(tid, res) {
    const r = (remote[tid] ||= { rev: 0 })
    tokens = { ...tokens, [tid]: res.token }
    session = { ...session, [tid]: res.user.id }
    r.rev = 0
    state.data[tid] = EMPTY()
    applyRow(tid, 'users', res.user)
    await pull(tid)
    clearInterval(r.timer)
    r.timer = setInterval(() => tokens[tid] && pull(tid), POLL_MS)
  },
  // Many patients at once (import). Goes in batches so a big list never freezes the screen.
  async addMany(tid, coll, recs, onProgress) {
    const out = []
    for (let i = 0; i < recs.length; i += 200) {
      const res = await post(tid, 'addmany', { coll, rows: recs.slice(i, i + 200).map((r) => tidy(coll, r)) })
      res.rows.forEach((row) => { applyRow(tid, coll, row); out.push(row) })
      emit()
      onProgress?.(out.length)
    }
    return out
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
  // Automatic WhatsApp messages: read settings (token never comes back) or save a change.
  async whatsapp(tid, patch) {
    return post(tid, 'wa', patch ? { patch } : {})
  },
  async whatsappSend(tid, ids) {
    return post(tid, 'wasend', { ids })
  },
  async whatsappTest(tid, phone) {
    return post(tid, 'watest', { phone })
  },
}
