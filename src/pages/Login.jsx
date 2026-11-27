import { tenantHost } from '../lib/plans'
import { useEffect, useState } from 'react'
import { PatientSignIn } from '../components/patientlogin'
import { InstallButton } from '../components/install'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ShieldCheck, Stethoscope, Store, User, ClipboardList, ArrowLeft, Lock, Clock, MapPin, Phone, CalendarCheck, FileHeart, QrCode, MonitorPlay, Receipt } from 'lucide-react'
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

  const site = SITES[tenant.slug]
  const pwForm = tenant.live && pick && (
    <form className="stack ls-pw" style={{ gap: 10 }} onSubmit={liveSubmit}>
      {needsSetup && <div className="small muted">First time on this computer. Choose a password; it will be asked every time you sign in.</div>}
      <PasswordInput id="live-pw" label={needsSetup ? "New password" : "Password"} autoFocus autoComplete={needsSetup ? 'new-password' : 'current-password'} value={pw} onChange={(e) => setPw(e.target.value)} />
      {needsSetup && <PasswordInput id="live-pw2" label="Type it again" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />}
      {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
      <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}><Lock /> {busy ? 'Signing in…' : needsSetup ? 'Save password and sign in' : 'Sign in'}</button>
    </form>
  )

  return (
    <div className="login-page ls">
      <DemoBand />
      <div className="ls-wrap">
        {site ? <ClinicPanel site={site} /> : <AboutPanel tenant={tenant} />}
        <div className="ls-card">
          <div className="ls-head">
            <BrandMark tenant={tenant} />
            <div style={{ minWidth: 0 }}>
              <h2>{site?.name || tenant.name}</h2>
              <div className="small muted">{tenant.live ? 'Sign in to continue' : 'Demo · one-click sign in, sample data only'}</div>
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span className="ls-label">Sign in as</span>
            {quick.map((q) => {
              const u = users.find((x) => x.role === q.role)
              if (!u) return null
              const on = pick?.id === u.id
              return (
                <div key={q.role} className="stack" style={{ gap: 8 }}>
                  <button className={`role-btn ls-role ${on ? 'picked' : ''}`} onClick={() => (tenant.live ? choose(u) : go(u))}>
                    <q.icon />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>{q.label}</strong>
                      <div className="small muted">{who(u)}</div>
                    </div>
                    <ChevronRight className="ls-go" />
                  </button>
                  {on && pwForm}
                </div>
              )
            })}
            {tenant.server && (
              <button className={`role-btn ls-role ${ptMode ? 'picked' : ''}`} onClick={() => { setPtMode(true); setPick(null); setErr('') }}>
                <User />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>Patient</strong>
                  <div className="small muted">My prescriptions, reports and bills</div>
                </div>
                <ChevronRight className="ls-go" />
              </button>
            )}
            {ptMode && <PatientSignIn />}
          </div>
          {!tenant.live && <form className="stack" style={{ gap: 10 }} onSubmit={submit}>
            <span className="ls-label">Or sign in with email</span>
            <Input id="login-email" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={users[0].email} />
            <PasswordInput id="login-pw" label="Password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="demo123" />
            {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
            <button className="btn primary" type="submit" style={{ justifyContent: 'center' }}>Sign in</button>
          </form>}
          <div className="ls-links">
            {site && <button className="btn ghost sm" onClick={() => nav(`/t/${tenant.slug}`)}><ArrowLeft /> Clinic home page</button>}
            {!tenant.prospect && <button className="btn ghost sm" onClick={() => nav('/')}><ArrowLeft /> All demo clinics</button>}
            <InstallButton className="btn ghost sm" />
          </div>
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
  const docs = site.doctors || [site.doctor]
  const rows = [
    [Stethoscope, docs.map((x) => x.name).join(' & '), docs.length > 1 ? `${docs[0].title}s` : docs[0].title],
    [Clock, today ? `Today ${slots(today)}` : 'Closed today', status.text],
    [MapPin, site.addrLines?.[0] || site.address, site.addrLines?.[1] || site.area],
    [Phone, site.phone, 'Clinic phone'],
  ]
  return (
    <section className="ls-panel" aria-label={`About ${site.name}`}>
      <h1>{site.name}</h1>
      <ul className="ls-list">
        {rows.filter(([, t]) => t).map(([Icon, title, sub]) => (
          <li key={title}><Icon /><span><strong>{title}</strong>{sub && <span>{sub}</span>}</span></li>
        ))}
      </ul>
      <span className="ls-note">Clinic management · patients, appointments, prescriptions and bills</span>
    </section>
  )
}

function AboutPanel({ tenant }) {
  return (
    <section className="ls-panel" aria-label="About this app">
      <h1>{tenant.name}</h1>
      <p>Clinic and Hospital Management System</p>
      <ul className="ls-list">
        {FEATURES.map(([Icon, title, sub]) => (
          <li key={title}><Icon /><span><strong>{title}</strong><span>{sub}</span></span></li>
        ))}
      </ul>
      <span className="ls-note">by <CompanyLink /></span>
    </section>
  )
}
