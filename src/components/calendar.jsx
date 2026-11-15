// Appointments as a calendar, in the style of Google Calendar: day (one column per doctor), week and month.
// Tap an empty time to book, tap an appointment for its details and actions, drag it to move it.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, X, Clock, Stethoscope, Phone, CheckCircle2, Keyboard } from 'lucide-react'
import { useTenant, Pill, toast } from './ui'
import { db } from '../lib/store'
import { today, addDays, fmtTime, pad } from '../lib/utils'
import { hoursOn, apptMins, endTime, slotMinutes } from '../lib/slots'
import { NotifyButtons } from './reminders'

export const DOC_COLORS = ['#1a73e8', '#0b8043', '#8e24aa', '#f4511e', '#039be5', '#d81b60', '#7cb342', '#616161']
const HOUR_PX = 84
const toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5)
const hm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dObj = (d) => new Date(`${d}T00:00:00`)
const monday = (d) => addDays(d, -((dObj(d).getDay() + 6) % 7))
const hourLabel = (h) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`
const STATUS_TEXT = { scheduled: 'Booked', 'checked-in': 'Checked in', completed: 'Done', 'no-show': 'Didn’t come' }

// Side-by-side lanes for appointments that overlap (a quick consult during an RCT).
function lanes(evts) {
  const out = []
  let group = [], groupEnd = -1, ends = []
  const flush = () => { group.forEach((g) => { g.n = ends.length }); out.push(...group); group = []; ends = []; groupEnd = -1 }
  for (const ev of [...evts].sort((x, y) => x.s - y.s || y.e - x.e)) {
    if (group.length && ev.s >= groupEnd) flush()
    let lane = ends.findIndex((e) => e <= ev.s)
    if (lane < 0) { lane = ends.length; ends.push(ev.e) } else ends[lane] = ev.e
    group.push({ ...ev, lane })
    groupEnd = Math.max(groupEnd, ev.e)
  }
  if (group.length) flush()
  return out
}

export function CalendarView({ date, setDate, onBook, onMove, onRemind }) {
  const { tid, tenant, list, patient, doctors, user, me } = useTenant()
  const docs = doctors()
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('gc-mode') || (window.innerWidth < 700 ? 'day' : 'week') } catch { return 'week' } })
  const [hidden, setHidden] = useState(() => (user.role === 'doctor' && docs.length > 1 ? docs.filter((d) => d.id !== me?.id).map((d) => d.id) : []))
  const [pop, setPop] = useState(null)
  const [hover, setHover] = useState(null)
  const [, tick] = useState(0)
  const scroller = useRef(null)
  const drag = useRef(null)
  const pick = (m) => { setMode(m); try { localStorage.setItem('gc-mode', m) } catch { /* private mode */ } }
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(id) }, [])

  const color = (id) => DOC_COLORS[Math.max(0, docs.findIndex((d) => d.id === id)) % DOC_COLORS.length]
  const shown = docs.filter((d) => !hidden.includes(d.id))
  const step = slotMinutes(tenant)
  const T = today()
  const nowM = new Date().getHours() * 60 + new Date().getMinutes()
  const all = list('appointments').filter((a) => a.status !== 'cancelled' && a.time && !hidden.includes(a.doctorId))

  // Columns: in day view one per doctor, in week view one per day.
  const days = mode === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(monday(date), i)) : [date]
  const cols = mode === 'week'
    ? days.map((d) => ({ key: d, date: d, doctorId: shown.length === 1 ? shown[0].id : null }))
    : (shown.length ? shown : docs.slice(0, 1)).map((doc) => ({ key: doc.id, date, doctorId: doc.id, doc }))

  // Hours shown: from the earliest opening to the latest closing (and any booking outside them).
  let lo = 24, hi = 0
  days.forEach((d) => hoursOn(tenant, d).forEach(([o, c]) => { lo = Math.min(lo, Math.floor(o)); hi = Math.max(hi, Math.ceil(c)) }))
  all.filter((a) => days.includes(a.date)).forEach((a) => { lo = Math.min(lo, Math.floor(toMin(a.time) / 60)); hi = Math.max(hi, Math.ceil(toMin(endTime(a, tenant)) / 60)) })
  if (lo >= hi) { lo = 9; hi = 20 }
  lo = Math.max(0, lo - 1); hi = Math.min(24, hi + 1)
  const yOf = (m) => ((m - lo * 60) / 60) * HOUR_PX

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const target = days.includes(T) && nowM / 60 > lo && nowM / 60 < hi ? yOf(nowM) - 140 : yOf((hoursOn(tenant, date)[0]?.[0] ?? lo) * 60) - 16
    el.scrollTop = Math.max(0, target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, date])

  const go = (n) => setDate(mode === 'day' ? addDays(date, n) : mode === 'week' ? addDays(date, n * 7) : shiftMonth(date, n))
  // Google-style keys: T today, D/W/M view, arrows (or J/K) to move.
  useEffect(() => {
    const k = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test(e.target.tagName) || document.querySelector('.modal-scrim')) return
      const key = e.key.toLowerCase()
      if (key === 't') setDate(today())
      else if (key === 'd') pick('day')
      else if (key === 'w') pick('week')
      else if (key === 'm') pick('month')
      else if (key === 'arrowleft' || key === 'k') go(-1)
      else if (key === 'arrowright' || key === 'j') go(1)
      else if (key === 'escape') setPop(null)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  const title = mode === 'day'
    ? `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dObj(date).getDay()]}, ${dObj(date).getDate()} ${MONTHS[dObj(date).getMonth()]} ${dObj(date).getFullYear()}`
    : mode === 'week' ? weekTitle(days[0], days[6]) : `${MONTHS[dObj(date).getMonth()]} ${dObj(date).getFullYear()}`

  const minutesAt = (e, col) => {
    const r = e.currentTarget.getBoundingClientRect()
    const m = lo * 60 + ((e.clientY - r.top - (drag.current?.offset || 0)) / HOUR_PX) * 60
    return Math.max(lo * 60, Math.min(hi * 60 - step, Math.floor(m / step) * step))
  }
  const isOpen = (d, m) => hoursOn(tenant, d).some(([o, c]) => m >= o * 60 && m < c * 60)
  const clickCol = (e, col) => {
    if (e.target !== e.currentTarget && !e.target.classList.contains('gc-closed') && !e.target.classList.contains('gc-ghost')) return
    const m = minutesAt(e, col)
    if (col.date < T || (col.date === T && m + step <= nowM)) return toast('That time has already passed. Pick a later time.')
    if (!isOpen(col.date, m)) toast('The clinic is usually closed at this time. Booking it as an extra slot.')
    onBook(col.date, hm(m), col.doctorId || undefined)
  }
  const drop = (e, col) => {
    e.preventDefault()
    const a = list('appointments').find((x) => x.id === drag.current?.id)
    const m = minutesAt(e, col)
    drag.current = null
    setHover(null)
    if (!a) return
    const doctorId = col.doctorId || a.doctorId
    if (a.date === col.date && a.time === hm(m) && a.doctorId === doctorId) return
    if (col.date < T || (col.date === T && m + step <= nowM)) return toast('Can’t move an appointment into the past.')
    db.update(tid, 'appointments', a.id, { date: col.date, time: hm(m), doctorId, remindedAt: null })
    toast(`${patient(a.patientId)?.name} moved to ${DOW[dObj(col.date).getDay()]} ${dObj(col.date).getDate()} ${MONTHS[dObj(col.date).getMonth()].slice(0, 3)}, ${fmtTime(hm(m))}. Send them a reminder with the new time.`)
  }

  const evOf = (a) => ({ a, s: toMin(a.time), e: toMin(a.time) + apptMins(a, tenant) })

  return (
    <div className="gc">
      <aside className="gc-side">
        <button className="gc-create" onClick={() => onBook(date >= T ? date : T)}><Plus /> Book</button>
        <MiniMonth date={date} setDate={(d) => { setDate(d); if (mode === 'month') pick('day') }} marks={new Set(all.map((a) => a.date))} />
        <div className="gc-cals">
          <div className="gc-cals-h">Doctors</div>
          {docs.map((d) => (
            <label key={d.id} className="gc-cal">
              <input type="checkbox" checked={!hidden.includes(d.id)} onChange={() => setHidden(hidden.includes(d.id) ? hidden.filter((x) => x !== d.id) : [...hidden, d.id])} style={{ '--c': color(d.id) }} />
              <span>{d.name}</span>
            </label>
          ))}
        </div>
        <div className="gc-legend">
          <span><i className="lg s-scheduled" /> Booked</span>
          <span><i className="lg s-checked-in" /> Checked in</span>
          <span><i className="lg s-completed" /> Done</span>
          <span><i className="lg s-no-show" /> Didn’t come</span>
        </div>
        <div className="gc-keys"><Keyboard size={13} /> Keys: T today · D W M view · ← → move</div>
      </aside>

      <section className="gc-main">
        <div className="gc-bar">
          <button className="gc-btn" onClick={() => setDate(today())}>Today</button>
          <span className="gc-nav">
            <button className="gc-icon" onClick={() => go(-1)} aria-label="Previous"><ChevronLeft /></button>
            <button className="gc-icon" onClick={() => go(1)} aria-label="Next"><ChevronRight /></button>
          </span>
          <div className="gc-seg" role="tablist" aria-label="Calendar view" title={title}>
            {['day', 'week', 'month'].map((m) => <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => pick(m)}>{m[0].toUpperCase() + m.slice(1)}</button>)}
          </div>
        </div>

        {mode === 'month' ? (
          <MonthGrid date={date} appts={all} color={color} onDay={(d) => { setDate(d); pick('day') }} onEvent={(a, e) => setPop({ a, x: e.clientX, y: e.clientY })} />
        ) : (
          <div className="gc-scroll" ref={scroller}>
            <div className={`gc-inner ${mode === 'week' ? 'wk' : ''}`} style={{ '--cols': cols.length }}>
              <div className="gc-head">
                <div className="gc-gut-h">{mode === 'week' ? 'GMT+5:30' : ''}</div>
                {cols.map((c) => {
                  const n = all.filter((a) => a.date === c.date && (!c.doc || a.doctorId === c.doctorId)).length
                  return mode === 'week' ? (
                    <button key={c.key} className={`gc-colh ${c.date === T ? 'today' : ''} ${!hoursOn(tenant, c.date).length ? 'closed' : ''}`} onClick={() => { setDate(c.date); pick('day') }}>
                      <span className="dow">{DOW[dObj(c.date).getDay()]}</span>
                      <span className="dnum">{dObj(c.date).getDate()}</span>
                      <span className="dsub">{hoursOn(tenant, c.date).length ? `${n} booked` : 'Closed'}</span>
                    </button>
                  ) : (
                    <div key={c.key} className="gc-colh doc">
                      <span className="gc-docdot" style={{ background: color(c.doctorId) }}>{(c.doc?.name || '?').replace(/^Dr\.?\s*/i, '')[0]}</span>
                      <span className="docname">{c.doc?.name}<small>{n ? `${n} booked` : 'No bookings'}</small></span>
                    </div>
                  )
                })}
              </div>
              <div className="gc-body" style={{ height: (hi - lo) * HOUR_PX }}>
                <div className="gc-gut">
                  {Array.from({ length: hi - lo }, (_, i) => <span key={i} style={{ top: i * HOUR_PX }}>{i ? hourLabel(lo + i) : ''}</span>)}
                </div>
                {cols.map((c) => {
                  const open = hoursOn(tenant, c.date)
                  const evs = lanes(all.filter((a) => a.date === c.date && (!c.doctorId || a.doctorId === c.doctorId)).map(evOf))
                  const gaps = []
                  let at = lo * 60
                  ;[...open].sort((x, y) => x[0] - y[0]).forEach(([o, cl]) => { if (o * 60 > at) gaps.push([at, o * 60]); at = Math.max(at, cl * 60) })
                  if (at < hi * 60) gaps.push([at, hi * 60])
                  const hv = hover?.key === c.key ? hover : null
                  return (
                    <div key={c.key} className={`gc-col ${c.date === T ? 'today' : ''}`}
                      onClick={(e) => clickCol(e, c)}
                      onMouseMove={(e) => { if (e.target === e.currentTarget || e.target.classList.contains('gc-closed') || e.target.classList.contains('gc-ghost')) { const m = minutesAt(e, c); if (hv?.m !== m || hv?.drag) setHover({ key: c.key, m }) } else if (hv && !hv.drag) setHover(null) }}
                      onMouseLeave={() => setHover(null)}
                      onDragOver={(e) => { e.preventDefault(); const m = minutesAt(e, c); if (hv?.m !== m) setHover({ key: c.key, m, drag: true }) }}
                      onDrop={(e) => drop(e, c)}>
                      {gaps.map(([s, e]) => <div key={s} className="gc-closed" style={{ top: yOf(s), height: yOf(e) - yOf(s) }} />)}
                      {hv && (
                        <div className="gc-ghost" style={{ top: yOf(hv.m), height: (hv.drag ? (drag.current?.mins || step) : step) / 60 * HOUR_PX }}>
                          {hv.drag ? `Move to ${fmtTime(hm(hv.m))}` : `+ ${fmtTime(hm(hv.m))}`}
                        </div>
                      )}
                      {evs.map(({ a, s, e, lane, n }) => {
                        const p = patient(a.patientId)
                        const h = Math.max(20, ((e - s) / 60) * HOUR_PX - 2)
                        const can = a.status === 'scheduled' && (a.date > T || (a.date === T && s + step > nowM))
                        return (
                          <div key={a.id} role="button" tabIndex={0}
                            className={`gc-ev s-${a.status} ${h < 40 ? 'short' : ''} ${pop?.a?.id === a.id ? 'sel' : ''}`}
                            style={{ top: yOf(s) + 1, height: h, left: `calc(${(lane / n) * 100}% + 2px)`, width: `calc(${100 / n}% - ${n > 1 ? 3 : 8}px)`, '--c': color(a.doctorId) }}
                            draggable={can}
                            onDragStart={(ev) => { const r = ev.currentTarget.getBoundingClientRect(); drag.current = { id: a.id, offset: ev.clientY - r.top, mins: e - s }; ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', a.id); setPop(null) }}
                            onDragEnd={() => { drag.current = null; setHover(null) }}
                            onClick={(ev) => { ev.stopPropagation(); setPop({ a, x: ev.clientX, y: ev.clientY }) }}
                            onKeyDown={(ev) => { if (ev.key === 'Enter') { const r = ev.currentTarget.getBoundingClientRect(); setPop({ a, x: r.right, y: r.top }) } }}
                            title={`${p?.name || a.patientId} · ${fmtTime(a.time)}${a.procedure ? ` · ${a.procedure}` : ''}`}>
                            <b>{a.status === 'completed' && <CheckCircle2 size={11} />} {p?.name || a.patientId}</b>
                            <span>{fmtTime(a.time)}{h >= 40 ? ` – ${fmtTime(endTime(a, tenant))}` : ''}{a.procedure && a.procedure !== 'Consultation' ? ` · ${a.procedure}` : ''}</span>
                            {h >= 56 && a.reason && a.reason !== a.procedure && <span className="why">{a.reason}</span>}
                          </div>
                        )
                      })}
                      {c.date === T && nowM >= lo * 60 && nowM < hi * 60 && <div className="gc-now" style={{ top: yOf(nowM) }} />}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </section>
      {pop && <EventCard pop={pop} color={color(pop.a.doctorId)} onClose={() => setPop(null)} onMove={onMove} onRemind={onRemind} />}
    </div>
  )
}

function shiftMonth(d, n) {
  const x = dObj(d)
  const t = new Date(x.getFullYear(), x.getMonth() + n, 1)
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-01`
}
function weekTitle(a, b) {
  const A = dObj(a), B = dObj(b)
  const m = (x) => MONTHS[x.getMonth()].slice(0, 3)
  if (A.getMonth() === B.getMonth()) return `${A.getDate()} – ${B.getDate()} ${m(B)} ${B.getFullYear()}`
  return `${A.getDate()} ${m(A)} – ${B.getDate()} ${m(B)} ${B.getFullYear()}`
}

