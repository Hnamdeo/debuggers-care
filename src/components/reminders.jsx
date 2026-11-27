import { useEffect, useState } from 'react'
import { BellRing, Check, MessageCircle, MessageSquareText, Send } from 'lucide-react'
import { useTenant, Card, Modal, toast } from './ui'
import { whatsappLink } from './videos'
import { db, server } from '../lib/store'
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
  const en = kind === 'moved'
    ? `Hello ${first}, your appointment at ${clinic} has been moved to ${when}${doctor ? ` with ${doctor.name}` : ''}.`
    : kind === 'booked'
    ? `Hello ${first}, your appointment at ${clinic} is booked ${when}${doctor ? ` with ${doctor.name}` : ''}.`
    : `Hello ${first}, a reminder of your appointment at ${clinic} ${when}${doctor ? ` with ${doctor.name}` : ''}.`
  const hi = kind === 'moved'
    ? `नमस्ते ${first}, ${clinic} में आपका अपॉइंटमेंट अब ${dayHindi(a.date)} ${fmtTime(a.time)} बजे है।`
    : kind === 'booked'
    ? `नमस्ते ${first}, ${clinic} में आपका अपॉइंटमेंट ${dayHindi(a.date)} ${fmtTime(a.time)} बजे बुक हो गया है।`
    : `नमस्ते ${first}, याद दिला दें: ${clinic} में आपका अपॉइंटमेंट ${dayHindi(a.date)} ${fmtTime(a.time)} बजे है।`
  const tail = [
    a.room ? `🎥 Video consult: join here at the time / इस लिंक से वीडियो कॉल पर जुड़ें:\n${a.room}` : '',
    !a.room && site?.address ? `📍 ${site.address}` : '',
    site?.phone ? `📞 ${site.phone}` : '',
    'Please reply if you need to change the time. समय बदलना हो तो जवाब दें।',
  ].filter(Boolean).join('\n')
  return `${en}\n${hi}\n\n${tail}`
}

// SMS for patients without WhatsApp: opens the phone's messages app with the text ready (Phone Link on a Windows laptop).
export const smsLink = (phone, text) => `sms:+91${phone}?&body=${encodeURIComponent(text)}`

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

// WhatsApp and SMS side by side. Either one marks a reminder as sent.
export function NotifyButtons({ a, kind = 'reminder', small = true, wide }) {
  const { tid, tenant, patient, staff } = useTenant()
  const p = patient(a.patientId)
  if (!okPhone(p)) return null
  const text = reminderText(tenant, p, a, staff(a.doctorId), kind)
  const sent = kind === 'reminder' && a.remindedAt
  const mark = (via) => () => { if (kind === 'reminder') db.update(tid, 'appointments', a.id, { remindedAt: new Date().toISOString(), remindedVia: via }) }
  const sz = small ? 'sm' : ''
  return (
    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
      <a className={`btn ${sz} ${sent ? '' : 'primary'}`} href={whatsappLink(p.phone, text)} target="_blank" rel="noreferrer" onClick={mark('whatsapp')} title="Opens WhatsApp with the message ready">
        {sent ? <Check /> : <MessageCircle />} {wide ? 'WhatsApp' : sent ? 'Reminded' : 'WhatsApp'}
      </a>
      <a className={`btn ${sz}`} href={smsLink(p.phone, text)} onClick={mark('sms')} title="Text message for patients without WhatsApp">
        <MessageSquareText /> SMS
      </a>
    </span>
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
  const left = due.filter((a) => !a.remindedAt).length
  const many = doctors().length > 1 && !doctorId
  return (
    <Card title={<h2><BellRing size={17} style={{ verticalAlign: '-3px' }} /> Appointment reminders</h2>} actions={<span className="small muted">{!due.length ? '' : left ? `${left} to send` : 'All sent'}</span>}>
      {!due.length && <div className="small muted">No appointments booked for the rest of today or tomorrow. When you book one, it shows here with WhatsApp and SMS reminder buttons.</div>}
      {due.length > 0 && <div className="small muted" style={{ marginBottom: 8 }}>Tap WhatsApp, or SMS for patients without WhatsApp. The message opens ready in Hindi and English; press Send there.</div>}
      {due.map((a) => {
        const p = patient(a.patientId)
        return (
          <div key={a.id} className="vid-row">
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontWeight: 600 }}>{p?.name || a.patientId}</div>
              <div className="small muted">{a.date === T ? 'Today' : 'Tomorrow'} {fmtTime(a.time)}{many ? ` · ${staff(a.doctorId)?.name}` : ''}{okPhone(p) ? '' : ' · no mobile number'}{a.remindedVia === 'auto' ? ' · sent automatically' : a.autoError ? ' · automatic WhatsApp failed, send by hand' : ''}</div>
            </div>
            <NotifyButtons a={a} />
          </div>
        )
      })}
    </Card>
  )
}

