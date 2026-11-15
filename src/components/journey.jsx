// A patient's visit as one horizontal timeline: registered, waiting, in chair, consultation,
// prescription, bill and the prescription sent on WhatsApp. Plus an AI-style summary of the day.
import { UserPlus, Hourglass, Armchair, Stethoscope, FileHeart, Receipt, MessageCircle, Sparkles, Check } from 'lucide-react'
import { useTenant, toast } from './ui'
import { db } from '../lib/store'
import { whatsappLink } from './videos'
import { fmtDate, fmtTime, money, billTotal, age } from '../lib/utils'
import { vitalsText } from './visits'

const hhmm = (iso) => (iso ? new Date(iso).toTimeString().slice(0, 5) : '')

// Everything that happened to one patient on one day.
export function dayRecords(list, patientId, date) {
  const on = (c) => list(c).filter((r) => r.patientId === patientId && r.date === date)
  const visit = on('visits')[0]
  const appt = on('appointments').find((a) => a.status !== 'cancelled' && (!visit?.appointmentId || a.id === visit.appointmentId)) || on('appointments').find((a) => a.status !== 'cancelled')
  const rx = on('prescriptions').sort((a, b) => (b.id > a.id ? 1 : -1))[0]
  const bill = on('bills').sort((a, b) => (b.id > a.id ? 1 : -1))[0]
  return { visit, appt, rx, bill }
}

export function journeySteps(p, date, { visit, appt, rx, bill }) {
  const arrived = !!visit || ['checked-in', 'completed'].includes(appt?.status)
  const chair = !!(visit?.chairAt || ['with-doctor', 'done'].includes(visit?.status) || appt?.status === 'completed' || rx)
  const consult = !!(visit?.consultAt || rx)
  const due = bill ? Math.max(0, billTotal(bill) - (bill.paid || 0)) : 0
  const steps = [
    { key: 'reg', icon: UserPlus, label: 'Registered', sub: p.regDate === date ? 'New patient' : 'Returning', done: true },
    { key: 'wait', icon: Hourglass, label: 'Waiting', sub: arrived ? fmtTime(visit?.time || appt?.time) : '', done: arrived },
    { key: 'chair', icon: Armchair, label: 'In chair', sub: visit?.chairAt ? fmtTime(hhmm(visit.chairAt)) : '', done: chair },
    { key: 'consult', icon: Stethoscope, label: 'Consultation', sub: visit?.consultAt ? fmtTime(hhmm(visit.consultAt)) : '', done: !!rx, live: consult && !rx },
    { key: 'rx', icon: FileHeart, label: 'Prescription', sub: rx ? (rx.time ? fmtTime(rx.time) : rx.id) : '', done: !!rx },
    { key: 'bill', icon: Receipt, label: 'Bill', sub: bill ? (due ? `${money(due)} due` : 'Paid') : '', done: !!bill && !due, warn: !!bill && due > 0 },
    { key: 'wa', icon: MessageCircle, label: 'On WhatsApp', sub: rx?.sentAt ? fmtTime(hhmm(rx.sentAt)) : '', done: !!rx?.sentAt },
  ]
  const cur = steps.findIndex((s) => !s.done && !s.warn)
  return steps.map((s, i) => ({ ...s, current: i === cur || s.live }))
}

// The prescription as a WhatsApp message the patient can keep.
export function rxMessage(tenant, p, rx, doctor) {
  const lines = [
    `*${tenant.name}*`,
    `Prescription for ${p.name} · ${fmtDate(rx.date)}${doctor ? ` · ${doctor.name}` : ''}`,
    rx.diagnosis ? `\nDiagnosis: ${rx.diagnosis}` : '',
    rx.items?.length ? `\nMedicines:\n${rx.items.map((i, n) => `${n + 1}. ${i.name}${i.dose ? ` · ${i.dose}` : ''} · ${i.freq} · ${i.days} days`).join('\n')}` : '',
    rx.notes ? `\nAdvice: ${rx.notes}` : '',
    rx.nextVisit ? `\nNext visit: ${fmtDate(rx.nextVisit)}` : '',
    '\nGet well soon.',
  ]
  return lines.filter(Boolean).join('\n')
}

export function SendRxWhatsApp({ p, rx, className = 'btn sm' }) {
  const { tid, tenant, staff } = useTenant()
  if (!rx || !p?.phone) return null
  const href = whatsappLink(p.phone.replace(/\D/g, '').slice(-10), rxMessage(tenant, p, rx, staff(rx.doctorId)))
  const mark = () => {
    db.update(tid, 'prescriptions', rx.id, { sentAt: new Date().toISOString() })
    toast(`Prescription sent to ${p.name} on WhatsApp`)
  }
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer" onClick={mark}><MessageCircle /> {rx.sentAt ? 'Send again' : 'Send on WhatsApp'}</a>
}

