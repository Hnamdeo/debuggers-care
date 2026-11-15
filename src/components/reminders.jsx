import { BellRing, Check, MessageCircle } from 'lucide-react'
import { useTenant, Card } from './ui'
import { whatsappLink } from './videos'
import { db } from '../lib/store'
import { SITES } from '../lib/sites'
import { today, addDays, fmtDate, fmtTime } from '../lib/utils'

const okPhone = (p) => /^\d{10}$/.test(p?.phone || '')
const dayWord = (d) => (d === today() ? 'today' : d === addDays(today(), 1) ? 'tomorrow' : `on ${fmtDate(d)}`)
const dayHindi = (d) => (d === today() ? 'आज' : d === addDays(today(), 1) ? 'कल' : fmtDate(d))

// Hindi + English message, so one text works for every patient.
export function reminderText(tenant, p, a, doctor, kind = 'reminder') {
  const site = SITES[tenant.slug]
  const clinic = site?.name || tenant.name
  const first = (p?.name || '').split(' ')[0]
  const near = a.date === today() || a.date === addDays(today(), 1)
  const when = `${dayWord(a.date)}${near ? ` (${fmtDate(a.date)})` : ''} at ${fmtTime(a.time)}`
  const en = kind === 'booked'
    ? `Hello ${first}, your appointment at ${clinic} is booked ${when}${doctor ? ` with ${doctor.name}` : ''}.`
    : `Hello ${first}, a reminder of your appointment at ${clinic} ${when}${doctor ? ` with ${doctor.name}` : ''}.`
  const hi = kind === 'booked'
    ? `नमस्ते ${first}, ${clinic} में आपका अपॉइंटमेंट ${dayHindi(a.date)} ${fmtTime(a.time)} बजे बुक हो गया है।`
    : `नमस्ते ${first}, याद दिला दें: ${clinic} में आपका अपॉइंटमेंट ${dayHindi(a.date)} ${fmtTime(a.time)} बजे है।`
  const tail = [
    site?.address ? `📍 ${site.address}` : '',
    site?.phone ? `📞 ${site.phone}` : '',
    'Please reply if you need to change the time. समय बदलना हो तो जवाब दें।',
  ].filter(Boolean).join('\n')
  return `${en}\n${hi}\n\n${tail}`
}

// Opens WhatsApp with the message ready; the staff member just presses Send. Marks the appointment as reminded.
export function RemindButton({ a, kind = 'reminder', label, small = true }) {
  const { tid, tenant, patient, staff } = useTenant()
  const p = patient(a.patientId)
  if (!okPhone(p)) return null
  const sent = kind === 'reminder' && a.remindedAt
  const href = whatsappLink(p.phone, reminderText(tenant, p, a, staff(a.doctorId), kind))
  const mark = () => { if (kind === 'reminder') db.update(tid, 'appointments', a.id, { remindedAt: new Date().toISOString() }) }
  return (
    <a className={`btn ${small ? 'sm' : ''} ${sent ? '' : 'primary'}`} href={href} target="_blank" rel="noreferrer" onClick={mark} title="Opens WhatsApp with the message ready">
      {sent ? <Check /> : <MessageCircle />} {label || (sent ? 'Reminded' : 'Remind')}
    </a>
  )
}

// Dashboard card: tomorrow's appointments (and today's still to come) that still need a WhatsApp reminder.
export function ReminderCard({ doctorId }) {
  const { list, patient, staff, doctors } = useTenant()
  const T = today(), TM = addDays(T, 1)
  const nowHM = new Date().toTimeString().slice(0, 5)
  const due = list('appointments')
    .filter((a) => a.status === 'scheduled' && (!doctorId || a.doctorId === doctorId))
    .filter((a) => a.date === TM || (a.date === T && a.time > nowHM))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  if (!due.length) return null
  const left = due.filter((a) => !a.remindedAt).length
  const many = doctors().length > 1 && !doctorId
  return (
    <Card title={<h2><BellRing size={17} style={{ verticalAlign: '-3px' }} /> Appointment reminders</h2>} actions={<span className="small muted">{left ? `${left} to send` : 'All sent'}</span>}>
      <div className="small muted" style={{ marginBottom: 8 }}>Tap Remind: WhatsApp opens with the message ready in Hindi and English. Press Send there.</div>
      {due.map((a) => {
        const p = patient(a.patientId)
        return (
          <div key={a.id} className="vid-row">
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontWeight: 600 }}>{p?.name || a.patientId}</div>
              <div className="small muted">{a.date === T ? 'Today' : 'Tomorrow'} {fmtTime(a.time)}{many ? ` · ${staff(a.doctorId)?.name}` : ''}{okPhone(p) ? '' : ' · no mobile number'}</div>
            </div>
            <RemindButton a={a} />
          </div>
        )
      })}
    </Card>
  )
}