// Small month picker in the sidebar; days with bookings get a dot.
function MiniMonth({ date, setDate, marks }) {
  const [month, setMonth] = useState(date.slice(0, 7) + '-01')
  useEffect(() => { setMonth(date.slice(0, 7) + '-01') }, [date])
  const start = monday(month)
  const T = today()
  const m = dObj(month)
  return (
    <div className="gc-mini">
      <div className="gc-mini-h">
        <b>{MONTHS[m.getMonth()]} {m.getFullYear()}</b>
        <span>
          <button className="gc-icon sm" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft /></button>
          <button className="gc-icon sm" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month"><ChevronRight /></button>
        </span>
      </div>
      <div className="gc-mini-g">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="wd">{d}</span>)}
        {Array.from({ length: 42 }, (_, i) => {
          const d = addDays(start, i)
          const cls = [d.slice(0, 7) !== month.slice(0, 7) && 'out', d === T && 'today', d === date && 'sel', marks.has(d) && 'has'].filter(Boolean).join(' ')
          return <button key={d} className={cls} onClick={() => setDate(d)} aria-label={d}>{dObj(d).getDate()}</button>
        })}
      </div>
    </div>
  )
}

function MonthGrid({ date, appts, color, onDay, onEvent }) {
  const { patient, tenant } = useTenant()
  const first = date.slice(0, 7) + '-01'
  const start = monday(first)
  const T = today()
  return (
    <div className="gc-month">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="gc-mh">{d}</div>)}
      {Array.from({ length: 42 }, (_, i) => {
        const d = addDays(start, i)
        const day = appts.filter((a) => a.date === d).sort((a, b) => a.time.localeCompare(b.time))
        return (
          <div key={d} className={`gc-mc ${d.slice(0, 7) !== first.slice(0, 7) ? 'out' : ''} ${!hoursOn(tenant, d).length ? 'closed' : ''}`} onClick={() => onDay(d)}>
            <span className={`gc-mnum ${d === T ? 'today' : ''}`}>{dObj(d).getDate()}</span>
            {day.slice(0, 3).map((a) => (
              <button key={a.id} className={`gc-mev s-${a.status}`} style={{ '--c': color(a.doctorId) }} onClick={(e) => { e.stopPropagation(); onEvent(a, e) }}>
                <i /> <span className="t">{fmtTime(a.time).replace(':00', '').replace(' ', '').toLowerCase()}</span> {patient(a.patientId)?.name}
              </button>
            ))}
            {day.length > 3 && <span className="gc-more">{day.length - 3} more</span>}
          </div>
        )
      })}
    </div>
  )
}