// Reminders for a set of appointments (a whole day, or one slot). One tap per patient on WhatsApp or SMS,
// or, when the clinic's WhatsApp Business is connected, everyone at once from the clinic number.
export function RemindModal({ appts, title, onClose }) {
  const { tid, patient, staff, doctors } = useTenant()
  const [auto, setAuto] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!db.onServer(tid)) return
    server.whatsapp(tid).then((r) => setAuto(!!r.wa?.enabled)).catch(() => {})
  }, [tid])
  const left = appts.filter((a) => !a.remindedAt && okPhone(patient(a.patientId)))
  const many = doctors().length > 1
  const { tenant } = useTenant()
  // Without the Business API a browser can open only one WhatsApp chat per tap, so "all" goes patient by patient:
  // each tap opens the next patient's chat with the message ready and marks them reminded.
  const [queue, setQueue] = useState(null)
  const nextUp = queue && queue.find((id) => !appts.find((a) => a.id === id)?.remindedAt)
  const openNext = () => {
    const ids = queue || left.map((a) => a.id)
    if (!queue) setQueue(ids)
    const a = appts.find((x) => x.id === ids.find((id) => !appts.find((y) => y.id === id)?.remindedAt))
    if (!a) return
    const p = patient(a.patientId)
    window.open(whatsappLink(p.phone, reminderText(tenant, p, a, staff(a.doctorId))), '_blank', 'noopener')
    db.update(tid, 'appointments', a.id, { remindedAt: new Date().toISOString(), remindedVia: 'whatsapp' })
  }
  const total = queue ? queue.length : left.length
  const doneN = queue ? queue.filter((id) => appts.find((a) => a.id === id)?.remindedAt).length : 0
  const nextP = nextUp ? patient(appts.find((a) => a.id === nextUp)?.patientId) : left[0] && patient(left[0].patientId)
  const sendAll = async () => {
    setBusy(true)
    try {
      const r = await server.whatsappSend(tid, left.map((a) => a.id))
      toast(`WhatsApp sent to ${r.sent} ${r.sent === 1 ? 'patient' : 'patients'}${r.failed.length ? `. Not sent: ${r.failed.join('; ')}` : ''}`)
    } catch (err) { toast(err.message || 'Could not send') } finally { setBusy(false) }
  }
  return (
    <Modal title={title || 'Send reminders'} wide onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Close</button>
      {auto && left.length > 0 && <button className="btn primary" disabled={busy} onClick={sendAll}><Send /> {busy ? 'Sending…' : `Send reminder to all ${left.length} patients`}</button>}
      {!auto && (left.length > 0 || queue) && (
        queue && !nextUp
          ? <span className="pill ok">All {total} reminded</span>
          : <button className="btn primary" onClick={openNext}><Send /> {!queue ? `Send reminder to all ${total} patients` : `Next: ${nextP?.name?.split(' ')[0] || 'patient'} (${doneN + 1} of ${total})`}</button>
      )}
    </>}>
      {!appts.length && <div className="empty">No booked patients to remind.</div>}
      {appts.length > 0 && (
        <div className="small muted">
          {auto
            ? 'Send to everyone at once from the clinic’s WhatsApp Business number, or one by one below.'
            : 'Press “Send reminder to all”: WhatsApp opens for each patient in turn with the message ready in Hindi and English. Press Send there, come back and tap Next. Use SMS for patients without WhatsApp. To send to everyone automatically in one click, connect the clinic’s WhatsApp Business in Plan & settings.'}
        </div>
      )}
      {appts.map((a) => {
        const p = patient(a.patientId)
        return (
          <div key={a.id} className="vid-row">
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 600 }}>{fmtTime(a.time)} · {p?.name || a.patientId}</div>
              <div className="small muted">{fmtDate(a.date)}{many ? ` · ${staff(a.doctorId)?.name}` : ''}{okPhone(p) ? ` · ${p.phone}` : ' · no mobile number'}{a.remindedAt ? (a.remindedVia === 'auto' ? ' · sent from clinic WhatsApp' : ' · reminded') : ''}{a.autoError ? ' · auto send failed' : ''}</div>
            </div>
            <NotifyButtons a={a} />
          </div>
        )
      })}
    </Modal>
  )
}
