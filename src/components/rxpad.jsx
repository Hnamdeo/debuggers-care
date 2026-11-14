// The prescription sheet, laid out like the clinic's own printed pad:
// letterhead with the doctors, services down the left, the patient line, history boxes, then ℞.
import { useTenant } from './ui'
import { SITES } from '../lib/sites'
import { fmtDate, age } from '../lib/utils'

export const HISTORY = ['Diabetes', 'Hypertension', 'Drug allergy', 'Pregnancy', 'Asthma', 'Thyroid', 'Others']

// Ticks the history boxes from what the patient already told us, until the doctor saves their own.
export function historyFor(p) {
  if (Array.isArray(p?.history)) return p.history
  const t = `${p?.conditions || ''}`.toLowerCase()
  const h = []
  if (/diab|sugar|dm\b/.test(t)) h.push('Diabetes')
  if (/hyperten|\bbp\b|blood pressure|htn/.test(t)) h.push('Hypertension')
  if (p?.allergies && !/^(none|no|nil|nkda)/i.test(p.allergies.trim())) h.push('Drug allergy')
  if (/pregnan/.test(t)) h.push('Pregnancy')
  if (/asthma/.test(t)) h.push('Asthma')
  if (/thyro/.test(t)) h.push('Thyroid')
  return h
}

// What goes on the pad: the clinic's printed design when we have it, otherwise one built from its settings.
export function usePad() {
  const { tenant, doctors } = useTenant()
  const site = SITES[tenant.slug]
  if (site?.pad) return site.pad
  return {
    title: [tenant.name],
    ring: tenant.name.toUpperCase(),
    address: [tenant.address].filter(Boolean),
    doctors: doctors().slice(0, 2).map((d) => ({ name: d.name.toUpperCase(), lines: [d.qualification, d.regNo && `Reg. No. ${d.regNo}`].filter(Boolean), phone: '' })),
    services: (tenant.services || []).slice(1, 12).map((s) => [s[0]]),
    hours: [],
    appointments: [tenant.phone].filter(Boolean),
    history: HISTORY,
    consent: '',
    footer: '',
  }
}

const shortName = (s) => s.split(/\s+/).map((w) => w[0]).join('').replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase()

