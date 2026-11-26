// Patient login: the clinic hands each patient a 6-digit PIN; the patient signs in
// with their mobile number and that PIN and sees only their own prescriptions, reports and bills.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, MessageCircle, Copy, Mail, User } from 'lucide-react'
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
  const msg = `Hello ${p.name.split(' ')[0]}, you can now see your prescriptions and reports from ${tenant.name} online.\n\nOpen ${url}\nTap "I am a patient"\nMobile: ${p.phone}\nPIN: ${pin}\n${p.email ? `\nOr tap "Code on email" and use your mobile and ${p.email}; we email you a code.\n` : ''}\nPlease keep this PIN private.`
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
          <div className="small muted">{p.email ? <>No PIN needed if they prefer: they can choose “Code on email” and sign in with this mobile and <b>{p.email}</b>.</> : 'Tip: add their email to the file and they can sign in with a code sent to their email, no PIN needed.'}</div>
          {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={make} disabled={busy}><KeyRound /> {busy ? 'Making PIN…' : 'Make login PIN'}</button>
        </div>
      )}
    </Modal>
  )
}

export function PatientSignIn() {
  const [how, setHow] = useState('email')
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="seg" role="radiogroup" aria-label="How do you want to sign in?">
        <button type="button" role="radio" aria-checked={how === 'email'} className={how === 'email' ? 'on' : ''} onClick={() => setHow('email')}><Mail size={14} /> Code on email</button>
        <button type="button" role="radio" aria-checked={how === 'pin'} className={how === 'pin' ? 'on' : ''} onClick={() => setHow('pin')}><KeyRound size={14} /> PIN from clinic</button>
      </div>
      {how === 'email' ? <EmailSignIn /> : <PinSignIn />}
    </div>
  )
}

function EmailSignIn() {
  const { tid, tenant } = useTenant()
  const nav = useNavigate()
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [choose, setChoose] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const run = async (fn) => {
    setBusy(true)
    setErr('')
    try { await fn() } catch (e) { setErr(e.message || 'Could not reach the clinic. Check the internet and try again.') } finally { setBusy(false) }
  }
  const send = (e) => {
    e?.preventDefault()
    if (!/^\d{10}$/.test(phone)) return setErr('Type your 10-digit mobile number.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr('Type the email you gave the clinic, for example name@gmail.com.')
    run(async () => { setSentTo(await server.patientCode(tid, phone, email.trim())); setCode('') })
  }
  const verify = (e, pid = '') => {
    e?.preventDefault()
    if (!/^\d{6}$/.test(code)) return setErr('Type the 6-digit code from the email.')
    run(async () => {
      const res = await server.patientVerify(tid, phone, email.trim(), code, pid)
      if (res.choose) return setChoose(res.choose)
      nav(`/t/${tenant.slug}`)
    })
  }
  if (choose) return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="small">This mobile and email are on more than one file. Whose records do you want to see?</div>
      {choose.map((c) => <button key={c.id} className="btn" disabled={busy} style={{ justifyContent: 'flex-start' }} onClick={() => verify(null, c.id)}><User size={14} /> {c.name}</button>)}
      {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
    </div>
  )
  return sentTo ? (
    <form className="stack" style={{ gap: 10 }} onSubmit={verify}>
      <div className="small">We sent a 6-digit code to <b>{sentTo}</b>. It works for 10 minutes. Check Spam or Promotions if you don’t see it.</div>
      <Input id="pt-code" label="Code from the email" className="input code-input" inputMode="numeric" autoComplete="one-time-code" autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" />
      {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
      <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Opening…' : 'See my records'}</button>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn ghost sm" onClick={() => { setSentTo(''); setErr('') }}>Change number or email</button>
        <button type="button" className="btn ghost sm" disabled={busy} onClick={send}>Send a new code</button>
      </div>
    </form>
  ) : (
    <form className="stack" style={{ gap: 10 }} onSubmit={send}>
      <div className="small muted">Use the mobile number and email (Gmail) you gave the clinic. We email you a code; you see only your own prescriptions, reports and bills.</div>
      <Input id="pt-phone" label="Mobile number" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(-10))} placeholder="10 digits" />
      <Input id="pt-email" label="Email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" />
      {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
      <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}><Mail size={15} /> {busy ? 'Sending…' : 'Email me a code'}</button>
    </form>
  )
}

function PinSignIn() {
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
