import { tenantHost } from '../lib/plans'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Stethoscope, Store, User, ArrowLeft, CalendarCheck, FileHeart, QrCode, MonitorPlay, Receipt, Sparkles } from 'lucide-react'
import { auth } from '../lib/store'
import { useTenant, Input, BrandMark } from '../components/ui'
import { DemoBand } from '../App'

export default function Login() {
  const { tenant, tid, list, staff, patient, can } = useTenant()
  const nav = useNavigate()
  const users = list('users')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  const go = (u) => {
    auth.login(tid, u.id)
    nav(`/t/${tenant.slug}`)
  }
  const submit = (e) => {
    e.preventDefault()
    const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
    if (!u || u.password !== pw) return setErr(tenant.live ? 'That email and password do not match.' : 'That email and password do not match. Every demo account uses the password demo123.')
    if (u.role === 'pharmacist' && !can('pharmacy')) return setErr('Pharmacy is not on this clinic’s plan yet.')
    go(u)
  }

  const quick = [
    { role: 'admin', icon: ShieldCheck, label: 'Admin', sub: 'Full access, billing, staff, plan' },
    { role: 'doctor', icon: Stethoscope, label: 'Doctor', sub: 'Today’s patients, prescriptions' },
    can('pharmacy') && { role: 'pharmacist', icon: Store, label: 'Pharmacist', sub: 'Stock and dispensing' },
    !tenant.live && { role: 'patient', icon: User, label: 'Patient', sub: 'Own records, bills, booking' },
  ].filter(Boolean)

  const who = (u) => (u.role === 'patient' ? patient(u.refId) : staff(u.refId))?.name

  return (
    <>
      <DemoBand />
      <div className="login-wrap login-split">
        <AboutPanel tenant={tenant} />
        <div className="card login-card">
          <div className="row">
            <BrandMark tenant={tenant} />
            <div>
              <h2>{tenant.name}</h2>
              <div className="small muted">{tenantHost(tenant)}</div>
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">{tenant.live ? 'Sign in' : 'One-click demo login'}</span>
            {quick.map((q) => {
              const u = users.find((x) => x.role === q.role)
              if (!u) return null
              return (
                <button key={q.role} className="role-btn" onClick={() => go(u)}>
                  <q.icon />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{q.label}</strong> <span className="muted small">· {who(u)}</span>
                    <div className="small muted">{q.sub}</div>
                  </div>
                </button>
              )
            })}
          </div>
          <form className="stack" style={{ gap: 10 }} onSubmit={submit}>
            <span className="eyebrow">Or sign in with email</span>
            <Input id="login-email" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={users[0].email} />
            <Input id="login-pw" type="password" label="Password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="demo123" />
            {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
            <button className="btn primary" type="submit" style={{ justifyContent: 'center' }}>Sign in</button>
          </form>
          {!tenant.prospect && <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => nav('/')}><ArrowLeft /> All demo clinics</button>}
        </div>
      </div>
    </>
  )
}

// Left side of the sign-in screen: what the app does, in the clinic's own colours.
const FEATURES = [
  [CalendarCheck, 'Appointments & queue', 'Book, check in and see who is next'],
  [FileHeart, 'Prescriptions in one step', 'Medicines, tests and the bill together'],
  [QrCode, 'QR self-registration', 'Patients register from their phone'],
  [MonitorPlay, 'Explain with videos', 'Show and share treatment videos'],
  [Receipt, 'Bills & reports', 'Every record saved to the patient'],
]

function AboutPanel({ tenant }) {
  return (
    <section className="about-panel" aria-label="About this app">
      <span className="about-chip"><Sparkles size={13} /> Debuggers Care</span>
      <h1>Your whole clinic,<br />on one glossy screen.</h1>
      <p>{tenant.name} runs on Debuggers Care: clinic and hospital management by Debuggers Space, made simple for doctors.</p>
      <ul className="about-list">
        {FEATURES.map(([Icon, title, sub], i) => (
          <li key={title} style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
            <span className="about-ic"><Icon /></span>
            <span><strong>{title}</strong><span className="small">{sub}</span></span>
          </li>
        ))}
      </ul>
      <span className="about-foot small">Secure sign-in · Works on any computer, tablet or phone</span>
    </section>
  )
}
