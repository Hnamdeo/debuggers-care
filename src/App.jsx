import { withHealthVideos } from './lib/healthvideos'
import { useEffect, useMemo, useState } from 'react'
import { RouteScan } from './components/toothscan'
import { HashRouter, MemoryRouter, Routes, Route, Navigate, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, Pill as PillIcon, FlaskConical, BedDouble, Siren, Store, Receipt, IdCard, Wallet, Settings as SettingsIcon,
  Lock, LogOut, Menu, MonitorPlay, Stethoscope, CalendarPlus, FileHeart, Sparkles, BarChart3, PiggyBank, Globe, Sun, Moon,
  Briefcase, FlaskRound, Boxes, Scissors, ShieldCheck,
} from 'lucide-react'
import { LabWorkPage, MaterialsPage } from './components/dentalplus'
import { OTPage, ClaimsPage } from './components/hospitalplus'
import { AppBar } from './components/appbar'
import { useLook } from './lib/look'
import { db, auth, useDb, server } from './lib/store'
import { hasModule, ROLE_MODULES, ROLE_LABEL, PLANS, planFor, MODULES } from './lib/plans'
import { TenantCtx, Toaster, Celebration, Avatar, useTenant, BrandMark, tenantStyle, SiteFooter } from './components/ui'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients, { PatientProfile } from './pages/Patients'
import Appointments from './pages/Appointments'
import Consult from './pages/Consult'
import Prescriptions from './pages/Prescriptions'
import Reports from './pages/Reports'
import IPD from './pages/IPD'
import Emergency from './pages/Emergency'
import Pharmacy from './pages/Pharmacy'
import Billing from './pages/Billing'
import Staff from './pages/Staff'
import Payroll from './pages/Payroll'
import Settings from './pages/Settings'
import { PatientHome, PatientBook, PatientAppointments, PatientBills } from './pages/PatientPortal'
import Locked from './pages/Locked'
import Leads from './pages/Leads'
import Education from './pages/Education'
import SelfRegister from './pages/SelfRegister'
import ClinicSite from './pages/ClinicSite'
import Smile from './pages/Smile'
import Analytics from './pages/Analytics'
import Expenses from './pages/Expenses'
import { NotesFab } from './components/notes'
import { Assistant } from './components/assistant'
import { SITES } from './lib/sites'

const ICONS = { dashboard: LayoutDashboard, patients: Users, appointments: CalendarDays, prescriptions: PillIcon, reports: FlaskConical, education: MonitorPlay, ipd: BedDouble, emergency: Siren, pharmacy: Store, billing: Receipt, staff: IdCard, payroll: Wallet }

