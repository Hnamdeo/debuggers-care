import { tenantHost } from '../lib/plans'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Stethoscope, Store, User, ArrowLeft, Lock, CalendarCheck, FileHeart, QrCode, MonitorPlay, Receipt, Sparkles } from 'lucide-react'
import { auth, db } from '../lib/store'
import { useTenant, Input, BrandMark, CompanyLink, SiteFooter } from '../components/ui'
import { DemoBand } from '../App'
import { SITES } from '../lib/sites'

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

  // A real clinic: pick who you are, then a password. The first time on a computer, that person sets it.
  const [pick, setPick] = useState(null)
  const [pw2, setPw2] = useState('')
  const choose = (u) => { setPick(u); setPw(''); setPw2(''); setErr('') }
  const preset = SITES[tenant.slug]?.pwHash
  const needsSetup = !preset && !pick?.pwHash
  const liveSubmit = async (e) => {
    e.preventDefault()
    if (preset) {
      if ((await sha256(`${tenant.slug}:${pw}`)) !== preset) return setErr('That password is not right. Please try again.')
      return go(pick)
    }
    const hash = await sha256(`${tid}:${pick.id}:${pw}`)
    if (needsSetup) {
      if (pw.length < 6) return setErr('Use at least 6 characters.')
      if (pw !== pw2) return setErr('The two passwords do not match.')
      db.update(tid, 'users', pick.id, { pwHash: hash })
      return go(pick)
    }
    if (hash !== pick.pwHash) return setErr('That password is not right. Please try again.')
    go(pick)
  }

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
            <span className="eyebrow">{tenant.live ? 'Who is signing in?' : 'One-click demo login'}</span>
            {quick.map((q) => {
              const u = users.find((x) => x.role === q.role)
              if (!u) return null
              return (
                <button key={q.role} className={`role-btn ${pick?.id === u.id ? 'picked' : ''}`} onClick={() => (tenant.live ? choose(u) : go(u))}>
                  <q.icon />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{q.label}</strong> <span className="muted small">· {who(u)}</span>
                    <div className="small muted">{q.sub}</div>
                  </div>
                </button>
              )
            })}
          </div>
          {tenant.live && pick && (
            <form className="stack" style={{ gap: 10 }} onSubmit={liveSubmit}>
              <span className="eyebrow"><Lock size={12} style={{ verticalAlign: '-1px' }} /> {needsSetup ? `Set a password for ${who(pick)}` : `Password for ${who(pick)}`}</span>
              {needsSetup && <div className="small muted">First time on this computer. Choose a password; it will be asked every time you sign in.</div>}
              <Input id="live-pw" type="password" label={needsSetup ? 'New password' : 'Password'} autoFocus autoComplete={needsSetup ? 'new-password' : 'current-password'} value={pw} onChange={(e) => setPw(e.target.value)} />
              {needsSetup && <Input id="live-pw2" type="password" label="Type it again" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />}
              {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
              <button className="btn primary" type="submit" style={{ justifyContent: 'center' }}>{needsSetup ? 'Save password and sign in' : 'Sign in'}</button>
            </form>
          )}
          {!tenant.live && <form className="stack" style={{ gap: 10 }} onSubmit={submit}>
            <span className="eyebrow">Or sign in with email</span>
            <Input id="login-email" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={users[0].email} />
            <Input id="login-pw" type="password" label="Password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="demo123" />
            {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
            <button className="btn primary" type="submit" style={{ justifyContent: 'center' }}>Sign in</button>
          </form>}
          {SITES[tenant.slug] && <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => nav(`/t/${tenant.slug}`)}><ArrowLeft /> Clinic home page</button>}
          {!tenant.prospect && <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => nav('/')}><ArrowLeft /> All demo clinics</button>}
        </div>
      </div>
      <SiteFooter className="login-footer" />
    </>
  )
}

// Passwords are kept only as a salted SHA-256 hash, never as text.
async function sha256(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
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
      <div className="about-brand">
        <span className="about-chip"><Sparkles size={13} /> Clinic and Hospital Management System</span>
        <span className="about-by small">by <CompanyLink /></span>
      </div>
      <h1>Your whole clinic,<br />on one glossy screen.</h1>
      <p>Everything {tenant.name} needs, in one place. Made simple for doctors.</p>
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
