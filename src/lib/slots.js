// Appointment time slots for a day, from the clinic's opening hours.
import { SITES } from './sites'

// Used when a clinic has not set its hours: 9:30 am to 1 pm and 3 pm to 7 pm, every day but Sunday.
const DEFAULT_HOURS = [[9.5, 13], [15, 19]]

const hm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

export const slotMinutes = (tenant) => +tenant.slotMins || 15

// Opening hours for that date as [[open, close], ...] in hours (10.5 = 10:30).
export function hoursOn(tenant, date) {
  const day = new Date(`${date}T12:00:00`).getDay()
  const site = SITES[tenant.slug]
  if (site?.hours) return site.hours.find(([d]) => d === day)?.[1] || []
  return day === 0 ? [] : DEFAULT_HOURS
}

export function slotsOn(tenant, date) {
  const step = slotMinutes(tenant)
  const out = []
  for (const [open, close] of hoursOn(tenant, date)) {
    for (let m = Math.round(open * 60); m + step <= Math.round(close * 60); m += step) out.push(hm(m))
  }
  return out
}

// Procedures and how long each one keeps the doctor busy (minutes). Clinics can override with tenant.procedures.
const DENTAL_PROCEDURES = [
  ['Consultation', 15], ['RCT', 30], ['Extraction', 30], ['Filling', 30], ['Scaling & polishing', 30],
  ['Crown / cap', 30], ['Braces adjustment', 15], ['Teeth whitening', 45], ['Implant', 60], ['Dentures', 30],
]
const GENERAL_PROCEDURES = [['Consultation', 15], ['Follow-up', 15], ['Dressing', 15], ['Minor procedure', 30], ['Physiotherapy', 30]]
export const proceduresFor = (tenant) => tenant.procedures || (/dental/i.test(tenant.kind || '') ? DENTAL_PROCEDURES : GENERAL_PROCEDURES)

const toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5)
// How long an appointment takes, rounded up to whole slots.
export const apptMins = (a, tenant) => {
  const step = slotMinutes(tenant)
  return Math.max(step, Math.ceil((+a.mins || step) / step) * step)
}
export const endTime = (a, tenant) => hm(toMin(a.time) + apptMins(a, tenant))

// Every slot start an appointment covers: a 30-minute RCT at 3:00 covers 3:00 and 3:15.
export function coveredSlots(a, tenant) {
  const step = slotMinutes(tenant)
  const out = []
  for (let m = toMin(a.time); m < toMin(a.time) + apptMins(a, tenant); m += step) out.push(hm(m))
  return out
}

const slotTaken = (appts, t) => appts.some((a) => a.time === t && !['cancelled', 'no-show'].includes(a.status))
// The procedure running at a time, if any (for "during RCT" labels).
export const duringAt = (appts, tenant, t) => { const b = busyMap(appts, tenant)[t]; return b && !b.start ? b.a : null }

// time -> { a, start } for every slot that is busy, including the later part of a long procedure.
export function busyMap(appts, tenant) {
  const map = {}
  appts.filter((a) => a.time && !['cancelled', 'no-show'].includes(a.status)).forEach((a) => {
    coveredSlots(a, tenant).forEach((t, i) => { if (!map[t] || i === 0) map[t] = { a, start: i === 0 } })
  })
  return map
}

// Start times where a procedure of `mins` fits without touching another booking or closing time.
// With overlap (a short consultation), the doctor can also see someone while a long procedure goes on:
// then only a booking that starts in that slot, or another consultation, blocks it.
export function freeStarts(tenant, date, appts, mins, after = '', overlap = false) {
  const slots = slotsOn(tenant, date)
  const open = new Set(slots)
  const busy = busyMap(appts, tenant)
  const need = apptMins({ mins }, tenant)
  const step = slotMinutes(tenant)
  return slots.filter((s) => {
    if (after && s <= after) return false
    for (let m = toMin(s); m < toMin(s) + need; m += step) {
      const t = hm(m)
      if (!open.has(t)) return false
      if (busy[t] && !(overlap && !busy[t].start && !slotTaken(appts, t))) return false
    }
    return true
  })
}