const Router = import.meta.env.MODE === 'single' ? MemoryRouter : HashRouter

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/t/:slug/*" element={<TenantApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <Celebration />
    </Router>
  )
}

// Open a clinic straight from its own address:
//   drmourya-care.debuggersspace.com   (current format, works on shared hosting)
//   drmourya.care.debuggersspace.com   (nested format, for phase 2 on a VPS)
//   care.debuggersspace.com/drmourya   (path format, needs no DNS at all)
// In phase 2 the backend resolves the tenant from the Host header the same way.
function hostTenantSlug() {
  const h = window.location.hostname.toLowerCase()
  const m = h.match(/^([a-z0-9]+)-care\./) || h.match(/^([a-z0-9-]+)\.care\./)
  const seg = window.location.pathname.split('/').filter(Boolean)[0]?.toLowerCase()
  for (const slug of [m?.[1], seg]) if (slug && db.tenantBySlug(slug)) return slug
  return null
}
function Home() {
  const slug = hostTenantSlug()
  return slug ? <Navigate to={`/t/${slug}`} replace /> : <Landing />
}

function useTenantValue(slug) {
  const state = useDb()
  return useMemo(() => {
    const tenant = db.tenantBySlug(slug)
    if (!tenant) return null
    const tid = tenant.id
    const user = auth.current(tid)
    const list = (c) => c === 'videos' ? withHealthVideos(tenant, db.list(tid, c)) : db.list(tid, c)
    const staffById = Object.fromEntries(list('staff').map((s) => [s.id, s]))
    const patientById = Object.fromEntries(list('patients').map((p) => [p.id, p]))
    const me = user ? (user.role === 'patient' ? patientById[user.refId] : staffById[user.refId]) : null
    return {
      tenant, tid, user, me, state,
      list,
      staff: (id) => staffById[id],
      patient: (id) => patientById[id],
      doctors: () => list('staff').filter((s) => s.role === 'doctor'),
      can: (mod) => hasModule(tenant, mod),
      base: `/t/${tenant.slug}`,
    }
  }, [state, slug])
}

function TenantApp() {
  const { slug } = useParams()
  const ctx = useTenantValue(slug)
  const loc = useLocation()
  if (!ctx) return <Navigate to="/" replace />
  // An old address (alias) moves to the clinic's current one, keeping the rest of the path.
  if (ctx.tenant.slug !== slug) return <Navigate to={loc.pathname.replace(`/t/${slug}`, `/t/${ctx.tenant.slug}`)} replace />
  const style = tenantStyle(ctx.tenant)
  const site = SITES[ctx.tenant.slug]
  const onServer = !!ctx.tenant.server
  const srv = onServer ? server.info(ctx.tid) : null
  // Staff screens wait for this clinic's records to arrive from the server.
  const waiting = onServer && auth.token(ctx.tid) && !srv.loaded
  return (
    <TenantCtx.Provider value={ctx}>
      <div style={style} className="landing" id="tenant-root">
        <Routes>
          {/* Public: patients open this from the clinic's QR code or shared link, no login */}
          <Route path="register" element={<SelfRegister />} />
          {/* A real clinic with a public page shows it at its own address; staff sign in from there */}
          {site && !ctx.user && <Route index element={<ClinicSite site={site} />} />}
          {/* Signed-in staff can still open their clinic's public home page */}
          {site && <Route path="home" element={<ClinicSite site={site} />} />}
          <Route path="*" element={waiting ? <ServerWait info={srv} /> : ctx.user ? <Shell /> : <Login />} />
        </Routes>
        {onServer && <ServerStart tid={ctx.tid} />}
      </div>
    </TenantCtx.Provider>
  )
}

function ServerStart({ tid }) {
  useEffect(() => { server.start(tid) }, [tid])
  return null
}

function ServerWait({ info }) {
  return (
    <div className="empty" style={{ margin: 'auto', padding: 40, textAlign: 'center' }}>
      {info.error ? <>Can’t reach the clinic server: {info.error}<br /><span className="small muted">Check the internet connection. This page retries on its own.</span></> : 'Opening your clinic…'}
    </div>
  )
}