// What to do next, in one line.
function nextHint(steps, recs) {
  const due = recs.bill ? billTotal(recs.bill) - (recs.bill.paid || 0) : 0
  if (due > 0) return `Collect ${money(due)} at the front desk.`
  const c = steps.find((s) => s.current)
  if (!c) return 'Visit complete. Nothing pending.'
  return {
    wait: 'Take vitals and add them to today’s visit.',
    chair: 'Patient is waiting. Send them to the doctor.',
    consult: 'Doctor can start the consultation.',
    rx: 'Finish the prescription to complete the visit.',
    bill: 'Make the bill for this visit.',
    wa: 'Send the prescription to the patient on WhatsApp.',
  }[c.key]
}

export function VisitJourney({ p, date, compact = false }) {
  const { list } = useTenant()
  const recs = dayRecords(list, p.id, date)
  const steps = journeySteps(p, date, recs)
  if (compact) {
    const c = steps.find((s) => s.current)
    const NOW = { wait: 'Not arrived', chair: 'Waiting', consult: 'In chair', rx: 'Consultation on', bill: 'Bill pending', wa: 'Send Rx on WhatsApp' }
    const live = steps.find((s) => s.live)
    const text = live ? 'Consultation on' : steps.some((s) => s.warn) && !c ? 'Payment due' : c ? NOW[c.key] : 'Done'
    return (
      <div className="jr-mini" title={steps.map((s) => `${s.label}${s.done ? ' ✓' : ''}`).join(' → ')}>
        <div className="jr-dots">{steps.map((s) => <i key={s.key} className={s.done ? 'done' : s.warn ? 'warn' : s.current ? 'cur' : ''} />)}</div>
        <span className="small">{text}</span>
      </div>
    )
  }
  return (
    <div className="jr">
      <ol className="jr-track" aria-label="Visit timeline">
        {steps.map((s) => (
          <li key={s.key} className={`jr-step ${s.done ? 'done' : ''} ${s.current ? 'cur' : ''} ${s.warn ? 'warn' : ''}`} aria-current={s.current ? 'step' : undefined}>
            <span className="jr-dot">{s.done ? <Check /> : <s.icon />}</span>
            <strong>{s.label}</strong>
            <span className="jr-sub">{s.sub || (s.live ? 'Now' : s.current ? 'Next' : '')}</span>
            {s.key === 'wa' && recs.rx && !s.done && <SendRxWhatsApp p={p} rx={recs.rx} className="btn sm primary jr-act" />}
          </li>
        ))}
      </ol>
      <div className="jr-next"><Sparkles size={14} /> {nextHint(steps, recs)}</div>
    </div>
  )
}

// A short written summary of the day's visit, built from the records.
export function aiVisitSummary(p, recs, staff) {
  const { visit, appt, rx, bill } = recs
  const who = `${p.name}${p.dob ? `, ${age(p.dob)} y${p.gender ? `, ${p.gender}` : ''}` : ''}`
  const why = rx?.complaint || visit?.complaint || appt?.reason
  const parts = [`${who} came${why ? ` with ${why.toLowerCase()}` : ''}.`]
  const vt = visit && vitalsText(visit.vitals)
  if (vt) parts.push(`Vitals: ${vt}.`)
  if (rx) {
    const doc = staff(rx.doctorId)?.name
    parts.push(`${doc || 'The doctor'} diagnosed ${rx.diagnosis || 'the problem'}${rx.findings ? ` (${rx.findings})` : ''}.`)
    if (rx.done?.length) parts.push(`Treatment done: ${rx.done.join(', ')}.`)
    if (rx.items?.length) parts.push(`${rx.items.length} medicine${rx.items.length > 1 ? 's' : ''} for up to ${Math.max(...rx.items.map((i) => +i.days || 0))} days (${rx.items.map((i) => i.name).join(', ')}).`)
    if (rx.tests?.length) parts.push(`Tests ordered: ${rx.tests.join(', ')}.`)
  }
  if (bill) {
    const t = billTotal(bill), due = t - (bill.paid || 0)
    parts.push(`Bill ${money(t)}${due > 0 ? `, ${money(due)} still due` : ', fully paid'}.`)
  }
  if (rx?.nextVisit) parts.push(`Next visit on ${fmtDate(rx.nextVisit)}.`)
  else if (p.plan) parts.push(`Treatment plan: ${p.plan.split('\n')[0]}.`)
  return parts.join(' ')
}

export function AiSummary({ p, date }) {
  const { list, staff } = useTenant()
  const recs = dayRecords(list, p.id, date)
  if (!recs.rx && !recs.visit) return null
  return (
    <div className="ai-sum">
      <span className="ai-sum-tag"><Sparkles size={13} /> AI summary</span>
      <p>{aiVisitSummary(p, recs, staff)}</p>
    </div>
  )
}
