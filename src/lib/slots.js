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
