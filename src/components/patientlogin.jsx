// Patient login: the clinic hands each patient a 6-digit PIN; the patient signs in
// with their mobile number and that PIN and sees only their own prescriptions, reports and bills.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, MessageCircle, Copy } from 'lucide-react'
import { Modal, Input, useTenant, toast } from './ui'
import { server } from '../lib/store'
import { tenantHost } from '../lib/plans'
import { whatsappLink } from './videos'

export function PinModal({ p, onClose }) {
  const { tid, tenant } = useTenant()
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const url = `https://${tenantHost(tenant)}`
  const make = async () => {
    setBusy(true)
    setErr('')
    try {
      setPin(await server.setPin(tid, p.id))
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  const msg = `Hello ${p.name.split(' ')[0]}, you can now see your prescriptions and reports from ${tenant.name} online.\n\nOpen ${url}\nTap "I am a patient"\nMobile: ${p.phone}\nPIN: ${pin}\n\nPlease keep this PIN private.`
  const copy = () => navigator.clipboard?.writeText(msg).then(() => toast('Message copied'), () => {})
  return (
    <Modal title={`Patient login · ${p.name}`} onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
      {!tenant.server ? (
        <div className="small muted">Patient login works on a clinic’s own live space. In this demo, use the Patient button on the sign-in page.</div>
      ) : !p.phone ? (
        <div className="small" style={{ color: 'var(--bad)' }}>Add {p.name}’s mobile number first. Patients sign in with their mobile number.</div>
      ) : pin ? (
        <div className="stack">
          <div className="pin-show"><span className="small muted">PIN for {p.phone}</span><b>{pin}</b></div>
          <div className="small muted">Give this PIN to the patient now. It is not shown again; making a new PIN replaces this one.</div>
          <div className="row">
            <a className="btn primary" href={whatsappLink(p.phone, msg)} target="_blank" rel="noreferrer"><MessageCircle /> Send on WhatsApp</a>
            <button className="btn" onClick={copy}><Copy /> Copy message</button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div className="small">{p.name} will sign in at <b>{tenantHost(tenant)}</b> with mobile <b>{p.phone}</b> and a 6-digit PIN, and see only their own prescriptions, reports, X-rays and bills.</div>
          {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={make} disabled={busy}><KeyRound /> {busy ? 'Making PIN…' : 'Make login PIN'}</button>
        </div>
      )}
    </Modal>
  )
}

export function PatientSignIn() {
  const { tid, tenant } = useTenant()
  const nav = useNavigate()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (!/^\d{10}$/.test(phone)) return setErr('Type your 10-digit mobile number.')
    if (!/^\d{6}$/.test(pin)) return setErr('Type the 6-digit PIN the clinic gave you.')
    setBusy(true)
    setErr('')
    try {
      await server.patientLogin(tid, phone, pin)
      nav(`/t/${tenant.slug}`)
    } catch (e2) {
      setErr(e2.message || 'Could not reach the clinic. Check the internet and try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="stack" style={{ gap: 10 }} onSubmit={submit}>
      <div className="small muted">See your prescriptions, reports, X-rays and bills. Ask the clinic for your PIN.</div>
      <Input id="pt-phone" label="Mobile number" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(-10))} placeholder="10 digits" />
      <Input id="pt-pin" label="PIN from the clinic" inputMode="numeric" autoComplete="one-time-code" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits" />
      {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
      <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Opening…' : 'See my records'}</button>
    </form>
  )
}
