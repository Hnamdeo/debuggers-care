import { tenantHost } from '../lib/plans'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse, ArrowRight, Check, RotateCcw, Building2, Stethoscope, QrCode, MonitorPlay, BedDouble } from 'lucide-react'
import { db, useDb } from '../lib/store'
import { PLANS, PLAN_ORDER, MODULES } from '../lib/plans'
import { toast } from '../components/ui'

export default function Landing() {
  const state = useDb()
  const nav = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)
  const tenants = state.tenants.filter((t) => !t.prospect) // trial spaces for real clinics are reached only by their own address

  return (
    <div className="landing">
      <div className="landing-inner">
        <header className="row between">
          <div className="row">
            <span className="brand-mark"><HeartPulse /></span>
            <div>
              <div className="brand-name">Debuggers Care</div>
              <div className="small muted">Clinic & hospital management · by Debuggers Space</div>
            </div>
          </div>
          <span className="pill brand plain">Live demo</span>
        </header>

        <section className="hero">
          <div className="stack">
            <span className="eyebrow">One platform, from a one-chair clinic to a 200-bed hospital</span>
            <h1>Run appointments, prescriptions, beds, pharmacy and billing from one screen.</h1>
            <p className="lead">
              Every clinic gets its own space at its own address. Start on the Clinic plan and switch on pharmacy, payroll, IPD, ICU and
              emergency when you grow. Your patients and records stay exactly where they are.
            </p>
            <svg className="ecg" viewBox="0 0 600 64" preserveAspectRatio="none" aria-hidden="true">
              <polyline fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" points="0,40 120,40 140,40 150,30 160,40 200,40 212,40 222,6 234,58 246,40 290,40 310,40 322,32 334,40 420,40 432,40 442,10 454,56 466,40 520,40 540,34 552,40 600,40" />
            </svg>
          </div>
          <div className="preview-3d">
          <div className="preview-stage">
          <div className="float-card" style={{ top: -22, right: -10 }}><QrCode size={16} color="var(--brand)" /> Patient registered by QR · P-1029</div>
          <div className="float-card" style={{ bottom: -20, left: -18 }}><MonitorPlay size={16} color="var(--brand)" /> RCT video shared with patient</div>
          <div className="float-card" style={{ bottom: 70, right: -26 }}><BedDouble size={16} color="var(--bad)" /> ICU-04 · SpO₂ 89%</div>
          <div className="card pad stack">
            <h3>Try it as</h3>
            <p className="muted small" style={{ margin: 0 }}>Pick a demo clinic, then choose Admin, Doctor, Pharmacist or Patient. No sign-up, sample data only.</p>
            {tenants.map((t) => (
              <button key={t.id} className="role-btn" style={{ '--brand': t.color }} onClick={() => nav(`/t/${t.slug}`)}>
                {t.plan === 'hospital' ? <Building2 /> : <Stethoscope />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{t.name}</strong>
                  <div className="small muted">{t.kind} · {PLANS[t.plan].name} plan</div>
                </div>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
          </div>
          </div>
        </section>

        <section className="stack">
          <h2>Each clinic is its own tenant</h2>
          <div className="grid g3">
            {tenants.map((t) => (
              <TenantCard key={t.id} t={t} onOpen={() => nav(`/t/${t.slug}`)} counts={{ patients: state.data[t.id].patients.length, staff: state.data[t.id].staff.length }} />
            ))}
            {(state.platformExtra || []).map((t) => (
              <div key={t.id} className="tenant-card">
                <div className="row between"><strong>{t.name}</strong><span className="pill plain">{PLANS[t.plan].name}</span></div>
                <span className="addr">{tenantHost(t.slug)}</span>
                <span className="small muted">{t.kind} · {t.city}. Shown to illustrate a third tenant; not part of the clickable demo.</span>
              </div>
            ))}
          </div>
        </section>

        <section className="stack">
          <h2>Plans grow with the clinic</h2>
          <div className="grid g3">
            {PLAN_ORDER.map((p) => (
              <div key={p} className="plan-col">
                <div className="row between"><h3>{PLANS[p].name}</h3></div>
                <div><span className="price">₹{PLANS[p].price.toLocaleString('en-IN')}</span> <span className="muted small">/ month, indicative</span></div>
                <p className="muted small" style={{ margin: 0 }}>{PLANS[p].blurb}</p>
                <ul>
                  {PLANS[p].modules.filter((m) => m !== 'dashboard').map((m) => <li key={m}><Check size={12} /> {MODULES[m].label}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <footer className="row between small muted">
          <span>Built by Debuggers Space, Hinjawadi, Pune. All names and records here are fictional.</span>
          {confirmReset ? (
            <span className="row">
              Reset all demo data?
              <button className="btn sm danger" onClick={() => { db.reset(); setConfirmReset(false); toast('Demo data reset') }}>Yes, reset</button>
              <button className="btn sm" onClick={() => setConfirmReset(false)}>Cancel</button>
            </span>
          ) : (
            <button className="btn sm" onClick={() => setConfirmReset(true)}><RotateCcw /> Reset demo data</button>
          )}
        </footer>
      </div>
    </div>
  )
}

function TenantCard({ t, onOpen, counts }) {
  return (
    <div className="tenant-card" style={{ '--brand': t.color }}>
      <div className="row between"><strong>{t.name}</strong><span className="pill brand plain">{PLANS[t.plan].name}</span></div>
      <span className="addr">{tenantHost(t.slug)}</span>
      <span className="small muted">{t.kind} · {counts.patients} patients · {counts.staff} staff</span>
      <button className="btn primary" onClick={onOpen} style={{ alignSelf: 'flex-start' }}>Open demo <ArrowRight /></button>
    </div>
  )
}