function Shell() {
  const ctx = useTenant()
  const { tenant, user, me, base } = ctx
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const [look] = useLook()
  const role = user.role
  // In a clinic's own live space there is no admin login: the doctor gets everything the admin had.
  const boss = role === 'admin' || (tenant.live && role === 'doctor')
  const mods = tenant.live && role === 'doctor' ? [...new Set([...ROLE_MODULES.doctor, ...ROLE_MODULES.admin])] : ROLE_MODULES[role]
  const isPatient = role === 'patient'
  // In a clinic's own live space the doctor also owns settings and backups.
  const canSettings = role === 'admin' || (tenant.live && role === 'doctor')
  // The AI Smile preview is for dental clinics, for whoever treats patients.
  const smile = /dental/i.test(tenant.kind || '') && (role === 'doctor' || role === 'admin')
  const hospStaff = hasModule(tenant, 'ipd') && ['admin', 'doctor', 'receptionist'].includes(role)
  const dentalStaff = /dental/i.test(tenant.kind || '') && !isPatient && role !== 'pharmacist'
  const home = isPatient ? 'me' : role === 'pharmacist' ? 'pharmacy' : 'dashboard'

  const guard = (mod, el) => (mods.includes(mod) ? (hasModule(tenant, mod) ? el : <Locked mod={mod} />) : <Navigate to={`${base}/${home}`} replace />)

  return (
    <>
      <div className={`shell ${look === 'pro' && !isPatient ? 'has-appbar' : ''}`} style={{ flex: 1 }}>
        {open && <div className="scrim" onClick={() => setOpen(false)} />}
        <aside className={`rail ${open ? 'open' : ''}`} onClick={(e) => e.target.closest('a') && setOpen(false)}>
          <div className="brand-block">
            <BrandMark tenant={tenant} />
            <div style={{ minWidth: 0 }}>
              <div className="brand-name">{tenant.name}</div>
              <div className="small muted">{PLANS[tenant.plan].name} plan</div>
            </div>
          </div>
          {isPatient ? (
            <>
              <NavItem to={`${base}/me`} icon={FileHeart} label="My health record" />
              <NavItem to={`${base}/book`} icon={CalendarPlus} label="Book appointment" />
              <NavItem to={`${base}/my-appointments`} icon={CalendarDays} label="My appointments" />
              <NavItem to={`${base}/my-bills`} icon={Receipt} label="My bills" />
            </>
          ) : (
            <>
              {(() => {
                // Only the admin (demo clinics) sees modules outside the plan, with a lock, as an upgrade hint.
                // Doctors and the front desk see only what their plan includes.
                const shown = mods.filter((m) => role === 'admin' || hasModule(tenant, m))
                const group = (m) => (['ipd', 'emergency'].includes(m) ? 'Hospital' : ['pharmacy', 'billing', 'staff', 'payroll'].includes(m) ? 'Operations' : 'Clinic')
                return shown.map((m, i) => ({ m, sep: boss && (i === 0 || group(shown[i - 1]) !== group(m)) ? group(m) : null }))
              })().map(({ m, sep }) => {
                const locked = !hasModule(tenant, m)
                return (
                  <div key={m}>
                    {sep && <div className="nav-sep">{sep}</div>}
                    <NavItem to={`${base}/${m}`} icon={ICONS[m]} label={MODULES[m].label} locked={locked} />
                  </div>
                )
              })}
              {(boss || role === 'doctor') && <NavItem to={`${base}/analytics`} icon={BarChart3} label="Practice analytics" />}
              {(boss || role === 'doctor') && <NavItem to={`${base}/expenses`} icon={PiggyBank} label="Expenses" />}
              {hospStaff && <NavItem to={`${base}/ot`} icon={Scissors} label="OT schedule" />}
              {hospStaff && <NavItem to={`${base}/claims`} icon={ShieldCheck} label="Insurance claims" />}
              {dentalStaff && <NavItem to={`${base}/labwork`} icon={FlaskRound} label="Lab work" />}
              {dentalStaff && <NavItem to={`${base}/materials`} icon={Boxes} label="Materials stock" />}
              {smile && <NavItem to={`${base}/smile`} icon={Sparkles} label="AI Smile preview" fresh />}
              {SITES[tenant.slug] && <NavItem to={`${base}/home`} icon={Globe} label="Clinic home page" />}
              {canSettings && <NavItem to={`${base}/settings`} icon={SettingsIcon} label="Plan & settings" />}
            </>
          )}
          <div className="rail-foot">
            <div className="me">
              <Avatar name={me?.name} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{me?.name}</div>
                <div className="small muted">{ROLE_LABEL[role]}{me?.dept && role === 'doctor' ? ` · ${me.dept}` : ''}</div>
              </div>
            </div>
            <LookSwitch />
            <button className="nav-item" onClick={() => { auth.logout(ctx.tid); nav(base) }}><LogOut /> Log out</button>
          </div>
        </aside>
        <div style={{ minWidth: 0 }}>
          <DemoBand />
          <div className="topbar">
            <button className="btn ghost sm" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
            <BrandMark tenant={tenant} size={28} />
            <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.short}</strong>
          </div>
          {look === 'pro' && !isPatient && <AppBar mods={mods} canSettings={canSettings} lookSwitch={<LookSwitch />} onLogout={() => { auth.logout(ctx.tid); nav(base) }} />}
          <main className="main" key={loc.pathname}>
            <RouteScan path={loc.pathname} />
            <Routes>
              <Route index element={<GoHome to={`${base}/${home}`} />} />
              <Route path="dashboard" element={guard('dashboard', <Dashboard />)} />
              <Route path="patients" element={guard('patients', <Patients />)} />
              <Route path="patients/:id" element={guard('patients', <PatientProfile />)} />
              <Route path="appointments" element={guard('appointments', <Appointments />)} />
              <Route path="consult/:id" element={guard('appointments', <Consult />)} />
              <Route path="prescriptions" element={guard('prescriptions', <Prescriptions />)} />
              <Route path="reports" element={guard('reports', <Reports />)} />
              <Route path="analytics" element={boss || role === 'doctor' ? <Analytics /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="expenses" element={boss || role === 'doctor' ? <Expenses /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="labwork" element={dentalStaff ? <LabWorkPage /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="materials" element={dentalStaff ? <MaterialsPage /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="ot" element={hospStaff ? <OTPage /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="claims" element={hospStaff ? <ClaimsPage /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="smile" element={smile ? <Smile /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="education" element={guard('education', <Education />)} />
              <Route path="ipd" element={guard('ipd', <IPD />)} />
              <Route path="emergency" element={guard('emergency', <Emergency />)} />
              <Route path="pharmacy" element={guard('pharmacy', <Pharmacy />)} />
              <Route path="billing" element={guard('billing', <Billing />)} />
              <Route path="staff" element={guard('staff', <Staff />)} />
              <Route path="payroll" element={guard('payroll', <Payroll />)} />
              <Route path="settings" element={canSettings ? <Settings /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="me" element={isPatient ? <PatientHome /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="book" element={isPatient ? <PatientBook /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="my-appointments" element={isPatient ? <PatientAppointments /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="my-bills" element={isPatient ? <PatientBills /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="*" element={<Navigate to={`${base}/${home}`} replace />} />
            </Routes>
            <SiteFooter className="app-footer" />
          </main>
          {!isPatient && <NotesFab />}
          {!isPatient && <Assistant />}
        </div>
      </div>
    </>
  )
}


function NavItem({ to, icon: Icon, label, locked, fresh }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${locked ? 'locked' : ''}`} title={locked ? `Available on the ${PLANS[planFor(to.split('/').pop())]?.name} plan` : undefined}>
      <Icon /> {label} {locked && <Lock className="lock" />}{fresh && <span className="nav-new">AI</span>}
    </NavLink>
  )
}

export function DemoBand() {
  const nav = useNavigate()
  const t = useTenant()
  const onOwnHost = !!hostTenantSlug()
  // A real clinic on the online database needs no warning strip.
  if (t?.tenant.server) return null
  return (
    <div className="demo-band">
      <span>
        <Stethoscope size={13} style={{ verticalAlign: '-2px' }} />{' '}
        {t?.tenant.live
          ? `${t.tenant.name} · records are saved on this computer only. Download a backup from Settings at the end of each day.`
          : t?.tenant.prospect
          ? `Trial space for ${t.tenant.name}. Sample patients only: please don’t enter real patient details until go-live.`
          : 'Demo by Debuggers Space · sample data only'}
      </span>
      {!onOwnHost && <button onClick={() => nav('/')}>Switch clinic</button>}
    </div>
  )
}

// The clinic's bare address opens the home screen. If the browser does not move on by itself,
// the person still gets a button instead of an empty page.
function GoHome({ to }) {
  const nav = useNavigate()
  useEffect(() => { const t = setTimeout(() => nav(to, { replace: true }), 0); return () => clearTimeout(t) }, [nav, to])
  return <div className="empty" style={{ padding: 40, textAlign: 'center' }}><button className="btn primary" onClick={() => nav(to, { replace: true })}>Open dashboard</button></div>
}

// Day / Night / Debuggers Space look, saved on this device.
function LookSwitch() {
  const [look, setLook] = useLook()
  const opts = [['pro', Briefcase, 'Pro', 'Enterprise look (default)'], ['ds', Sparkles, 'DS', 'Debuggers Space look'], ['day', Sun, 'Day', 'Day mode'], ['night', Moon, 'Night', 'Night mode']]
  return (
    <div className="look-seg" role="radiogroup" aria-label="Screen look">
      {opts.map(([id, Icon, label, title]) => (
        <button key={id} role="radio" aria-checked={look === id} className={look === id ? 'on' : ''} title={title} onClick={() => setLook(id)}><Icon /> {label}</button>
      ))}
    </div>
  )
}
