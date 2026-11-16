// The clinic's AI assistant: a chat that does the work. Greets the user, then understands plain requests like
// "26 nov 10:30 am Prem appointment", "register Prem sharma 9826465730 32 male", "rx Prem: amox 500 tds 5 days",
// "who is waiting", "today's collection". Asks back when something is missing or there are two Prems.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Pin, PanelRightClose, Maximize2, Minimize2, Sparkles, Send, X, Mic, CalendarPlus, UserPlus, Search, Hourglass, IndianRupee, Clock, FileHeart, CornerDownLeft, Wand2 } from 'lucide-react'
import { useTenant, toast } from './ui'
import { db } from '../lib/store'
import { today, addDays, fmtDate, fmtTime, money, billTotal, nowTime, age } from '../lib/utils'
import { freeStarts, slotsOn, proceduresFor, hoursOn } from '../lib/slots'
import { takeDate, takeTime, takePhone, takeId, nameWords, findPatients, parseMeds, matchMed, titleCase, looksLikeRx } from '../lib/assistant'
import { samePerson } from '../lib/patients'
import { reminderText } from './reminders'
import { whatsappLink } from './videos'

// Doctors type fast: fix a misspelt command word ("ragister", "apointment", "prescripton") before reading the message.
const CMD_WORDS = ['register', 'registration', 'appointment', 'prescription', 'prescribe', 'reschedule', 'cancel', 'find', 'search', 'book']
const editDist = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
export const fixTypos = (text) => text.replace(/[A-Za-z]{4,}/g, (w) => {
  const lw = w.toLowerCase()
  if (CMD_WORDS.includes(lw)) return w
  const allow = lw.length >= 8 ? 2 : lw.length >= 6 ? 1 : 0
  if (!allow) return w
  const best = CMD_WORDS.map((c) => [c, editDist(lw, c)]).sort((x, y) => x[1] - y[1])[0]
  return best[1] <= allow && Math.abs(best[0].length - lw.length) <= 2 ? best[0] : w
})

