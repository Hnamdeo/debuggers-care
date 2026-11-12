import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HeartPulse, ArrowRight, Check, RotateCcw, Building2, Stethoscope, QrCode, MonitorPlay, BedDouble, CalendarCheck,
  FileHeart, Receipt, Pill, Palette, Wallet, Smartphone, ShieldCheck, Sparkles, Zap, Users, Activity, Clock,
} from 'lucide-react'
import { db, useDb } from '../lib/store'
import { PLANS, PLAN_ORDER, MODULES, tenantHost } from '../lib/plans'
import { toast, CompanyLink, SiteFooter, COMPANY_URL, CountUp } from '../components/ui'

const SPECIALITIES = ['Dental clinics', 'General physicians', 'Paediatrics', 'Gynaecology', 'Orthopaedics', 'ENT', 'Eye care', 'Skin & hair', 'Physiotherapy', 'Multi-speciality hospitals']

const FEATURES = [
  { icon: CalendarCheck, title: 'Appointments & live queue', text: 'Book, check in and see who is next. The waiting room runs itself.', big: true },
  { icon: FileHeart, title: 'Prescriptions in one step', text: 'Medicines, tests and the bill, written together.' },
  { icon: QrCode, title: 'QR self-registration', text: 'Patients scan at the desk and register from their own phone.' },
  { icon: MonitorPlay, title: 'Explain with videos', text: 'Show treatment videos and share them on WhatsApp.' },
  { icon: Receipt, title: 'Bills & reports', text: 'Every bill and report saved to the patient’s profile.' },
  { icon: Pill, title: 'Pharmacy & stock', text: 'Dispense from the prescription. Low stock is flagged.' },
  { icon: BedDouble, title: 'IPD, ICU & emergency', text: 'Beds, admissions and vitals for hospitals.' },
  { icon: Palette, title: 'Your logo, your colours', text: 'Each clinic looks like its own brand, at its own web address.', big: true },
  { icon: Wallet, title: 'Staff & payroll', text: 'Attendance and salaries for the whole team.' },
  { icon: ShieldCheck, title: 'Private & backed up', text: 'Each clinic’s records are kept separate. Download a backup any time.' },
]

const STEPS = [
  ['We set up your clinic', 'Your own space at yourclinic-care.debuggersspace.com, ready in a day.'],
  ['Add your doctors and fees', 'Upload your logo, pick your colours, add doctors, fees and timings.'],
  ['Start seeing patients', 'Open it on any computer, tablet or phone. No installation.'],
]

// Fade-and-rise elements marked with data-reveal as they scroll into view.
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const els = ref.current?.querySelectorAll('[data-reveal]') || []
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) } }), { threshold: 0.12 })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])
  return ref
}

