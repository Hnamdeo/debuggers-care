// Understanding typed or spoken requests for the clinic assistant, without any outside AI service:
// dates ("26 nov", "tomorrow", "next monday"), times ("10:30 am", "5 pm"), mobiles, patient IDs,
// procedures and medicines in plain words.
import { today, addDays, pad } from './utils'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
const valid = (y, m, d) => { const x = new Date(y, m - 1, d); return x.getMonth() === m - 1 && x.getDate() === d }

// Returns { date, text } where text has the date words removed.
export function takeDate(text) {
  const T = today()
  const [Y] = T.split('-').map(Number)
  const tries = [
    [/\bday after tomorrow\b|\bparso\b/, () => addDays(T, 2)],
    [/\b(today|aaj|tonight|now)\b/, () => T],
    [/\b(tomorrow|tmrw|tmr|kal)\b/, () => addDays(T, 1)],
    [/\b(?:in|after)\s+(\d{1,2})\s+days?\b/, (m) => addDays(T, +m[1])],
    [/\b(?:in|after)\s+(?:a|1|one)\s+week\b|\bnext week\b/, () => addDays(T, 7)],
    [/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\.?(?:,?\s*(\d{4}))?\b/, (m) => fromDM(+m[1], MONTHS.indexOf(m[2].slice(0, 3)) + 1, m[3])],
    [/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/, (m) => fromDM(+m[2], MONTHS.indexOf(m[1].slice(0, 3)) + 1, m[3])],
    [/\b(\d{4})-(\d{2})-(\d{2})\b/, (m) => (valid(+m[1], +m[2], +m[3]) ? iso(+m[1], +m[2], +m[3]) : null)],
    [/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/, (m) => fromDM(+m[1], +m[2], m[3])],
    [/\b(?:next\s+|this\s+|on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/, (m, full) => {
      const want = DAYS.indexOf(m[1].slice(0, 3)); const now = new Date(`${T}T12:00:00`).getDay()
      let n = (want - now + 7) % 7
      if (n === 0 || /next/.test(full)) n = n || 7
      return addDays(T, n)
    }],
  ]
  function fromDM(d, m, y) {
    if (!m || m > 12 || d > 31) return null
    let yr = y ? (+y < 100 ? 2000 + +y : +y) : Y
    if (!y && iso(yr, m, d) < T) yr += 1
    return valid(yr, m, d) ? iso(yr, m, d) : null
  }
  for (const [re, fn] of tries) {
    const m = text.match(re)
    if (m) { const date = fn(m, m[0]); if (date) return { date, text: text.replace(m[0], ' ') } }
  }
  return { date: null, text }
}

// Returns { time: 'HH:MM', text }. Bare hours are read as clinic hours (5 → 5 PM, 10 → 10 AM).
export function takeTime(text) {
  const fix = (h, mm, ap) => {
    h = +h; mm = +(mm || 0)
    if (ap) { if (/p/.test(ap) && h < 12) h += 12; if (/a/.test(ap) && h === 12) h = 0 }
    else if (h >= 1 && h <= 7) h += 12
    return h < 24 && mm < 60 ? `${pad(h)}:${pad(mm)}` : null
  }
  const tries = [
    /\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/,
    /\b(?:at|@|by)\s*(\d{1,2})(?:[:.](\d{2}))?\b/,
    /\b(\d{1,2})[:.](\d{2})\b/,
    /\b(\d{1,2})\s*(?:baje|o'?clock)\b/,
  ]
  for (const re of tries) {
    const m = text.match(re)
    if (m) { const time = fix(m[1], m[2], m[3]); if (time) return { time, text: text.replace(m[0], ' ') } }
  }
  if (/\bmorning|subah\b/.test(text)) return { time: '10:00', text: text.replace(/\bmorning|subah\b/, ' '), rough: true }
  if (/\bevening|shaam\b/.test(text)) return { time: '17:00', text: text.replace(/\bevening|shaam\b/, ' '), rough: true }
  if (/\bafternoon\b/.test(text)) return { time: '15:00', text: text.replace(/\bafternoon\b/, ' '), rough: true }
  return { time: null, text }
}

export function takePhone(text) {
  const m = text.match(/(?:\+?91[\s-]?)?\b([6-9]\d{4}[\s-]?\d{5})\b/)
  return m ? { phone: m[1].replace(/\D/g, ''), text: text.replace(m[0], ' ') } : { phone: null, text }
}
export function takeId(text) {
  const m = text.match(/\b(p)[\s-]?(\d{3,6})\b/i)
  return m ? { id: `P-${m[2]}`, text: text.replace(m[0], ' ') } : { id: null, text }
}

const FILLER = new Set('a an the for of on at to with and please pls plz book booking booked appointment appointments appt appts apointment appoinment schedule fix set make new add create patient patients mr mrs ms miss sir madam ji ko ka ki ke se karo kar kardo do hai for me my our is are slot visit consult consultation checkup check up today tomorrow kal aaj time date dr doctor also can you want need register registration'.split(' '))
// Leftover words that are probably the patient's name.
export const nameWords = (text) => text.toLowerCase().replace(/[^a-zऀ-ॿ\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !FILLER.has(w))

// Patients whose name words start with every typed word ("rah sha" finds Rahul Sharma).
export function findPatients(patients, { id, phone, words }) {
  if (id) return patients.filter((p) => p.id.toUpperCase() === id.toUpperCase())
  if (phone) { const hit = patients.filter((p) => (p.phone || '').endsWith(phone.slice(-10))); if (hit.length) return hit }
  if (!words?.length) return []
  const all = patients.filter((p) => { const ws = p.name.toLowerCase().split(/\s+/); return words.every((w) => ws.some((x) => x.startsWith(w))) })
  if (all.length) return all
  // Fall back to the longest word alone, so a stray extra word does not hide the patient.
  const w = [...words].sort((a, b) => b.length - a.length)[0]
  return w.length > 2 ? patients.filter((p) => p.name.toLowerCase().split(/\s+/).some((x) => x.startsWith(w))) : []
}

// Prescription lines: "amoxicillin 500 tds 5 days, ketorolac sos 3 days".
const FREQ = [
  [/\b(tds|tid|thrice|1-1-1|three times)\b/, 'Three times a day'],
  [/\b(bd|bid|twice|1-0-1|two times)\b/, 'Twice a day'],
  [/\b(od|once|1-0-0|daily|morning)\b/, 'Once a day'],
  [/\b(hs|0-0-1|night|bedtime)\b/, 'At night'],
  [/\b(sos|prn|when needed|if pain)\b/, 'When needed for pain'],
]
export function parseMeds(text, known) {
  return text.split(/[,;\n]|\band\b/).map((part) => part.trim()).filter(Boolean).map((part) => {
    const low = part.toLowerCase()
    const days = +(low.match(/(\d{1,3})\s*(?:d\b|days?|din)/)?.[1] || 0)
    const freq = FREQ.find(([re]) => re.test(low))?.[1]
    const word = low.replace(/(\d{1,3})\s*(?:d\b|days?|din)/, ' ').replace(/\b(tds|tid|thrice|bd|bid|twice|od|once|daily|hs|sos|prn|night|bedtime|morning|for|x|times?|a day|tab|tabs|tablet|cap|caps|capsule|after food|before food)\b/g, ' ').replace(/\d-\d-\d/g, ' ').replace(/\s+/g, ' ').trim()
    const match = matchMed(word, known)
    return match || word ? { name: match || titleCase(word), known: !!match, freq: freq || 'Twice a day', days: days || 5, given: !!freq } : null
  }).filter((m) => m && m.name.length > 2)
}
export function matchMed(word, known) {
  if (!word) return null
  const w = word.toLowerCase()
  const first = w.split(/\s+/)[0]
  return known.find((k) => k.toLowerCase() === w)
    || known.find((k) => k.toLowerCase().startsWith(w))
    || known.find((k) => { const kl = k.toLowerCase(); return kl.startsWith(first) && w.split(/\s+/).slice(1).every((x) => kl.includes(x)) })
    || (first.length >= 4 ? known.find((k) => k.toLowerCase().startsWith(first)) : null)
}
export const titleCase = (s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase())
