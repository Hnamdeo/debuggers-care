import { useMemo, useState } from 'react'
import { HashRouter, MemoryRouter, Routes, Route, Navigate, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, Pill as PillIcon, FlaskConical, BedDouble, Siren, Store, Receipt, IdCard, Wallet, Settings as SettingsIcon,
  Lock, LogOut, Menu, Stethoscope, HeartPulse, CalendarPlus, FileHeart,
} from 'lucide-react'
import { db, auth, useDb } from './lib/store'
import { hasModule, ROLE_MODULES, ROLE_LABEL, PLANS, planFor, MODULES } from './lib/plans'
import { TenantCtx, Toaster, Avatar, useTenant } from './components/ui'
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

const ICONS = { dashboard: LayoutDashboard, patients: Users, appointments: CalendarDays, prescriptions: PillIcon, reports: FlaskConical, ipd: BedDouble, emergency: Siren, pharmacy: Store, billing: Receipt, staff: IdCard, payroll: Wallet }

const Router = import.meta.env.MODE === 'single' ? MemoryRouter : HashRouter

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/t/:slug/*" element={<TenantApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
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
    const tenant = state.tenants.find((t) => t.slug === slug)
    if (!tenant) return null
    const tid = tenant.id
    const user = auth.current(tid)
    const list = (c) => db.list(tid, c)
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
  if (!ctx) return <Navigate to="/" replace />
  const style = { '--brand': ctx.tenant.color }
  return (
    <TenantCtx.Provider value={ctx}>
      <div style={style} className="landing">
        {ctx.user ? <Shell /> : <Login />}
      </div>
    </TenantCtx.Provider>
  )
}

function Shell() {
  const ctx = useTenant()
  const { tenant, user, me, base } = ctx
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const role = user.role
  const mods = ROLE_MODULES[role]
  const isPatient = role === 'patient'
  const home = isPatient ? 'me' : role === 'pharmacist' ? 'pharmacy' : 'dashboard'

  const guard = (mod, el) => (ROLE_MODULES[role].includes(mod) ? (hasModule(tenant, mod) ? el : <Locked mod={mod} />) : <Navigate to={`${base}/${home}`} replace />)

  return (
    <>
      <div className="shell" style={{ flex: 1 }}>
        {open && <div className="scrim" onClick={() => setOpen(false)} />}
        <aside className={`rail ${open ? 'open' : ''}`} onClick={(e) => e.target.closest('a') && setOpen(false)}>
          <div className="brand-block">
            <span className="brand-mark"><HeartPulse /></span>
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
              {mods.map((m, i) => {
                const locked = !hasModule(tenant, m)
                if (locked && role !== 'admin') return null
                const sep = role === 'admin' && (m === 'ipd' ? 'Hospital' : m === 'pharmacy' ? 'Operations' : i === 0 ? 'Clinic' : null)
                return (
                  <div key={m}>
                    {sep && <div className="nav-sep">{sep}</div>}
                    <NavItem to={`${base}/${m}`} icon={ICONS[m]} label={MODULES[m].label} locked={locked} />
                  </div>
                )
              })}
              {role === 'admin' && <NavItem to={`${base}/settings`} icon={SettingsIcon} label="Plan & settings" />}
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
            <button className="nav-item" onClick={() => { auth.logout(ctx.tid); nav(base) }}><LogOut /> Log out</button>
          </div>
        </aside>
        <div style={{ minWidth: 0 }}>
          <DemoBand />
          <div className="topbar">
            <button className="btn ghost sm" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
            <span className="brand-mark" style={{ width: 28, height: 28 }}><HeartPulse /></span>
            <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.short}</strong>
          </div>
          <main className="main" key={loc.pathname}>
            <Routes>
              <Route index element={<Navigate to={home} replace />} />
              <Route path="dashboard" element={guard('dashboard', <Dashboard />)} />
              <Route path="patients" element={guard('patients', <Patients />)} />
              <Route path="patients/:id" element={guard('patients', <PatientProfile />)} />
              <Route path="appointments" element={guard('appointments', <Appointments />)} />
              <Route path="consult/:id" element={guard('appointments', <Consult />)} />
              <Route path="prescriptions" element={guard('prescriptions', <Prescriptions />)} />
              <Route path="reports" element={guard('reports', <Reports />)} />
              <Route path="ipd" element={guard('ipd', <IPD />)} />
              <Route path="emergency" element={guard('emergency', <Emergency />)} />
              <Route path="pharmacy" element={guard('pharmacy', <Pharmacy />)} />
              <Route path="billing" element={guard('billing', <Billing />)} />
              <Route path="staff" element={guard('staff', <Staff />)} />
              <Route path="payroll" element={guard('payroll', <Payroll />)} />
              <Route path="settings" element={role === 'admin' ? <Settings /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="me" element={isPatient ? <PatientHome /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="book" element={isPatient ? <PatientBook /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="my-appointments" element={isPatient ? <PatientAppointments /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="my-bills" element={isPatient ? <PatientBills /> : <Navigate to={`${base}/${home}`} replace />} />
              <Route path="*" element={<Navigate to={`${base}/${home}`} replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </>
  )
}


function NavItem({ to, icon: Icon, label, locked }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${locked ? 'locked' : ''}`} title={locked ? `Available on the ${PLANS[planFor(to.split('/').pop())]?.name} plan` : undefined}>
      <Icon /> {label} {locked && <Lock className="lock" />}
    </NavLink>
  )
}

export function DemoBand() {
  const nav = useNavigate()
  const t = useTenant()
  const onOwnHost = !!hostTenantSlug()
  return (
    <div className="demo-band">
      <span>
        <Stethoscope size={13} style={{ verticalAlign: '-2px' }} />{' '}
        {t?.tenant.prospect
          ? `Trial space for ${t.tenant.name}. Sample patients only: please don’t enter real patient details until go-live.`
          : 'Demo by Debuggers Space · sample data only'}
      </span>
      {!onOwnHost && <button onClick={() => nav('/')}>Switch clinic</button>}
    </div>
  )
}