export default function Landing() {
  const state = useDb()
  const nav = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const tenants = state.tenants.filter((t) => !t.prospect) // trial spaces for real clinics are reached only by their own address
  const root = useReveal()
  const tiltRef = useRef(null)
  // Live-feeling numbers in the dashboard preview: they count up, then tick every few seconds.
  const [live, setLive] = useState({ today: 12, wait: 8, billed: 18.4, waiting: 3 })
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setLive((v) => {
      const today = v.today >= 24 ? 12 : v.today + 1
      return {
        today,
        wait: [6, 7, 8, 9, 10][Math.floor(Math.random() * 5)],
        billed: today === 12 ? 18.4 : Math.round((v.billed + 0.4 + Math.random() * 1.2) * 10) / 10,
        waiting: 1 + Math.floor(Math.random() * 4),
      }
    }), 3200)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const tilt = (e) => {
    const el = tiltRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`)
  }
  const glow = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="lx" ref={root}>
      <nav className={`lx-nav ${scrolled ? 'solid' : ''}`}>
        <div className="lx-wrap lx-nav-in">
          <a className="lx-brand" href="#/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <span className="lx-logo"><HeartPulse /></span>
            <span className="lx-brand-txt">
              <strong>Clinic and Hospital Management System</strong>
              <span>by <CompanyLink /></span>
            </span>
          </a>
          <div className="lx-links">
            <button onClick={() => go('features')}>Features</button>
            <button onClick={() => go('how')}>How it works</button>
            <button onClick={() => go('plans')}>Plans</button>
          </div>
          <button className="lx-btn sm" onClick={() => go('demo')}>Live demo <ArrowRight /></button>
        </div>
      </nav>

      <header className="lx-hero">
        <div className="lx-aurora" aria-hidden="true"><i /><i /><i /></div>
        <div className="lx-grid-bg" aria-hidden="true" />
        <div className="lx-wrap lx-hero-in">
          <div className="lx-hero-copy">
            <span className="lx-badge"><Sparkles size={14} /> New for 2026 · built for Indian clinics</span>
            <h1>Your whole clinic,<br /><span className="lx-grad">on one beautiful screen.</span></h1>
            <p>Appointments, prescriptions, bills, pharmacy and beds, in software so simple that every doctor and receptionist gets it on day one. From a one-chair clinic to a 200-bed hospital.</p>
            <div className="lx-cta-row">
              <button className="lx-btn" onClick={() => go('demo')}>Try the live demo <ArrowRight /></button>
              <a className="lx-btn ghost" href={COMPANY_URL} target="_blank" rel="noopener noreferrer">Talk to us</a>
            </div>
            <ul className="lx-trust">
              <li><Smartphone size={15} /> Phone, tablet or computer</li>
              <li><Zap size={15} /> No installation</li>
              <li><ShieldCheck size={15} /> Your own private space</li>
            </ul>
          </div>

          <div className="lx-mock-stage" onMouseMove={tilt} onMouseLeave={() => { tiltRef.current?.style.setProperty('--rx', '0deg'); tiltRef.current?.style.setProperty('--ry', '0deg') }}>
            <div className="lx-mock" ref={tiltRef}>
              <div className="lx-mock-top"><span /><span /><span /><em>yourclinic-care.debuggersspace.com</em></div>
              <div className="lx-mock-body">
                <div className="lx-mock-hello">
                  <strong>Good morning, Dr. Mehta</strong>
                  <span><CountUp to={live.today} delay={500} duration={900} /> patients today · <CountUp to={live.waiting} delay={500} /> waiting</span>
                </div>
                <div className="lx-mock-stats">
                  <div><Users size={14} /><b><CountUp to={live.today} delay={600} duration={1200} /></b><span>Today</span></div>
                  <div><Clock size={14} /><b><CountUp to={live.wait} delay={700} duration={1200} /> min</b><span>Avg wait</span></div>
                  <div><Activity size={14} /><b>₹<CountUp to={live.billed} decimals={1} delay={800} duration={1400} />k</b><span>Billed</span></div>
                </div>
                <div className="lx-mock-chart" aria-hidden="true">
                  {[38, 52, 44, 70, 58, 84, 66, 92, 74, 88, 62, 96].map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${0.4 + i * 0.05}s` }} />)}
                </div>
                <div className="lx-mock-queue">
                  {[['AK', 'Amit Kulkarni', 'Root canal · 2nd sitting', 'In chair'], ['PS', 'Priya Sharma', 'Scaling & polishing', 'Next'], ['RJ', 'Rohan Joshi', 'Tooth pain', 'Waiting']].map(([a, n, w, s], i) => (
                    <div key={n}><span className="lx-av">{a}</span><span><b>{n}</b><small>{w}</small></span><em className={`s${i}`}>{s}</em></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lx-float f1"><QrCode size={16} /> Patient registered by QR</div>
            <div className="lx-float f2"><MonitorPlay size={16} /> RCT video sent on WhatsApp</div>
            <div className="lx-float f3"><BedDouble size={16} /> ICU-04 · SpO₂ 89%</div>
          </div>
        </div>
      </header>

      <section className="lx-marquee" aria-label="Made for every speciality">
        <div className="lx-marquee-track">
          {[...SPECIALITIES, ...SPECIALITIES].map((s, i) => <span key={i}><HeartPulse size={14} /> {s}</span>)}
        </div>
      </section>

      <section className="lx-sec" id="features">
        <div className="lx-wrap">
          <div className="lx-head" data-reveal>
            <span className="lx-kicker">Everything in one place</span>
            <h2>Built for how Indian clinics actually work</h2>
            <p>No training manuals. Every screen has one clear job, with big buttons and plain words.</p>
          </div>
          <div className="lx-bento">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`lx-card ${f.big ? 'big' : ''}`} data-reveal style={{ transitionDelay: `${(i % 3) * 0.06}s` }} onMouseMove={glow}>
                <span className="lx-ic"><f.icon /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lx-sec alt" id="how">
        <div className="lx-wrap">
          <div className="lx-head" data-reveal>
            <span className="lx-kicker">How it works</span>
            <h2>Live in a day, not a month</h2>
          </div>
          <div className="lx-steps">
            {STEPS.map(([t, d], i) => (
              <div key={t} className="lx-step" data-reveal style={{ transitionDelay: `${i * 0.08}s` }}>
                <span className="lx-num">{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lx-sec" id="demo">
        <div className="lx-wrap">
          <div className="lx-head" data-reveal>
            <span className="lx-kicker">Live demo</span>
            <h2>Try it yourself, right now</h2>
            <p>Pick a demo clinic, then sign in as Admin, Doctor, Pharmacist or Patient with one click. Sample data only.</p>
          </div>
          <div className="lx-demos">
            {tenants.map((t) => (
              <button key={t.id} className="lx-demo" data-reveal style={{ '--brand': t.color }} onClick={() => nav(`/t/${t.slug}`)} onMouseMove={glow}>
                <span className="lx-demo-ic">{t.plan === 'hospital' ? <Building2 /> : <Stethoscope />}</span>
                <span className="lx-demo-txt">
                  <strong>{t.name}</strong>
                  <small>{t.kind} · {PLANS[t.plan].name} plan · {state.data[t.id].patients.length} sample patients</small>
                  <code>{tenantHost(t)}</code>
                </span>
                <span className="lx-demo-go">Open <ArrowRight size={16} /></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="lx-sec alt" id="plans">
        <div className="lx-wrap">
          <div className="lx-head" data-reveal>
            <span className="lx-kicker">Plans</span>
            <h2>Start small. Grow without switching.</h2>
            <p>Switch on pharmacy, payroll, IPD and ICU when you need them. Your patients and records stay where they are.</p>
          </div>
          <div className="lx-plans">
            {PLAN_ORDER.map((p, i) => (
              <div key={p} className={`lx-plan ${p === 'plus' ? 'pop' : ''}`} data-reveal style={{ transitionDelay: `${i * 0.08}s` }}>
                {p === 'plus' && <span className="lx-pop">Most popular</span>}
                <h3>{PLANS[p].name}</h3>
                <div className="lx-price"><b>₹{PLANS[p].price.toLocaleString('en-IN')}</b><span>/ month</span></div>
                <p>{PLANS[p].blurb}</p>
                <ul>
                  {PLANS[p].modules.filter((m) => m !== 'dashboard').map((m) => <li key={m}><Check size={14} /> {MODULES[m].label}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="lx-note">Prices are indicative.</p>
        </div>
      </section>

      <section className="lx-sec">
        <div className="lx-wrap">
          <div className="lx-final" data-reveal>
            <div className="lx-aurora" aria-hidden="true"><i /><i /></div>
            <h2>Ready to give your clinic its own space?</h2>
            <p>We set it up with your name, logo and colours, and train your team in one short call.</p>
            <div className="lx-cta-row center">
              <a className="lx-btn light" href={COMPANY_URL} target="_blank" rel="noopener noreferrer">Talk to Debuggers Space Solutions <ArrowRight /></a>
              <button className="lx-btn ghost" onClick={() => go('demo')}>See the demo</button>
            </div>
          </div>
        </div>
      </section>

      <footer className="lx-wrap lx-foot">
        <div className="row between small muted" style={{ flexWrap: 'wrap', gap: 10 }}>
          <span>All names and records in the demo are fictional.</span>
          {confirmReset ? (
            <span className="row">
              Reset all demo data?
              <button className="btn sm danger" onClick={() => { db.reset(); setConfirmReset(false); toast('Demo data reset') }}>Yes, reset</button>
              <button className="btn sm" onClick={() => setConfirmReset(false)}>Cancel</button>
            </span>
          ) : (
            <button className="btn sm" onClick={() => setConfirmReset(true)}><RotateCcw /> Reset demo data</button>
          )}
        </div>
        <SiteFooter />
      </footer>
    </div>
  )
}