export const openAssistant = (text = '') => window.dispatchEvent(new CustomEvent('ai-open', { detail: text }))
const greetWord = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
export const callName = (me, role) => { const n = (me?.name || '').replace(/^Dr\.?\s*/i, '').split(' ')[0]; return role === 'doctor' ? `Dr. ${n}` : n }
const dayLabel = (d) => (d === today() ? 'today' : d === addDays(today(), 1) ? 'tomorrow' : `${new Date(`${d}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}, ${fmtDate(d)}`)

const COMMANDS = [
  ['Book an appointment', 'Book Prem tomorrow 10:30 am', CalendarPlus],
  ['Register a patient', 'Register Prem Sharma 9826465730 32 male', UserPlus],
  ['Write a prescription', 'Rx Prem: amoxicillin 500 tds 5 days, ketorolac sos 3 days; dx dental caries 36', FileHeart],
  ['Find a patient', 'Find Prem', Search],
  ['Who is waiting?', 'Who is waiting', Hourglass],
  ['Today’s appointments', 'Today’s appointments', Clock],
  ['Free slots tomorrow', 'Free slots tomorrow', Clock],
  ['Today’s collection', 'Today’s collection', IndianRupee],
]

// Answers to "how do I…" questions about the app. k = words to look for, need = how many must appear.
const FAQ = [
  { k: ['vital', 'bp', 'pulse', 'weight', 'sugar'], need: 1, a: 'Vitals: open the patient (or the waiting list on the dashboard), tap “Today’s visit & vitals”, fill BP, pulse, weight, sugar and save. The doctor sees them on the prescription pad.', go: ['Open dashboard', 'dashboard'] },
  { k: ['print', 'prescription'], need: 2, a: 'Printing a prescription: open the patient → Prescriptions tab → tap the prescription → Print. It prints on your clinic’s own pad design. You can also tap “See printed pad” while writing it.', go: ['Open prescriptions', 'prescriptions'] },
  { k: ['whatsapp', 'prescription', 'send'], need: 2, a: 'After you complete the visit, the patient’s visit timeline shows “Send on WhatsApp”. Tap it and WhatsApp opens with the prescription ready to send.' },
  { k: ['reminder', 'remind'], need: 1, a: 'Reminders: Appointments → “Remind all patients”, or the bell on any booked slot. Each one opens WhatsApp (or SMS) with the message ready. With WhatsApp Business connected in Settings, they go out automatically.', go: ['Open appointments', 'appointments'] },
  { k: ['password', 'change password', 'login'], need: 1, a: 'Passwords: Plan & settings → Logins. The doctor can change the doctor and reception passwords there. Patients get a 6-digit PIN from the “Patient login” button on their profile.', go: ['Open settings', 'settings'] },
  { k: ['bill', 'invoice', 'payment'], need: 1, a: 'Bills: completing a consultation makes the bill automatically. For a separate bill open the patient → “New bill”. To collect money, open the bill and tap “Mark received”.', go: ['Open billing', 'billing'] },
  { k: ['expense', 'kharcha', 'rent', 'salary'], need: 1, a: 'Expenses: open Expenses in the left menu → “Add expense”. It shows money received, expenses and what is left each month.', go: ['Open expenses', 'expenses'] },
  { k: ['x-ray', 'xray', 'photo', 'image', 'upload'], need: 1, a: 'X-rays and photos: open the patient → “X-ray / photo” → take a photo or choose a file. They stay on the patient’s profile under “X-rays & photos”.' },
  { k: ['dental chart', 'tooth chart', 'teeth chart', 'chart'], need: 1, a: 'Dental chart: open the patient → “Dental chart” tab (or the Dental chart button on the prescription pad). Tap a tooth, mark what you found and the treatment to do.' },
  { k: ['estimate', 'quotation', 'cost'], need: 1, a: 'Estimates: open the patient → Estimates → “New estimate”, or “Make estimate from plan” under the dental chart. Send it on WhatsApp, print it, or turn it into a bill.' },
  { k: ['consent'], need: 1, a: 'Consent: open the patient → Consent → “New consent”. Pick the form (RCT, extraction, braces…), the patient signs on the screen, and it is saved. You can also send it on WhatsApp.' },
  { k: ['qr', 'self register', 'link'], need: 1, a: 'Patient QR: Patients → “QR / link for patients”. Print the QR for the front desk or send the link on WhatsApp. Patients fill name and mobile and appear in Today’s visits.', go: ['Open patients', 'patients'] },
  { k: ['import', 'excel', 'csv', 'old patients', 'register book'], need: 1, a: 'Old patients: Patients → “Import list”. Upload an Excel/CSV of your register (name, mobile, age, sex) and they are added in one go.', go: ['Open patients', 'patients'] },
  { k: ['move', 'reschedule', 'change time'], need: 1, a: 'Moving an appointment: in the calendar, drag it to the new time, or tap it → Move. You can also type here: “cancel Prem” and then book again.', go: ['Open calendar', 'appointments'] },
  { k: ['backup', 'data safe', 'download data'], need: 1, a: 'Your data is kept on the clinic server and backed up. The doctor can also download a backup from Plan & settings.' },
  { k: ['video', 'education', 'explain'], need: 1, a: 'Patient videos: on the prescription pad, “Explain to patient” plays short treatment videos in English or Hindi, and you can send them on WhatsApp.', go: ['Open patient education', 'education'] },
  { k: ['plan', 'price', 'subscription', 'pay'], need: 1, a: 'Your plan and price are in Plan & settings. For upgrades or payment, call or WhatsApp Debuggers Space on 9755561311.' },
  { k: ['super ai', 'real ai', 'ai plan', 'ai subscription', 'full ai'], need: 1, a: 'Super AI is a paid monthly add-on, launching soon: full AI prescription writing, medicine and dose suggestions, allergy and interaction warnings, visit notes and X-ray explanations. ₹2,999/month for clinics, ₹9,999/month for hospitals (GST extra). The doctor approves everything. Call or WhatsApp 9755561311 for early access.' },
  { k: ['smile', 'ai smile'], need: 1, a: 'AI Smile preview: open it from the left menu, take the patient’s smile photo, and it shows a simulated “after” picture to explain the treatment.' },
  { k: ['analytics', 'report', 'monthly report'], need: 1, a: 'Practice analytics (left menu) shows patients, appointments and income for any period, and downloads a report.', go: ['Open analytics', 'analytics'] },
  { k: ['add doctor', 'staff', 'receptionist'], need: 1, a: 'Doctors and staff: Staff in the left menu → Add. Each doctor then appears in booking and on the prescription pad dropdown.' },
]

export function Assistant() {
  const ctx = useTenant()
  const { tid, tenant, list, patient, staff, doctors, user, me, base } = ctx
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([])
  // Wide screens: the assistant lives on the right of every page. Pinned = always open
  // beside the page; hidden = a thin glowing rail that opens it on top until you move on.
  const loc = useLocation()
  const rxAppt = (loc.pathname.match(/\/consult\/([^/]+)/) || [])[1]
  const [wide, setWide] = useState(() => window.innerWidth >= 1100)
  useEffect(() => { const r = () => setWide(window.innerWidth >= 1100); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r) }, [])
  const [mode, setModeRaw] = useState(() => { try { return localStorage.getItem('ai-mode') || 'pinned' } catch { return 'pinned' } })
  const setMode = (m) => { setModeRaw(m); try { localStorage.setItem('ai-mode', m) } catch { /* ignore */ } }
  const side = wide && user.role !== 'patient'
  const docked = side && mode === 'pinned'
  const shown = docked || open
  useEffect(() => {
    const b = document.body.classList
    b.toggle('ai-docked', docked); b.toggle('ai-railed', side && !docked)
    return () => { b.remove('ai-docked'); b.remove('ai-railed') }
  }, [docked, side])
  // An unpinned panel steps aside when you go to another page.
  useEffect(() => { if (side && mode === 'hidden') setOpen(false) }, [loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(null)
  const [typing, setTyping] = useState(false)
  const [hi, setHi] = useState(0)
  const [listening, setListening] = useState(false)
  const logRef = useRef(null)
  const [big, setBig] = useState(false)
  const inRef = useRef(null)
  const T = today()

  const meds = useMemo(() => {
    const sets = (tenant.rxSets || []).flat().map((x) => x[0])
    const dental = /dental/i.test(tenant.kind || '') ? ['Amoxicillin 500 mg', 'Ketorolac 10 mg', 'Metronidazole 400 mg', 'Ibuprofen 400 mg', 'Chlorhexidine mouthwash', 'Sensitivity toothpaste', 'Paracetamol 650 mg', 'Aceclofenac + Paracetamol', 'Pantoprazole 40 mg'] : ['Paracetamol 650 mg', 'Pantoprazole 40 mg', 'Cetirizine 10 mg', 'Azithromycin 500 mg']
    return [...new Set([...sets, ...dental, ...list('medicines').map((m) => m.name)])]
  }, [tenant, list])

  // Learns from this clinic's own saved prescriptions: which medicines the doctors use most,
  // and what they usually give for each diagnosis. Nothing leaves the clinic's records.
  const learned = useMemo(() => {
    const count = {}; const byDx = {}
    for (const r of list('prescriptions')) {
      for (const it of r.items || []) if (it.name) count[it.name] = (count[it.name] || 0) + 1
      const k = (r.diagnosis || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
      if (k && r.items?.length) (byDx[k] = byDx[k] || []).push(r)
    }
    return { count, byDx }
  }, [list])
  const pastFor = (dx) => {
    const k = (dx || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
    if (!k) return null
    const hit = learned.byDx[k] || Object.entries(learned.byDx).find(([x]) => x.includes(k) || k.includes(x))?.[1]
    if (!hit?.length) return null
    const r = [...hit].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]
    return { times: hit.length, meds: r.items.map((it) => ({ name: it.name, dose: it.dose, freq: it.freq, days: it.days, known: true, given: true })) }
  }
  const byUse = (arr) => [...arr].sort((a, b) => (learned.count[b] || 0) - (learned.count[a] || 0))

  // Greeting with what matters right now.
  const summary = () => {
    const appts = list('appointments').filter((a) => a.date === T && a.status !== 'cancelled' && (user.role !== 'doctor' || doctors().length < 2 || a.doctorId === me?.id))
    const left = appts.filter((a) => a.status === 'scheduled' && a.time >= nowTime())
    const waiting = list('visits').filter((v) => v.date === T && v.status === 'waiting').length
    const next = left.sort((a, b) => a.time.localeCompare(b.time))[0]
    return `${greetWord()}, ${callName(me, user.role)}! 👋 Today you have ${appts.length} appointment${appts.length === 1 ? '' : 's'}${waiting ? `, ${waiting} patient${waiting > 1 ? 's' : ''} waiting` : ''}${next ? `. Next is ${patient(next.patientId)?.name} at ${fmtTime(next.time)}` : ''}. What can I do for you?`
  }
  useEffect(() => {
    const on = (e) => { setOpen(true); if (e.detail) setTimeout(() => send(e.detail), 250) }
    const key = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (docked) { setMode('hidden'); setOpen(false) } else setOpen((o) => !o) } }
    window.addEventListener('ai-open', on)
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('ai-open', on); window.removeEventListener('keydown', key) }
  })
  useEffect(() => {
    if (!shown || !rxAppt) return
    const a = list('appointments').find((x) => x.id === rxAppt)
    const p = a && patient(a.patientId)
    if (!p) return
    setPending({ kind: 'rx-meds', d: { p, meds: [] } })
    setMsgs((x) => x.some((m) => m.rxFor === rxAppt) ? x : [...x, { from: 'bot', rxFor: rxAppt, text: `Writing for ${p.name}${p.dob ? ` (${age(p.dob)} y)` : ''}. Type the diagnosis and medicines, for example “dx dental caries 36; amoxicillin 500 tds 5 days, ketorolac sos 3 days; next 1 week”. I’ll suggest the medicines you use most, and fill the pad for you.` }])
  }, [shown, rxAppt]) // eslint-disable-line react-hooks/exhaustive-deps
  // The first chips start a guided flow; the rest just ask the question.
  const cmdChips = (all) => (all ? COMMANDS : COMMANDS.slice(0, 6)).map(([l, ex]) => ({ label: l, act: l.startsWith('Book') ? () => startBook({}) : l.startsWith('Register') ? () => startRegister({}) : l.startsWith('Write') ? () => startRx({ meds: [] }) : l.startsWith('Find') ? () => { setPending({ kind: 'find' }); reply({ text: 'Type the patient’s name, mobile or ID.' }) } : () => understand(ex) }))
  useEffect(() => { if (shown && !msgs.length && !rxAppt) setMsgs([{ from: 'bot', text: summary(), chips: cmdChips() }]) }, [shown])
  useEffect(() => { if (open) setTimeout(() => inRef.current?.focus(), 80) }, [open])
  useEffect(() => { const b = logRef.current; if (b) b.scrollTo({ top: b.scrollHeight, behavior: 'smooth' }) }, [msgs, typing])

  const bot = (m) => setMsgs((x) => [...x, { from: 'bot', ...m }])
  const reply = (m) => { setTyping(true); setTimeout(() => { setTyping(false); bot(m) }, 380) }
  const pChip = (p) => `${p.name} · ${p.phone || 'no mobile'} · ${p.id}`
  const docFor = () => (user.role === 'doctor' ? me : doctors().length === 1 ? doctors()[0] : null)

  // ---- Booking ----
  // Start of booking: existing patient or a new one?
  const startBook = (d) => {
    setPending({ kind: 'book-type', d })
    reply({ text: 'Sure. Is this an existing patient or a new patient?', chips: [{ label: 'Existing patient', main: true, act: () => askBooking({ ...d, asked: true }) }, { label: 'New patient', act: () => startRegister({ then: { ...d } }) }] })
  }
  const openProfile = (p) => { if (window.innerWidth < 620) window.open(`#${base}/patients/${p.id}`, '_blank'); else nav(`${base}/patients/${p.id}`) }
  // Several patients match: show what tells them apart (village/address, else mobile) and a Profile button.
  const pickRows = (cands, onPick) => cands.slice(0, 8).map((p) => {
    const last = list('appointments').filter((a) => a.patientId === p.id && a.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))[0]
    return { main: `${p.name} · ${p.id}`, sub: [p.dob ? `${age(p.dob)} y` : '', { M: 'Male', F: 'Female' }[p.gender] || '', p.address ? `📍 ${p.address}` : `📞 ${p.phone || 'no mobile'}`, last ? `last visit ${fmtDate(last.date)}` : 'new'].filter(Boolean).join(' · '), btns: [{ label: 'Choose', main: true, act: () => onPick(p) }, { label: 'Profile', act: () => openProfile(p) }] }
  })
  const askBooking = (d) => {
    if (!d.p) {
      if (d.cands?.length > 1) {
        setPending({ kind: 'pick', d })
        const same = d.cands.filter((p) => p.name.toLowerCase() === d.cands[0].name.toLowerCase()).length === d.cands.length
        return reply({ text: same ? `There are ${d.cands.length} patients named ${d.cands[0].name}. Which one? Check the address or open the profile, then tap Choose. You can also type the mobile or ID.` : `${d.cands.length} patients match “${titleCase(d.words.join(' '))}”. Which one? Tap Choose, or type the full name, mobile or ID.`, rows: pickRows(d.cands, (p) => askBooking({ ...d, p, cands: null })) })
      }
      setPending({ kind: 'who', d })
      if (d.words?.length) return reply({ text: `I couldn’t find “${titleCase(d.words.join(' '))}”. Type the full name, mobile or ID again, or register as a new patient.`, chips: [{ label: `Register ${titleCase(d.words.join(' '))} as new`, act: () => startRegister({ name: titleCase(d.words.join(' ')), then: { ...d, words: null, cands: null } }) }] })
      return reply({ text: 'Type the patient’s full name (for example Prem Sharma), mobile number or patient ID.' })
    }
    if (!d.doc) {
      const dd = docFor()
      if (dd) d = { ...d, doc: dd }
      else { setPending({ kind: 'doc', d }); return reply({ text: `With which doctor?`, chips: doctors().map((x) => ({ label: x.name, act: () => askBooking({ ...d, doc: x }) })) }) }
    }
    if (!d.date) {
      setPending({ kind: 'date', d })
      return reply({ text: `Which day for ${d.p.name}? Type a date (like 26 Nov) or pick one:`, chips: [0, 1, 2, 3].map((n) => addDays(T, n)).filter((x) => hoursOn(tenant, x).length).map((x) => ({ label: dayLabel(x), act: () => askBooking({ ...d, date: x }) })).concat([calChip(d)]) })
    }
    const mins = d.mins || 15
    const appts = list('appointments').filter((a) => a.doctorId === d.doc.id && a.date === d.date)
    const free = freeStarts(tenant, d.date, appts, mins, d.date === T ? nowTime() : '', mins <= 15)
    if (!hoursOn(tenant, d.date).length) { setPending({ kind: 'date', d }); return reply({ text: `The clinic is closed on ${dayLabel(d.date)}. Pick another day.`, chips: [1, 2, 3, 4].map((n) => addDays(d.date, n)).filter((x) => hoursOn(tenant, x).length).slice(0, 3).map((x) => ({ label: dayLabel(x), act: () => askBooking({ ...d, date: x }) })).concat([calChip(d)]) }) }
    if (d.date < T) { setPending({ kind: 'date', d: { ...d, date: null } }); return reply({ text: 'That day has already gone. Which day?', chips: [0, 1, 2].map((n) => addDays(T, n)).map((x) => ({ label: dayLabel(x), act: () => askBooking({ ...d, date: x }) })).concat([calChip(d)]) }) }
    if (!free.length) { setPending({ kind: 'date', d }); return reply({ text: `${d.doc.name} is fully booked on ${dayLabel(d.date)}. Try another day.`, chips: [1, 2, 3].map((n) => addDays(d.date, n)).map((x) => ({ label: dayLabel(x), act: () => askBooking({ ...d, date: x }) })).concat([calChip(d)]) }) }
    if (!d.time || !free.includes(d.time)) {
      const near = d.time ? [...free].sort((a, b) => Math.abs(toM(a) - toM(d.time)) - Math.abs(toM(b) - toM(d.time))).slice(0, 6).sort() : free.slice(0, 8)
      setPending({ kind: 'time', d })
      const taken = d.time && list('appointments').find((a) => a.doctorId === d.doc.id && a.date === d.date && a.time === d.time && a.status !== 'cancelled')
      if (!d.time && !d.askedTime) { setPending({ kind: 'time', d: { ...d, askedTime: true } }); return reply({ text: `What time on ${dayLabel(d.date)}? Type it (like 5 pm) or pick a free time:`, chips: near.map((t) => ({ label: fmtTime(t), act: () => askBooking({ ...d, time: t }) })).concat([{ label: 'Another day', act: () => askBooking({ ...d, date: null, time: null }) }]) }) }
      return reply({ text: d.time ? `${fmtTime(d.time)} ${dayLabel(d.date)} is ${taken ? `already booked for ${patient(taken.patientId)?.name}` : slotsOn(tenant, d.date).includes(d.time) ? 'not free' : 'outside clinic hours'}. These times are free, pick one:` : `What time on ${dayLabel(d.date)}? Free times:`, chips: near.map((t) => ({ label: fmtTime(t), act: () => askBooking({ ...d, time: t }) })).concat([{ label: 'Another day', act: () => askBooking({ ...d, date: null, time: null }) }]) })
    }
    setPending({ kind: 'confirm', d })
    reply({
      card: { kind: 'confirm', title: 'Book this appointment?', lines: [d.p.name + ` (${d.p.id})`, `${dayLabel(d.date)} at ${fmtTime(d.time)}`, d.doc.name, `${d.proc || 'Consultation'} · ${mins} min`] },
      chips: [{ label: '✓ Confirm booking', main: true, act: () => book(d) }, { label: 'Change time', act: () => askBooking({ ...d, time: null }) }, { label: 'Cancel', act: () => { setPending(null); bot({ text: 'Okay, not booked.' }) } }],
    })
  }
  const toM = (t) => +t.slice(0, 2) * 60 + +t.slice(3)
  const book = (d) => {
    setPending(null)
    const a = db.add(tid, 'appointments', { patientId: d.p.id, doctorId: d.doc.id, date: d.date, time: d.time, reason: d.reason || d.proc || 'Consultation', status: 'scheduled', type: 'OPD', procedure: d.proc || 'Consultation', mins: d.mins || 15, bookedVia: 'assistant' })
    toast(`Booked ${d.p.name}, ${dayLabel(d.date)} ${fmtTime(d.time)}`)
    const p = d.p
    bot({ text: `Done ✅ ${p.name} is booked for ${dayLabel(d.date)} at ${fmtTime(d.time)} with ${d.doc.name}. It’s on the dashboard and the calendar now.`, chips: [
      ...(p.phone ? [{ label: 'Send confirmation on WhatsApp', href: whatsappLink(p.phone, reminderText(tenant, p, a, d.doc, 'booked')), act: () => db.update(tid, 'appointments', a.id, { remindedAt: new Date().toISOString(), remindedVia: 'whatsapp' }) }] : []),
      { label: 'Open calendar', act: () => { nav(`${base}/appointments`) } },
      { label: 'Book another', act: () => startBook({}) },
    ] })
  }

  // ---- Registration ----
  const startRegister = (f) => {
    if (!f.name) { setPending({ kind: 'reg-name', f }); return reply({ text: `${f.then ? 'New patient. ' : ''}What is the patient’s full name? You can also type everything at once, like “Prem Sharma 9826465730 32 male”.` }) }
    if (!f.phone && !f.noPhone) { setPending({ kind: 'reg-phone', f }); return reply({ text: `Mobile number for ${f.name}?`, chips: [{ label: 'No mobile', act: () => startRegister({ ...f, noPhone: true }) }] }) }
    const twin = f.phone && list('patients').find((p) => samePerson(p, f))
    if (twin) { setPending(null); return reply({ text: `${twin.name} is already registered with ${twin.phone} as ${twin.id}.`, chips: [{ label: 'Open record', act: () => nav(`${base}/patients/${twin.id}`) }, { label: 'Book appointment', act: () => askBooking({ p: twin }) }, { label: 'Add to today’s waiting', act: () => addWaiting(twin, f.reason) }] }) }
    if (f.age == null) { setPending({ kind: 'reg-age', f }); return reply({ text: `How old is ${f.name.split(' ')[0]}? (years)`, chips: [{ label: 'Not known', act: () => startRegister({ ...f, age: '' }) }] }) }
    if (!f.gender) { setPending({ kind: 'reg-gender', f }); return reply({ text: `${f.name.split(' ')[0]} is…`, chips: [['M', 'Male'], ['F', 'Female'], ['O', 'Other']].map(([v, l]) => ({ label: l, act: () => startRegister({ ...f, gender: v }) })).concat([{ label: 'Skip', act: () => startRegister({ ...f, gender: '-' }) }]) }) }
    setPending({ kind: 'reg-confirm', f })
    reply({ card: { kind: 'confirm', title: 'Register this patient?', lines: [f.name, f.phone || 'No mobile', [f.age ? `${f.age} years` : '', { M: 'Male', F: 'Female', O: 'Other' }[f.gender] || ''].filter(Boolean).join(' · ') || 'Age and sex not given', f.reason ? `Came for: ${f.reason}` : ''].filter(Boolean) },
      chips: [{ label: '✓ Register', main: true, act: () => register(f) }, { label: 'Cancel', act: () => { setPending(null); bot({ text: 'Okay, not registered.' }) } }] })
  }
  const register = (f) => {
    setPending(null)
    const dob = f.age ? `${new Date().getFullYear() - +f.age}-01-01` : ''
    const p = db.add(tid, 'patients', { name: titleCase(f.name.trim()), phone: f.phone || '', noPhone: !f.phone, gender: f.gender === '-' ? '' : f.gender, dob, dobApprox: !!dob, ageYears: f.age || '', email: '', blood: '', address: '', allergies: '', conditions: '', emergencyContact: '', regDate: T, via: 'assistant' })
    toast(`${p.name} registered as ${p.id}`)
    if (f.then) { bot({ text: `Registered ✅ ${p.name} is ${p.id}. Now the appointment.` }); return askBooking({ ...f.then, p, cands: null }) }
    bot({ text: `Registered ✅ ${p.name} is ${p.id}. What next?`, chips: [{ label: 'Add to today’s waiting', act: () => addWaiting(p, f.reason) }, { label: 'Book appointment', act: () => askBooking({ p }) }, { label: 'Open record', act: () => nav(`${base}/patients/${p.id}`) }] })
  }
  const addWaiting = (p, reason) => {
    if (list('visits').some((v) => v.patientId === p.id && v.date === T)) return bot({ text: `${p.name} is already in today’s visits.` })
    db.add(tid, 'visits', { patientId: p.id, date: T, time: nowTime(), status: 'waiting', source: 'desk', complaint: reason || '', vitals: {} })
    bot({ text: `${p.name} added to today’s waiting list. Vitals can be added from the dashboard.`, chips: [{ label: 'Open dashboard', act: () => nav(`${base}/dashboard`) }] })
  }

  // "Another date" opens a calendar; picking a day carries on with the booking.
  const calChip = (d) => ({ label: '📅 Another date', cal: true, min: T, act: (v) => askBooking({ ...d, date: v, time: d.time && v === d.date ? d.time : null, askedTime: false }) })

  // ---- Prescription: fills the prescription pad; the doctor checks it and completes the visit. ----
  const startRx = (d) => {
    if (!d.p) {
      if (d.cands?.length > 1) { setPending({ kind: 'rx-pick', d }); return reply({ text: 'Which patient is this prescription for?', rows: pickRows(d.cands, (p) => startRx({ ...d, p, cands: null })) }) }
      setPending({ kind: 'rx-who', d }); return reply({ text: 'For which patient? Type the name, mobile or ID.' })
    }
    if (!d.meds.length && !d.dx) { setPending({ kind: 'rx-meds', d }); return reply({ text: `What should I write for ${d.p.name}? For example: “amoxicillin 500 tds 5 days, ketorolac sos 3 days; dx dental caries 36; advice warm salt water rinse; next 1 week”. I’ll suggest medicines as you type.` }) }
    const past = !d.meds.length && d.dx && !d.skipPast ? pastFor(d.dx) : null
    if (past) {
      setPending({ kind: 'rx-meds', d })
      return reply({ text: `For “${d.dx}” you usually give (${past.times} time${past.times > 1 ? 's' : ''} before): ${past.meds.map((m) => m.name).join(', ')}. Use the same?`,
        chips: [{ label: '✓ Use the same', main: true, act: () => startRx({ ...d, meds: past.meds }) }, { label: 'Write different medicines', act: () => { setPending({ kind: 'rx-meds', d: { ...d, skipPast: true } }); bot({ text: 'Okay, type the medicines.' }) } }] })
    }
    setPending({ kind: 'rx-confirm', d })
    reply({ card: { kind: 'rx', title: `Prescription for ${d.p.name}`, lines: [d.dx ? `Diagnosis: ${d.dx}` : 'Diagnosis: (add on the pad)', ...d.meds.map((m, i) => `${i + 1}. ${m.name} · ${m.freq} · ${m.days} days${m.known ? '' : ' (new medicine)'}`), d.advice ? `Advice: ${d.advice}` : '', d.next ? `Next visit: ${dayLabel(d.next)}` : ''].filter(Boolean) },
      chips: [{ label: '✓ Open on prescription pad', main: true, act: () => openRx(d) }, { label: 'Cancel', act: () => { setPending(null); bot({ text: 'Okay, cleared.' }) } }] })
  }
  const openRx = (d) => {
    setPending(null)
    const here = rxAppt && list('appointments').find((x) => x.id === rxAppt && x.patientId === d.p.id)
    let a = here || list('appointments').filter((x) => x.patientId === d.p.id && x.date === T && ['scheduled', 'checked-in'].includes(x.status))[0]
    if (!a) {
      const doc = docFor() || doctors()[0]
      a = db.add(tid, 'appointments', { patientId: d.p.id, doctorId: doc.id, date: T, time: nowTime(), reason: d.dx || 'Consultation', status: 'checked-in', type: 'OPD', walkIn: true, bookedVia: 'assistant' })
    }
    try { sessionStorage.setItem(`ai-rx-${a.id}`, JSON.stringify({ dx: d.dx, meds: d.meds, advice: d.advice, next: d.next })) } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('ai-rx-fill', { detail: a.id }))
    bot({ text: here ? `Filled in on the pad for ${d.p.name}. Check it and tap “Complete visit”.` : `Opening the prescription pad for ${d.p.name} with everything filled in. Check it and tap “Complete visit”.` })
    nav(`${base}/consult/${a.id}`)
    if (window.innerWidth < 900) setOpen(false)
    else if (side && mode === 'hidden') setTimeout(() => setOpen(true), 50)
  }
  const parseRx = (raw, d = {}) => {
    let body = raw.replace(/^\s*(rx|prescription|prescribe|write prescription|likho|dawai)\b\s*(for)?/i, '').trim()
    const get = (re) => { const m = body.match(re); if (m) body = body.replace(m[0], ' '); return m?.[1]?.trim() }
    const dx = get(/(?:;|\b)(?:dx|diagnosis)\s*[:-]?\s*([^;\n]+)/i)
    const advice = get(/(?:;|\b)(?:advice|adv)\s*[:-]?\s*([^;\n]+)/i)
    const nextTxt = get(/(?:;|\b)(?:next|follow ?up|review)\s*(?:visit)?\s*[:-]?\s*(?:after|in)?\s*([^;\n]+)/i)
    let next = null
    if (nextTxt) { const n = nextTxt.match(/(\d+)\s*(day|week|month)/i); next = n ? addDays(T, +n[1] * ({ day: 1, week: 7, month: 30 })[n[2].toLowerCase()]) : takeDate(nextTxt.toLowerCase()).date || (/week/i.test(nextTxt) ? addDays(T, 7) : null) }
    let who = d.p ? null : body.split(':')[0]
    let medsPart = body.includes(':') ? body.split(':').slice(1).join(':') : body
    if (!d.p && !body.includes(':')) {
      // "rx Prem amox 500 tds 5 days": the words before the first medicine are the name.
      const ws = body.trim().split(/\s+/)
      let k = ws.findIndex((w) => w.length > 2 && matchMed(w, meds))
      if (k < 0) k = ws.length
      who = ws.slice(0, k).join(' ')
      medsPart = ws.slice(k).join(' ')
    }
    const r = d.p ? { p: d.p } : resolve(who || '')
    return { ...d, ...r, meds: [...(d.meds || []), ...parseMeds(medsPart.replace(/;/g, ','), meds).filter((m) => m.known || m.given || m.dose)], dx: dx || d.dx, advice: advice || d.advice, next: next || d.next }
  }
  const stripOpen = (t) => t.replace(/\b(open|show|see|view|check|patient|patinet|pateint|the|of|for|ka|ki|profi\w*|hist\w*|hisor\w*|records?|details|page|link|this|is)\b/g, ' ').replace(/https?:\S+/g, ' ').trim()
  const goProfile = (p) => { nav(`${base}/patients/${p.id}`); return reply({ text: `Opened ${p.name}’s profile (${p.id}).`, chips: [{ label: 'Write prescription', act: () => startRx({ p, meds: [] }) }, { label: 'Book appointment', act: () => askBooking({ p }) }] }) }
  const resolve = (txt) => {
    let t = txt.toLowerCase()
    const i = takeId(t); t = i.text
    const ph = takePhone(t); t = ph.text
    const words = nameWords(t)
    const cands = findPatients(list('patients'), { id: i.id, phone: ph.phone, words })
    return { p: cands.length === 1 ? cands[0] : null, cands, words }
  }

  // ---- Everything else ----
  const showAppts = (date) => {
    const rows = list('appointments').filter((a) => a.date === date && a.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time))
    reply({ text: rows.length ? `${rows.length} appointment${rows.length > 1 ? 's' : ''} ${dayLabel(date)}:` : `No appointments ${dayLabel(date)}.`, rows: rows.slice(0, 12).map((a) => ({ main: `${fmtTime(a.time)} · ${patient(a.patientId)?.name}`, sub: `${a.procedure && a.procedure !== 'Consultation' ? a.procedure + ' · ' : ''}${staff(a.doctorId)?.name || ''} · ${a.status === 'checked-in' ? 'checked in' : a.status}`, act: () => nav(`${base}/patients/${a.patientId}`) })), chips: [{ label: 'Open calendar', act: () => nav(`${base}/appointments`) }] })
  }
  const showPatients = (cands) => {
    if (!cands.length) return reply({ text: 'No patient matches that. Try the mobile number or patient ID.' })
    reply({ text: cands.length === 1 ? 'Here it is:' : `${cands.length} patients match:`, rows: cands.slice(0, 8).map((p) => {
      const last = list('appointments').filter((a) => a.patientId === p.id && a.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))[0]
      const nxt = list('appointments').filter((a) => a.patientId === p.id && a.status === 'scheduled' && a.date >= T).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]
      const due = list('bills').filter((b) => b.patientId === p.id).reduce((s, b) => s + Math.max(0, billTotal(b) - b.paid), 0)
      return { main: `${p.name} · ${p.id}`, sub: [p.phone, p.dob ? `${age(p.dob)} y` : '', last ? `last visit ${fmtDate(last.date)}` : 'no visits yet', nxt ? `next ${dayLabel(nxt.date)} ${fmtTime(nxt.time)}` : '', due ? `${money(due)} due` : ''].filter(Boolean).join(' · '), act: () => nav(`${base}/patients/${p.id}`) }
    }), chips: cands.length === 1 ? [{ label: 'Book appointment', act: () => askBooking({ p: cands[0] }) }, { label: 'Write prescription', act: () => startRx({ p: cands[0], meds: [] }) }, { label: 'Add to today’s waiting', act: () => addWaiting(cands[0]) }] : [] })
  }

  const answerFaq = (q) => {
    const hit = FAQ.map((f) => [f, f.k.filter((k) => q.includes(k)).length]).filter(([f, n]) => n >= f.need).sort((a, b) => b[1] - a[1])[0]?.[0]
    if (!hit) return null
    return { text: hit.a, chips: hit.go ? [{ label: hit.go[0], act: () => nav(`${base}/${hit.go[1]}`) }] : [] }
  }
  const understand = (typed, fresh = false) => {
    // Only the first word and words like "appointment" are corrected; names stay as typed.
    const raw = typed.replace(/^\s*\S+/, (w) => fixTypos(w)).replace(/\b(apo?int?ment|appo?int?ment|apointmnt|appointmnt|appoinment)\b/gi, 'appointment')
    const low = raw.toLowerCase().trim()
    // Answers to a question I asked.
    if (pending && !fresh) {
      const { kind, d, f } = pending
      if (/^(cancel|stop|no|nope|nahi|leave it|chhodo|exit|back)$/.test(low)) { setPending(null); return reply({ text: 'Okay, cancelled. What else can I do?', chips: cmdChips() }) }
      // A fresh request in the middle of a question ("rx anjali", "open Prem profile", a patient link) starts over.
      const fresh2 = /^(rx|prescription|prescribe|register|registration|book|find|search|who|today|free|new patient|add patient)\b/.test(low)
        || (/^(open|show|see|view)\s+\S/.test(low) && !/^open (pad|prescription pad|it)$/.test(low))
        || /\b(profi\w*|hist\w*|hisor\w*)\b|\/patients\/P-\d+/i.test(low)
      if (fresh2 && !(kind === 'book-type' && /^(new|register)/.test(low)) && !(kind === 'reg-confirm' && low === 'register') && !(kind === 'pick' && /^(new|register)/.test(low))) {
        setPending(null)
        // "open patient history" while writing for someone means that patient.
        if (d?.p && /\b(profi\w*|hist\w*|hisor\w*|records?|details)\b/.test(low) && !resolve(stripOpen(low)).cands?.length) return goProfile(d.p)
        return understand(typed, true)
      }
      if (kind === 'pick' || kind === 'rx-pick') {
        let t = low; const i = takeId(t); t = i.text; const ph = takePhone(t); t = ph.text
        const ws = nameWords(t)
        const hit = d.cands.filter((p) => (i.id && p.id === i.id) || (ph.phone && p.phone?.endsWith(ph.phone)) || (ws.length && ws.every((w) => p.name.toLowerCase().split(/\s+/).some((x) => x.startsWith(w)))) || (/^\d{3,}$/.test(low) && (p.phone || '').includes(low)))
        if (hit.length === 1) return kind === 'pick' ? askBooking({ ...d, p: hit[0], cands: null }) : startRx({ ...d, p: hit[0], cands: null })
        if (hit.length > 1) { setPending({ kind, d: { ...d, cands: hit } }); return reply({ text: `Still ${hit.length} match. Type the mobile or ID, or tap Choose.`, rows: pickRows(hit, (p) => (kind === 'pick' ? askBooking({ ...d, p, cands: null }) : startRx({ ...d, p, cands: null }))) }) }
        if (!/^(new|register)/.test(low)) return reply({ text: 'None of them match that. Type the mobile or patient ID, or tap Choose on the right one.', rows: pickRows(d.cands, (p) => (kind === 'pick' ? askBooking({ ...d, p, cands: null }) : startRx({ ...d, p, cands: null }))) })
      }
      if (kind === 'who' || kind === 'rx-who') { const r = resolve(raw); return kind === 'who' ? askBooking({ ...d, ...r }) : startRx({ ...d, ...r }) }
      if (kind === 'date' || kind === 'time') {
        const dt = takeDate(low); const tm = takeTime(dt.text)
        if (dt.date || tm.time) return askBooking({ ...d, date: dt.date || d.date, time: tm.time || (dt.date ? d.time : null) })
      }
      if (kind === 'doc') { const x = doctors().find((x) => x.name.toLowerCase().includes(low.replace(/^dr\.?\s*/, ''))); if (x) return askBooking({ ...d, doc: x }) }
      if (kind === 'reg-name') return startRegister(parseRegister(`register ${raw}`, f))
      if (kind === 'reg-phone') { const ph = takePhone(low); if (ph.phone) return startRegister({ ...f, phone: ph.phone }); if (/no|nahi/.test(low)) return startRegister({ ...f, noPhone: true }); return reply({ text: 'Please type a 10-digit mobile number, or tap No mobile.', chips: [{ label: 'No mobile', act: () => startRegister({ ...f, noPhone: true }) }] }) }
      if (kind === 'reg-age') { const n = low.match(/\d{1,3}/); if (n && +n[0] <= 110) return startRegister({ ...f, age: n[0] }); if (/not|pata|skip|no/.test(low)) return startRegister({ ...f, age: '' }); return reply({ text: 'Please type the age in years, or tap Not known.', chips: [{ label: 'Not known', act: () => startRegister({ ...f, age: '' }) }] }) }
      if (kind === 'book-type') {
        if (/\b(new|naya|nayi|first time)\b/.test(low)) return startRegister({ then: { ...d } })
        if (/\b(existing|old|purana|registered|already)\b/.test(low)) return askBooking({ ...d, asked: true })
        return askBooking({ ...d, ...resolve(raw) })
      }
      if (kind === 'find') { setPending(null); return showPatients(resolve(raw).cands) }
      if (kind === 'reg-gender') { const g = /\b(f|female|woman|lady|mahila)\b/.test(low) ? 'F' : /\b(m|male|man|purush)\b/.test(low) ? 'M' : null; if (g) return startRegister({ ...f, gender: g }) }
      if (kind === 'rx-meds' || kind === 'rx-confirm') {
        if (/^(yes|ok|okay|open|open pad|haan|ha|done)$/.test(low)) return openRx(d)
        if (/^(no|nope|cancel|stop|exit|back|nahi|na|leave it|clear)\b/.test(low)) { setPending(null); return reply({ text: 'Okay, stopped the prescription. What else can I do?', chips: cmdChips() }) }
        if (looksLikeRx(raw, meds)) return startRx(parseRx(raw, { ...d }))
        // Not a medicine: leave the prescription and treat it as a new request, about this patient if no one else is named.
        setPending(null)
        if (d.p && /\b(profi\w*|hist\w*|hisor\w*|records?|details|open|show)\b/.test(low) && !resolve(stripOpen(low)).p) return goProfile(d.p)
        return understand(typed, true)
      }
      if (kind === 'confirm' && /^(yes|ok|confirm|haan|ha|done|book)$/.test(low)) return book(d)
      if (kind === 'reg-confirm' && /^(yes|ok|confirm|haan|ha|register)$/.test(low)) return register(f)
      setPending(null)
    }
    const link = raw.match(/\/patients\/(P-\d+)/i)
    if (link) { const p = patient(link[1].toUpperCase()); if (p) return goProfile(p) }
    if (/\b(profi\w*|hist\w*|hisor\w*|records?|details)\b/.test(low) && !/^(rx|prescription|register|book)\b/.test(low)) {
      const r = resolve(stripOpen(low))
      if (r.p) return goProfile(r.p)
      if (!r.cands?.length && stripOpen(low)) return reply({ text: `I couldn’t find a patient called “${titleCase(stripOpen(low))}”. Try the mobile number or patient ID.` })
      if (r.cands?.length > 1) return reply({ text: 'Which patient?', rows: r.cands.slice(0, 6).map((p) => ({ main: p.name, sub: `${p.id} · ${p.phone || 'no mobile'}`, act: () => goProfile(p) })) })
    }
    if (/^(hi|hello|hey|namaste|namaskar|good (morning|afternoon|evening)|hii+)\b/.test(low)) return reply({ text: summary() })
    if (/\b(help|what can you do|commands?)\b/.test(low)) return reply({ text: 'I can do the front-desk and doctor work from chat. Try one of these:', chips: cmdChips(true) })
    if (/^(rx|prescription|prescribe|write prescription|likho)\b/.test(low)) return startRx(parseRx(raw))
    if (/^(register|new patient|add patient|registration|naya patient)\b/.test(low)) return startRegister(parseRegister(raw))
    if (/\b(who('?s| is)? waiting|waiting list|in queue|queue)\b/.test(low)) {
      const v = list('visits').filter((x) => x.date === T && ['waiting', 'with-doctor'].includes(x.status))
      return reply({ text: v.length ? `${v.length} in the clinic now:` : 'Nobody is waiting right now.', rows: v.map((x) => ({ main: patient(x.patientId)?.name, sub: `${x.status === 'with-doctor' ? 'With doctor' : 'Waiting'} since ${fmtTime(x.time)}${x.complaint ? ` · ${x.complaint}` : ''}`, act: () => nav(`${base}/patients/${x.patientId}`) })) })
    }
    if (/\b(collection|collected|income|earning|revenue|kamai|business)\b/.test(low)) {
      const month = /month|mahina/.test(low)
      const b = list('bills').filter((x) => (month ? x.date.startsWith(T.slice(0, 7)) : x.date === T))
      const got = b.reduce((s, x) => s + Math.min(x.paid, billTotal(x)), 0)
      const due = b.reduce((s, x) => s + Math.max(0, billTotal(x) - x.paid), 0)
      return reply({ text: `${month ? 'This month' : 'Today'}: ${money(got)} collected from ${b.length} bill${b.length === 1 ? '' : 's'}${due ? `, ${money(due)} still to collect` : ''}.`, chips: [{ label: month ? 'Today’s collection' : 'This month’s collection', say: month ? 'today collection' : 'this month collection' }, { label: 'Open expenses', act: () => nav(`${base}/expenses`) }] })
    }
    if (/\b(due|pending payment|baki|baaki|unpaid)\b/.test(low)) {
      const rows = list('bills').filter((b) => billTotal(b) - b.paid > 0)
      return reply({ text: rows.length ? `${rows.length} bills have money due, ${money(rows.reduce((s, b) => s + billTotal(b) - b.paid, 0))} in all:` : 'No money is due. 👍', rows: rows.slice(0, 10).map((b) => ({ main: `${patient(b.patientId)?.name} · ${money(billTotal(b) - b.paid)}`, sub: `${b.id} · ${fmtDate(b.date)}`, act: () => nav(`${base}/patients/${b.patientId}`) })) })
    }
    if (/\b(free|available|khali)\b.*\b(slots?|time|times)\b|\bfree slots?\b/.test(low)) {
      const date = takeDate(low).date || T
      const d = docFor() || doctors()[0]
      const free = freeStarts(tenant, date, list('appointments').filter((a) => a.doctorId === d.id && a.date === date), 15, date === T ? nowTime() : '', true)
      return reply({ text: free.length ? `${free.length} free slots ${dayLabel(date)} with ${d.name}. Tap one to book:` : `No free slots ${dayLabel(date)}.`, chips: free.slice(0, 12).map((t) => ({ label: fmtTime(t), act: () => askBooking({ date, time: t, doc: d }) })) })
    }
    if (/^(open|go to|show)\s+(calendar|appointments|expenses|settings|patients|dashboard|billing|analytics|prescriptions)\b/.test(low)) {
      const page = low.match(/(calendar|appointments|expenses|settings|patients|dashboard|billing|analytics|prescriptions)/)[1]
      nav(`${base}/${page === 'calendar' ? 'appointments' : page}`)
      return reply({ text: `Opened ${page}.` })
    }
    if (/\b(cancel)\b/.test(low)) {
      const r = resolve(low.replace(/\bcancel\b/, ''))
      const a = r.p && list('appointments').filter((x) => x.patientId === r.p.id && x.status === 'scheduled' && x.date >= T).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time))[0]
      if (!a) return reply({ text: r.p ? `${r.p.name} has no upcoming appointment.` : 'Whose appointment should I cancel? Type the name.' })
      return reply({ text: `Cancel ${r.p.name}’s appointment ${dayLabel(a.date)} at ${fmtTime(a.time)}?`, chips: [{ label: 'Yes, cancel it', main: true, act: () => { db.update(tid, 'appointments', a.id, { status: 'cancelled' }); bot({ text: 'Cancelled.' }) } }, { label: 'No', act: () => bot({ text: 'Okay, kept.' }) }] })
    }
    if (/\bcheck ?in\b|\barrived\b|\baa gay/.test(low)) {
      const r = resolve(low.replace(/\bcheck ?in\b|\barrived\b/, ''))
      const a = r.p && list('appointments').find((x) => x.patientId === r.p.id && x.date === T && x.status === 'scheduled')
      if (!r.p) return reply({ text: 'Who arrived? Type the name or mobile.' })
      if (a) db.update(tid, 'appointments', a.id, { status: 'checked-in' })
      addWaiting(r.p)
      return
    }
    // Booking: "26 nov 10:30 am Prem appointment", "book Prem tomorrow 5 pm", "Prem kal 11 baje".
    let t = low
    const i = takeId(t); t = i.text
    const ph = takePhone(t); t = ph.text
    const dt = takeDate(t); t = dt.text
    const tm = takeTime(t); t = tm.text
    const proc = proceduresFor(tenant).find(([n]) => new RegExp(`\\b${n.split(/[ /&]/)[0].toLowerCase()}\\b`).test(t))
    if (proc) t = t.replace(new RegExp(proc[0].split(/[ /&]/)[0], 'i'), ' ')
    const docM = t.match(/\b(?:with\s+)?dr\.?\s+([a-z]+)/)
    const doc = docM && doctors().find((x) => x.name.toLowerCase().includes(docM[1]))
    if (docM) t = t.replace(docM[0], ' ')
    const isList = /\b(appointments|schedule|list)\b/.test(low) && !nameWords(t).length && !i.id && !ph.phone
    if (isList) return showAppts(dt.date || T)
    const wantsBook = /\b(book|appointment|appt|apointment|appoinment|schedule|slot)\b/.test(low) || ((dt.date || tm.time) && (nameWords(t).length || i.id || ph.phone))
    const words = nameWords(t)
    const cands = findPatients(list('patients'), { id: i.id, phone: ph.phone, words })
    if (wantsBook && !words.length && !i.id && !ph.phone) return startBook({ date: dt.date, time: tm.time, doc, proc: proc?.[0], mins: proc?.[1] })
    if (wantsBook) return askBooking({ p: cands.length === 1 ? cands[0] : null, cands, words, date: dt.date, time: tm.time, doc, proc: proc?.[0], mins: proc?.[1] })
    const faq = answerFaq(low)
    if (faq && !cands.length) return reply(faq)
    if (/^(find|search|show|open|lookup|dhundo)\b/.test(low) || i.id || ph.phone || cands.length) return showPatients(cands)
    if (faq) return reply(faq)
    reply({ text: 'I didn’t get that yet. You can ask me to do something, or ask how to do something in the app (for example “how do I add vitals?”).', chips: cmdChips(true) })
  }

  const parseRegister = (raw, base0 = {}) => {
    let t = raw.replace(/^\s*(register|new patient|add patient|registration|naya patient)\s*(patient)?\s*:?/i, ' ')
    const ph = takePhone(t); t = ph.text
    const g = t.match(/\b(male|female|man|woman|boy|girl|m|f|purush|mahila)\b/i)
    if (g) t = t.replace(g[0], ' ')
    const ag = t.match(/\b(\d{1,3})\s*(?:y|yr|yrs|years?|saal)?\b/i)
    if (ag && +ag[1] <= 110) t = t.replace(ag[0], ' ')
    const rs = t.match(/\b(?:for|with|reason|came for|complaint)\s+(.+)$/i)
    if (rs) t = t.replace(rs[0], ' ')
    const name = titleCase(t.replace(/[^a-zA-Zऀ-ॿ\s.]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase())
    const gen = g ? (/^(f|female|woman|girl|mahila)$/i.test(g[1]) ? 'F' : 'M') : base0.gender
    return { ...base0, name: name || base0.name, phone: ph.phone || base0.phone, gender: gen, age: ag && +ag[1] <= 110 ? ag[1] : base0.age, reason: rs?.[1] || base0.reason }
  }

  const send = (text) => {
    const v = (text ?? input).trim()
    if (!v) return
    setMsgs((x) => [...x, { from: 'me', text: v }])
    setInput('')
    setHi(0)
    try { understand(v) } catch (e) { reply({ text: `Sorry, something went wrong: ${e.message}` }) }
  }

  // Type-ahead: commands at the start, patient names while typing a name, medicines inside a prescription.
  const sugg = useMemo(() => {
    const v = input
    if (!v.trim()) return []
    const low = v.toLowerCase()
    const last = low.split(/[\s,:;]+/).pop()
    const rxMode = /^(rx|prescription|prescribe)\b/.test(low) || ['rx-meds'].includes(pending?.kind)
    if (rxMode && (low.includes(':') || pending?.kind === 'rx-meds' || low.split(/\s+/).length > 2) && last.length >= 2) {
      return byUse(meds.filter((m) => m.toLowerCase().startsWith(last) || m.toLowerCase().includes(` ${last}`))).slice(0, 6).map((m) => ({ label: m, sub: learned.count[m] ? `used ${learned.count[m]}× by you` : 'medicine', apply: v.slice(0, v.length - last.length) + m + ' ' }))
    }
    if (low.split(/\s+/).length <= 2 && !/\d/.test(low)) {
      const cmd = COMMANDS.filter(([, ex]) => ex.toLowerCase().startsWith(low)).map(([l, ex]) => ({ label: ex, sub: l, apply: ex }))
      if (cmd.length) return cmd.slice(0, 4)
    }
    if (last.length >= 2 && /^[a-z]+$/.test(last) && !/^(am|pm|at|on|for|tomorrow|today|book|appointment)$/.test(last)) {
      return list('patients').filter((p) => p.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(last))).slice(0, 5).map((p) => ({ label: p.name, sub: `${p.phone || 'no mobile'} · ${p.id}`, apply: v.slice(0, v.length - last.length) + `${p.name} ${p.id} ` }))
    }
    return []
  }, [input, meds, list, pending, learned])

  const mic = () => {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Rec) return toast('Voice typing works in Chrome. Please type instead.')
    const r = new Rec(); r.lang = 'en-IN'; r.interimResults = false
    r.onresult = (e) => { const said = e.results[0][0].transcript; setInput(said); setTimeout(() => send(said), 100) }
    r.onend = () => setListening(false)
    setListening(true); r.start()
  }

  const keyDown = (e) => {
    if (sugg.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setHi((h) => (h + (e.key === 'ArrowDown' ? 1 : -1) + sugg.length) % sugg.length); return }
    if (sugg.length && e.key === 'Tab') { e.preventDefault(); setInput(sugg[hi]?.apply || input); setHi(0) }
  }

  if (user.role === 'patient') return null
  return (
    <>
      {!side && !open && <button className="ai-fab" onClick={() => setOpen(true)} title="AI assistant (Ctrl+K)" aria-label="Open AI assistant"><Sparkles /><span>Ask AI</span></button>}
      {side && !shown && (
        <button className="ai-rail" onClick={() => setOpen(true)} title="Open the AI assistant (Ctrl+K)" aria-label="Open the AI assistant">
          <span className="ai-orb"><Sparkles size={18} /></span><span className="ai-rail-t">Ask AI · Ctrl+K</span>
        </button>
      )}
      {shown && (
        <div className={`ai-panel ${side ? 'side' : ''} ${docked ? 'docked' : side ? 'over' : ''} ${big ? 'big' : ''}`} role={docked ? 'complementary' : 'dialog'} aria-label="AI assistant">
          <header className="ai-head">
            <span className="ai-orb"><Sparkles size={18} /></span>
            <div><b>I am your AI agent</b><small><i className="ai-live" /> {rxAppt ? 'Tell me the medicines, I’ll write the prescription' : 'Online · give me any task'}</small></div>
            {side && <button className="gc-icon sm" onClick={() => setBig(!big)} aria-pressed={big} aria-label={big ? 'Make smaller' : 'Make bigger'} title={big ? 'Back to the side' : 'Make the chat bigger (covers the page)'}>{big ? <Minimize2 /> : <Maximize2 />}</button>}
            {side && <button className={`gc-icon sm ai-pin ${docked ? 'on' : ''}`} onClick={() => { if (docked) { setMode('hidden'); setOpen(true) } else { setMode('pinned'); setOpen(false) } }} aria-pressed={docked} aria-label={docked ? 'Unpin' : 'Pin open'} title={docked ? 'Unpin: closes when you change page' : 'Pin: keep open on every page'}><Pin /></button>}
            <button className="gc-icon sm" onClick={() => { if (side) setMode('hidden'); setOpen(false) }} aria-label="Hide" title={side ? 'Hide to the side rail' : 'Close'}>{side ? <PanelRightClose /> : <X />}</button>
          </header>
          <div className="ai-log" ref={logRef} aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`ai-msg ${m.from}`}>
                {m.text && <div className="ai-bubble">{m.text}</div>}
                {m.card && msgs.findLastIndex((x) => x.card) === i && (
                  <div className={`ai-card ${m.card.kind}`}>
                    <b><Wand2 size={14} /> {m.card.title}</b>
                    {m.card.lines.map((l, j) => <span key={j}>{l}</span>)}
                  </div>
                )}
                {m.rows?.length > 0 && <div className="ai-rows">{m.rows.map((r, j) => r.btns ? (
                  <div key={j} className="ai-row-pick"><div><b>{r.main}</b><span>{r.sub}</span></div>{i === msgs.length - 1 && r.btns.map((b, k) => <button key={k} className={`ai-chip ${b.main ? 'main' : ''}`} onClick={() => { if (b.main) setMsgs((x) => [...x, { from: 'me', text: r.main }]); b.act() }}>{b.label}</button>)}</div>
                ) : <button key={j} onClick={r.act}><b>{r.main}</b><span>{r.sub}</span></button>)}</div>}
                {m.chips?.length > 0 && i === msgs.length - 1 && (
                  <div className="ai-chips">
                    {m.chips.map((c, j) => c.cal
                      ? <DateChip key={j} chip={c} onPick={(v) => { setMsgs((x) => [...x, { from: 'me', text: dayLabel(v) }]); c.act(v) }} />
                      : c.href
                      ? <a key={j} className="ai-chip" href={c.href} target="_blank" rel="noopener noreferrer" onClick={c.act}>{c.label}</a>
                      : <button key={j} className={`ai-chip ${c.main ? 'main' : ''}`} onClick={() => { if (c.fill) { setInput(c.fill); inRef.current?.focus(); return } if (c.say) return send(c.say); setMsgs((x) => [...x, { from: 'me', text: c.label.replace(/^✓ /, '') }]); c.act() }}>{c.label}</button>)}
                  </div>
                )}
              </div>
            ))}
            {typing && <div className="ai-msg bot"><div className="ai-bubble typing"><i /><i /><i /></div></div>}
          </div>
          <div className="ai-foot">
            {sugg.length > 0 && (
              <div className="ai-sugg" role="listbox">
                {sugg.map((s, j) => <button key={j} role="option" aria-selected={j === hi} className={j === hi ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); setInput(s.apply); setHi(0); inRef.current?.focus() }}><b>{s.label}</b><span>{s.sub}</span>{j === hi && <kbd>Tab</kbd>}</button>)}
              </div>
            )}
            <form className="ai-form" onSubmit={(e) => { e.preventDefault(); send() }}>
              <input ref={inRef} value={input} onChange={(e) => { setInput(e.target.value); setHi(0) }} onKeyDown={keyDown} placeholder={pending ? 'Type your answer…' : 'e.g. 26 nov 10:30 am Prem appointment'} aria-label="Message the assistant" autoComplete="off" />
              <button type="button" className={`ai-mic ${listening ? 'on' : ''}`} onClick={mic} aria-label="Speak"><Mic size={18} /></button>
              <button type="submit" className="ai-send" aria-label="Send" disabled={!input.trim()}><Send size={17} /></button>
            </form>
            <div className="ai-hint"><CornerDownLeft size={11} /> Enter to send · Tab to accept a suggestion</div>
          </div>
        </div>
      )}
    </>
  )
}

