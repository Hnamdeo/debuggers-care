// Appointments patients ask for on the clinic's website wait as "requested" until the clinic confirms.
// Staff see them here, confirm or decline in one tap, and WhatsApp opens with the message for the patient.
import { useEffect, useRef } from 'react'
import { Globe, Check, X, Phone } from 'lucide-react'
import { useTenant, Card, toast } from './ui'
import { db } from '../lib/store'
import { today, fmtDate, fmtTime } from '../lib/utils'
import { whatsappLink } from './videos'

export const isRequest = (a) => a.status === 'requested'

export function useRequests(doctorId) {
  const { list } = useTenant()
  return list('appointments')
    .filter((a) => isRequest(a) && a.date >= today() && (!doctorId || a.doctorId === doctorId))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
}

export function confirmText(a, p, doc, tenant) {
  return `Hello ${p?.name?.split(' ')[0] || ''}, your appointment at ${tenant.name} is confirmed for ${fmtDate(a.date)} at ${fmtTime(a.time)}${doc ? ` with ${doc.name}` : ''}. Please come 10 minutes early. To change it, reply here or call ${tenant.phone || 'the clinic'}.`
}
export function declineText(a, p, tenant) {
  return `Hello ${p?.name?.split(' ')[0] || ''}, thank you for booking with ${tenant.name}. Sorry, ${fmtDate(a.date)} at ${fmtTime(a.time)} is not available. Please reply with another day or time that suits you, or call ${tenant.phone || 'the clinic'}.`
}

export function respond(tid, a, p, doc, tenant, yes) {
  db.update(tid, 'appointments', a.id, yes ? { status: 'scheduled', confirmedAt: new Date().toISOString() } : { status: 'declined', declinedAt: new Date().toISOString() })
  toast(`${p?.name || 'Patient'}: ${yes ? 'confirmed' : 'declined'}. WhatsApp opens with the message.`)
  if (/^\d{10}$/.test(p?.phone || '')) window.open(whatsappLink(p.phone, yes ? confirmText(a, p, doc, tenant) : declineText(a, p, tenant)), '_blank', 'noopener')
}

export function BookingRequests({ doctorId }) {
  const { tid, list, tenant } = useTenant()
  const reqs = useRequests(doctorId)
  if (!reqs.length) return null
  const patient = (id) => list('patients').find((p) => p.id === id)
  const staff = (id) => list('staff').find((s) => s.id === id)
  return (
    <Card className="req-card" title={<h2 className="row" style={{ gap: 8 }}><Globe size={18} /> Website booking requests <span className="req-count">{reqs.length}</span></h2>}
      actions={<>{typeof Notification !== 'undefined' && Notification.permission === 'default' && <button className="btn sm ghost" onClick={() => Notification.requestPermission()}>Alert me on this device</button>}<span className="small muted">Confirm, and WhatsApp opens with the message for the patient</span></>}>
      <div className="req-list">
        {reqs.map((a) => {
          const p = patient(a.patientId)
          const doc = staff(a.doctorId)
          return (
            <div key={a.id} className="req-row">
              <div className="req-when"><strong>{fmtTime(a.time)}</strong><span className="small muted">{a.date === today() ? 'Today' : fmtDate(a.date)}</span></div>
              <div className="req-who">
                <strong>{p?.name || a.patientId}</strong>
                <span className="small muted">{[p?.phone, a.reason, doc?.name].filter(Boolean).join(' · ')}{p?.regDate === a.requestedAt?.slice(0, 10) ? ' · new patient' : ''}</span>
              </div>
              <div className="req-act">
                {p?.phone && <a className="btn sm ghost" href={`tel:${p.phone}`} aria-label={`Call ${p.name}`}><Phone /></a>}
                <button className="btn sm ghost danger" onClick={() => respond(tid, a, p, doc, tenant, false)}><X /> Decline</button>
                <button className="btn sm primary" onClick={() => respond(tid, a, p, doc, tenant, true)}><Check /> Confirm</button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// A toast (and a phone/computer notification, if allowed) when a new website request arrives.
export function BookingAlert() {
  const { tenant } = useTenant()
  const reqs = useRequests()
  const seen = useRef(null)
  useEffect(() => {
    const ids = reqs.map((a) => a.id)
    if (seen.current) {
      const fresh = ids.filter((id) => !seen.current.has(id))
      if (fresh.length) {
        const msg = `${fresh.length === 1 ? 'New appointment request' : `${fresh.length} new appointment requests`} from the website`
        toast(msg)
        try { if (window.Notification?.permission === 'granted') new Notification(tenant.name, { body: `${msg}. Open Appointments to confirm.` }) } catch { /* not supported */ }
      }
    }
    seen.current = new Set(ids)
  }, [reqs.map((a) => a.id).join(), tenant.name]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