// Google-style details card for one appointment, with everything you can do to it.
function EventCard({ pop, color, onClose, onMove, onRemind }) {
  const { tid, tenant, list, patient, staff, user, base } = useTenant()
  const nav = useNavigate()
  const ref = useRef(null)
  const a = list('appointments').find((x) => x.id === pop.a.id) || pop.a
  const p = patient(a.patientId)
  const T = today()
  const [pos, setPos] = useState({ left: pop.x + 12, top: pop.y - 20 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth, h = el.offsetHeight
    let left = pop.x + 14
    if (left + w > window.innerWidth - 12) left = Math.max(12, pop.x - w - 14)
    setPos({ left, top: Math.max(12, Math.min(pop.y - 30, window.innerHeight - h - 12)) })
  }, [pop.x, pop.y])
  useEffect(() => {
    const out = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest('.gc-ev, .gc-mev')) onClose() }
    document.addEventListener('mousedown', out)
    return () => document.removeEventListener('mousedown', out)
  }, [onClose])
  const set = (status, msg) => { db.update(tid, 'appointments', a.id, { status }); toast(`${p?.name}: ${msg}`); onClose() }
  const canConsult = ['doctor', 'admin'].includes(user.role)
  const d = dObj(a.date)
  return createPortal(
    <div ref={ref} className="gc-pop" style={pos} role="dialog" aria-label="Appointment details">
      <div className="gc-pop-top">
        <button className="gc-icon sm" onClick={onClose} aria-label="Close"><X /></button>
      </div>
      <div className="gc-pop-row head">
        <i className="sq" style={{ background: color }} />
        <div>
          <h3><a href="#" onClick={(e) => { e.preventDefault(); nav(`${base}/patients/${a.patientId}`) }}>{p?.name || a.patientId}</a></h3>
          <div className="small muted">{DOW[d.getDay()]}, {d.getDate()} {MONTHS[d.getMonth()]} · {fmtTime(a.time)} – {fmtTime(endTime(a, tenant))}</div>
        </div>
      </div>
      {a.procedure && a.procedure !== 'Consultation' && <div className="gc-pop-row"><Clock size={16} /> <span><span className="proc-tag">{a.procedure} · {apptMins(a, tenant)} min</span></span></div>}
      {a.reason && a.reason !== a.procedure && <div className="gc-pop-row"><span className="ic">“</span> <span>{a.reason}</span></div>}
      <div className="gc-pop-row"><Stethoscope size={16} /> <span>{staff(a.doctorId)?.name}</span></div>
      {p?.phone && <div className="gc-pop-row"><Phone size={16} /> <span>{p.phone} · {a.patientId}</span></div>}
      <div className="gc-pop-row"><span className="ic" /> <Pill status={a.status}>{STATUS_TEXT[a.status] || a.status}</Pill>{a.remindedAt && <span className="small muted" style={{ marginLeft: 6 }}>Reminder sent</span>}</div>
      <div className="gc-pop-acts">
        {a.status === 'scheduled' && a.date >= T && <NotifyButtons a={a} />}
        {a.status === 'scheduled' && a.date === T && <button className="btn sm" onClick={() => set('checked-in', 'checked in')}>Check in</button>}
        {(a.status === 'scheduled' || a.status === 'checked-in') && canConsult && <button className="btn sm primary" onClick={() => nav(`${base}/consult/${a.id}`)}>Consult</button>}
        {a.status === 'scheduled' && <button className="btn sm" onClick={() => { onClose(); onMove(a) }}>Move</button>}
        {a.status === 'no-show' && <button className="btn sm" onClick={() => { onClose(); onMove(a) }}>Rebook</button>}
        {a.status === 'scheduled' && a.date <= T && <button className="btn sm ghost" onClick={() => set('no-show', 'marked as didn’t come')}>Didn’t come</button>}
        {a.status === 'scheduled' && a.date >= T && onRemind && <button className="btn sm ghost" onClick={() => { onClose(); onRemind(a) }}>Reminder options</button>}
        {a.status === 'scheduled' && <button className="btn sm ghost danger" onClick={() => set('cancelled', 'cancelled')}>Cancel</button>}
        <button className="btn sm ghost" onClick={() => nav(`${base}/patients/${a.patientId}`)}>Open record</button>
      </div>
    </div>,
    document.getElementById('tenant-root') || document.body,
  )
}