// Round clinic seal: tooth in a caring hand, with the clinic name around it.
export function ClinicSeal({ ring, size = 96, logo, className = '' }) {
  if (logo) return <img className={className} src={logo} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />
  const id = `seal-${shortName(ring)}`
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs><path id={id} d="M60 60 m-47 0 a47 47 0 1 1 94 0 a47 47 0 1 1 -94 0" /></defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <text fontSize="8.6" fontWeight="700" letterSpacing="1.1" fill="currentColor"><textPath href={`#${id}`} startOffset="2%">{ring}</textPath></text>
      <path d="M46 44c0-8 9-10 14-5 5-5 14-3 14 5 0 7-3 11-4 19-1 7-4 10-5 4-1-5-2-8-5-8s-4 3-5 8c-1 6-4 3-5-4-1-8-4-12-4-19z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M38 50c-1-6 4-8 8-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M30 70c8 14 34 20 54 6 4-3 7-7 8-11" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 70c-2-4 0-7 4-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const Box = ({ on }) => <span className={`pad-box${on ? ' on' : ''}`} aria-hidden="true">{on ? '✓' : ''}</span>

// rx can be a saved prescription or a draft from the consultation screen.
export function RxPad({ rx, p, doctor }) {
  const { tenant } = useTenant()
  const pad = usePad()
  const history = rx.history || historyFor(p)
  const others = rx.historyNote || ''
  const sex = { M: 'M', F: 'F', O: 'O' }[p?.gender] || ''
  return (
    <div className="sheet pad-sheet">
      <header className="pad-head">
        <ClinicSeal ring={pad.ring} logo={tenant.logo} size={92} className="pad-seal" />
        <div className="pad-title">
          <h2>{pad.title[0]}</h2>
          {pad.title[1] && <div className="pad-sub">{pad.title[1]}</div>}
          {pad.address.map((l) => <div key={l} className="pad-addr">{l}</div>)}
        </div>
        <div className="pad-docs">
          {pad.doctors.map((d) => (
            <div key={d.name}>
              <strong>{d.name}</strong>
              {d.lines.map((l) => <div key={l}>{l}</div>)}
              {d.phone && <div>☏ {d.phone}</div>}
            </div>
          ))}
        </div>
      </header>
      <div className="pad-main">
        <aside className="pad-side">
          {pad.services.length > 0 && <div className="pad-side-h">Services we Offer</div>}
          {pad.services.map(([en, hi]) => <div key={en} className="pad-svc"><div>{en}</div>{hi && <div className="hi">{hi}</div>}</div>)}
          {pad.hours.length > 0 && <div className="pad-hours">⏰{pad.hours.map((h, i) => <div key={i} className={i % 2 ? '' : 'b'}>{h}</div>)}</div>}
          {pad.appointments.length > 0 && <div className="pad-appt"><strong>For Appointments ☏</strong>{pad.appointments.map((n) => <div key={n}>{n}</div>)}</div>}
        </aside>
        <section className="pad-body">
          <ClinicSeal ring={pad.ring} size={300} className="pad-water" />
          <div className="pad-line">
            <span>OPD No.: <b>{p?.opdNo || p?.id}</b></span>
            <span>Date: <b>{fmtDate(rx.date)}</b></span>
            <span>Age/Sex: <b>{p?.dob ? `${age(p.dob)} y` : ''}{sex ? ` / ${sex}` : ''}</b></span>
          </div>
          <div className="pad-top">
            <div className="pad-line" style={{ flex: 1 }}>
              <span style={{ flex: 1 }}>Name: <b>{p?.name}</b></span>
              {p?.phone && <span>Mob: <b>{p.phone}</b></span>}
            </div>
            <ul className="pad-hist">
              {(pad.history || HISTORY).map((h) => <li key={h}><Box on={history.includes(h)} /> {h}{h === 'Others' && others ? `: ${others}` : ''}{h === 'Drug allergy' && history.includes(h) && p?.allergies ? ` (${p.allergies})` : ''}</li>)}
            </ul>
          </div>
          <div className="pad-write">
            {rx.complaint && <p><b>C/O:</b> {rx.complaint}</p>}
            {rx.findings && <p><b>O/E:</b> {rx.findings}</p>}
            {rx.diagnosis && <p><b>Diagnosis:</b> {rx.diagnosis}</p>}
            {rx.done?.length > 0 && <p><b>Treatment done:</b> {rx.done.join(', ')}</p>}
            {rx.items?.length > 0 && (
              <>
                <div className="rx">℞</div>
                <ol className="pad-meds">
                  {rx.items.map((it, i) => <li key={i}><b>{it.name}</b><span>{[it.dose, it.freq, it.days ? `${it.days} days` : ''].filter(Boolean).join(' · ')}</span></li>)}
                </ol>
              </>
            )}
            {rx.tests?.length > 0 && <p><b>Investigations:</b> {rx.tests.join(', ')}</p>}
            {rx.notes && <p><b>Advice:</b> {rx.notes}</p>}
            {rx.nextVisit && <p><b>Next visit:</b> {fmtDate(rx.nextVisit)}</p>}
          </div>
          <div className="pad-sign"><div className="sig">{doctor?.name}</div><div>{doctor?.qualification}</div></div>
        </section>
      </div>
      {(pad.consent || pad.footer) && (
        <footer className="pad-foot">
          {pad.consent && <div className="hi">{pad.consent} ........................</div>}
          {pad.footer && <div className="pad-legal">{pad.footer}</div>}
        </footer>
      )}
    </div>
  )
}
