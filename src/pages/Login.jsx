import { tenantHost } from '../lib/plans'
import { useEffect, useState } from 'react'
import { PatientSignIn } from '../components/patientlogin'
import { InstallStrip } from '../components/install'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Cpu, Wifi, ShieldCheck, Stethoscope, Store, User, ClipboardList, ArrowLeft, Lock, Clock, MapPin, Phone, GraduationCap, Building2, CalendarCheck, FileHeart, QrCode, MonitorPlay, Receipt, Sparkles } from 'lucide-react'
import { auth, db, server } from '../lib/store'
import { useTenant, Input, PasswordInput, BrandMark, CompanyLink, SiteFooter } from '../components/ui'
import { DemoBand } from '../App'
import { SITES } from '../lib/sites'
import { useOpenNow, slots } from './ClinicSite'

export default function Login() {
  const { tenant, tid, list, staff, patient, can } = useTenant()
  const nav = useNavigate()
  // A clinic on the server lists its staff from the server once it is set up there.
  const srv = tenant.server ? server.info(tid) : null
  const users = srv?.staff?.length ? srv.staff : list('users')
  const needStaff = !!tenant.server && !srv?.staff?.length
  useEffect(() => { if (needStaff) server.refreshStaff(tid) }, [needStaff, tid])
  const [busy, setBusy] = useState(false)
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
    // A clinic's own space has no separate admin: the doctor runs it, the front desk does the rest.
    !tenant.live && { role: 'admin', icon: ShieldCheck, label: 'Admin', sub: 'Full access, billing, staff, plan' },
    { role: 'doctor', icon: Stethoscope, label: 'Doctor', sub: tenant.live ? 'Patients, prescriptions, bills, settings' : 'Today’s patients, prescriptions' },
    tenant.live && { role: 'receptionist', icon: ClipboardList, label: 'Reception', sub: 'Front desk: register patients, appointments, vitals, bills' },
    can('pharmacy') && { role: 'pharmacist', icon: Store, label: 'Pharmacist', sub: 'Stock and dispensing' },
    !tenant.live && { role: 'patient', icon: User, label: 'Patient', sub: 'Own records, bills, booking' },
  ].filter(Boolean)

  // A clinic with two doctors sharing one doctor login shows both names: "Dr. Deepak & Dr. Megha".
  const siteDocs = SITES[tenant.slug]?.doctors?.map((d) => d.name) || []
  const who = (u) => (u.role === 'doctor' && siteDocs.length > 1 ? siteDocs.join(' & ') : u.name || (u.role === 'patient' ? patient(u.refId) : staff(u.refId))?.name)

  // A real clinic: pick who you are, then a password. The first time on a computer, that person sets it.
  const [pick, setPick] = useState(null)
  const [pw2, setPw2] = useState('')
  const typed = pw
  const [ptMode, setPtMode] = useState(false)
  const choose = (u) => { setPick(u); setPtMode(false); setPw(''); setPw2(''); setErr('') }
  const preset = SITES[tenant.slug]?.pwHash
  const needsSetup = !tenant.server && !preset && !pick?.pwHash
  const liveSubmit = async (e) => {
    e.preventDefault()
    // Phones often add a space after autofill; a space is never part of the password.
    const pw = typed.trim()
    if (tenant.server) {
      if (!pw) return setErr('Type the password.')
      setBusy(true)
      try {
        await server.login(tid, pick.id, pw)
        return nav(`/t/${tenant.slug}`)
      } catch (e2) {
        setErr(e2.message || 'Could not reach the server. Check the internet and try again.')
      } finally {
        setBusy(false)
      }
      return
    }
    if (preset) {
      if ((await sha256(`${tenant.slug}:${pw}`)) !== preset) return setErr('That password is not right. Please try again.')
      return go(pick)
    }
    const hash = await sha256(`${tid}:${pick.id}:${pw}`)
    if (needsSetup) {
      if (pw.length < 6) return setErr('Use at least 6 characters.')
      if (pw !== pw2.trim()) return setErr('The two passwords do not match.')
      db.update(tid, 'users', pick.id, { pwHash: hash })
      return go(pick)
    }
    if (hash !== pick.pwHash) return setErr('That password is not right. Please try again.')
    go(pick)
  }

  return (
    <div className="login-page hx">
      <DemoBand />
      <div className="hx-bg" aria-hidden="true"><i className="hx-grid" /><i className="hx-orb a" /><i className="hx-orb b" /><i className="hx-scan" /></div>
      <div className="login-wrap login-split">
        {SITES[tenant.slug] ? <ClinicPanel site={SITES[tenant.slug]} /> : <AboutPanel tenant={tenant} />}
        <div className="card login-card">
          <div className="row">
            <BrandMark tenant={tenant} />
            <div>
              <h2>{SITES[tenant.slug]?.name || tenant.name}</h2>
              <div className="small muted">{tenantHost(tenant)}</div>
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">{tenant.live ? 'Who is signing in?' : 'One-click demo login'}</span>
            <div className="hx-sys">
              <span><i className="hx-dot" /> {tenant.server ? 'Secure server online' : 'Ready'}</span>
              <span><ShieldCheck /> Encrypted</span>
              <span><Sparkles /> AI assistant ready</span>
            </div>
            {quick.map((q) => {
              const u = users.find((x) => x.role === q.role)
              if (!u) return null
              return (
                <button key={q.role} className={`role-btn ${pick?.id === u.id ? 'picked' : ''}`} onClick={() => (tenant.live ? choose(u) : go(u))}>
                  <span className="hx-tile"><q.icon /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{q.label}</strong> <span className="muted small">· {who(u)}</span>
                    <div className="small muted">{q.sub}</div>
                  </div>
                  <ChevronRight className="hx-go" />
                </button>
              )
            })}
            {tenant.server && (
              <button className={`role-btn ${ptMode ? 'picked' : ''}`} onClick={() => { setPtMode(true); setPick(null); setErr('') }}>
                <span className="hx-tile"><User /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>I am a patient</strong>
                  <div className="small muted">My prescriptions, reports and bills</div>
                </div>
                <ChevronRight className="hx-go" />
              </button>
            )}
          </div>
          {ptMode && <PatientSignIn />}
          <InstallStrip who="this phone or computer" />
          {tenant.live && pick && (
            <form className="stack" style={{ gap: 10 }} onSubmit={liveSubmit}>
              <span className="eyebrow"><Lock size={12} style={{ verticalAlign: '-1px' }} /> {needsSetup ? `Set a password for ${who(pick)}` : `Password for ${who(pick)}`}</span>
              {needsSetup && <div className="small muted">First time on this computer. Choose a password; it will be asked every time you sign in.</div>}
              <PasswordInput id="live-pw" label={needsSetup ? 'New password' : 'Password'} autoFocus autoComplete={needsSetup ? 'new-password' : 'current-password'} value={pw} onChange={(e) => setPw(e.target.value)} />
              {needsSetup && <PasswordInput id="live-pw2" label="Type it again" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />}
              {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
              <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Signing in…' : needsSetup ? 'Save password and sign in' : 'Sign in'}</button>
            </form>
          )}
          {!tenant.live && <form className="stack" style={{ gap: 10 }} onSubmit={submit}>
            <span className="eyebrow">Or sign in with email</span>
            <Input id="login-email" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={users[0].email} />
            <PasswordInput id="login-pw" label="Password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="demo123" />
            {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
            <button className="btn primary" type="submit" style={{ justifyContent: 'center' }}>Sign in</button>
          </form>}
          {SITES[tenant.slug] && <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => nav(`/t/${tenant.slug}`)}><ArrowLeft /> Clinic home page</button>}
          {!tenant.prospect && <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => nav('/')}><ArrowLeft /> All demo clinics</button>}
        </div>
      </div>
      <SiteFooter className="login-footer" />
    </div>
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

// A real clinic's own sign-in screen talks about the clinic, not about the software.
function ClinicPanel({ site }) {
  const status = useOpenNow(site.hours)
  const today = site.hours.find(([d]) => d === status.day)?.[1]
  const h = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60000).getHours()
  const hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const docs = site.doctors || [site.doctor]
  const d = docs[0]
  const rows = [
    [Clock, status.text, today ? `Today: ${slots(today)}` : 'Closed today'],
    ...(docs.length > 1
      ? [[Stethoscope, docs.map((x) => x.name).join(' & '), `${d.title}s`]]
      : [[Stethoscope, d.name, `${d.title}${d.years ? ` · ${d.years}+ years` : ''}`],
        [GraduationCap, d.quals[0].replace(/ \(.*\)$/, ''), d.quals.slice(1).join(' · ')]]),
    [MapPin, site.addrLines?.[0] || site.address, site.addrLines?.[1] || site.area],
    [Phone, site.phone, 'Clinic phone'],
  ]
  return (
    <section className="about-panel" aria-label={`About ${site.name}`}>
      <div className="about-brand hx-top">
        <span className="about-chip"><Building2 size={13} /> {site.name}</span>
        <span className="about-chip hx-ai"><Cpu size={13} /> AI powered clinical management</span>
      </div>
      <LiveClock />
      <h1>{hello},<br /><span className="hx-grad">welcome to the clinic.</span></h1>
      <p>Sign in to see today’s patients, appointments and bills. Your AI assistant is ready to book, register and write prescriptions.</p>
      <ul className="about-list">
        {rows.map(([Icon, title, sub], i) => (
          <li key={title} style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
            <span className="about-ic"><Icon /></span>
            <span><strong>{title}</strong><span className="small">{sub}</span></span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AboutPanel({ tenant }) {
  return (
    <section className="about-panel" aria-label="About this app">
      <div className="about-brand">
        <span className="about-chip"><Sparkles size={13} /> Clinic and Hospital Management System</span>
        <span className="about-by small">by <CompanyLink /></span>
      </div>
      <LiveClock />
      <h1>Your whole clinic,<br /><span className="hx-grad">on one AI powered screen.</span></h1>
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

// India time, ticking, for the high-tech sign-in screen.
function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  const opt = { timeZone: 'Asia/Kolkata' }
  const time = now.toLocaleTimeString('en-IN', { ...opt, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const date = now.toLocaleDateString('en-IN', { ...opt, weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="hx-clock" aria-label={`${date}, ${time}`}>
      <strong>{time}</strong>
      <span><Wifi size={13} /> {date} · IST</span>
    </div>
  )
}