// Dashboard bar: greet the user and let them type a request straight away.
export function AskBar() {
  const { me, user } = useTenant()
  const [v, setV] = useState('')
  const ex = ['26 nov 10:30 am Prem appointment', 'register Niharika Singh', 'who is waiting', 'today collection', 'free slots tomorrow']
  return (
    <form className="ask-bar" onSubmit={(e) => { e.preventDefault(); openAssistant(v); setV('') }}>
      <span className="ai-orb"><Sparkles size={18} /></span>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={`Hi ${callName(me, user.role)}, what should I do? Try “${ex[new Date().getMinutes() % ex.length]}”`} aria-label="Ask the AI assistant" />
      <button className="btn primary" type="submit"><Send /> Ask AI</button>
    </form>
  )
}

// A chip that opens the browser's calendar; the chosen day goes back into the chat.
function DateChip({ chip, onPick }) {
  const ref = useRef(null)
  const [show, setShow] = useState(false)
  const open = () => { setShow(true); setTimeout(() => { try { ref.current?.showPicker() } catch { ref.current?.focus() } }, 30) }
  return (
    <span className="ai-datechip">
      <button type="button" className="ai-chip" onClick={open}>{chip.label}</button>
      {show && <input ref={ref} type="date" min={chip.min} aria-label="Pick a date" onChange={(e) => e.target.value && onPick(e.target.value)} />}
    </span>
  )
}
