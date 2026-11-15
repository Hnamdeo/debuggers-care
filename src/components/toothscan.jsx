// Animated "AI inspection" of a dental arch: a scan beam sweeps the teeth, each tooth lights up as it
// is checked, and findings appear. A visual for the product page and the dental dashboard.
import { useEffect, useState } from 'react'
import { ScanLine } from 'lucide-react'

const N = 14
const TEETH = Array.from({ length: N }, (_, i) => {
  const t = (i - (N - 1) / 2) / ((N - 1) / 2)
  const x = 160 + t * 128
  const y = 34 + t * t * 112
  const w = 15 + Math.abs(t) * 11
  const h = 20 + Math.abs(t) * 4
  const rot = (Math.atan((2 * 112 * t) / 128) * 180) / Math.PI
  return { x, y, w, h, rot }
})
const FINDINGS = [
  { tooth: 2, tone: 'bad', label: 'Early decay', conf: 87 },
  { tooth: 9, tone: 'warn', label: 'Plaque build-up', conf: 74 },
]
const PHASES = ['Mapping 28 teeth…', 'Checking enamel…', 'Looking for decay…', 'Checking gums…', 'Report ready']
const DUR = 3.6

export function ToothScan({ compact = false, className = '' }) {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), (DUR * 1000 * 1.25) / PHASES.length * 2)
    return () => clearInterval(id)
  }, [])
  const done = phase === PHASES.length - 1
  const pct = Math.round(((phase + 1) / PHASES.length) * 100)
  return (
    <div className={`ts ${compact ? 'ts-compact' : ''} ${className}`}>
      <div className="ts-head">
        <span className="ts-title"><ScanLine size={15} /> AI inspection</span>
        <span className={`ts-live ${done ? 'ok' : ''}`}><i /> {done ? 'Done' : 'Scanning'}</span>
      </div>
      <div className="ts-body">
        <svg className="ts-arch" viewBox="0 0 320 175" role="img" aria-label="AI scanning a set of teeth">
          <defs>
            <linearGradient id="ts-beam" x1="0" x2="1">
              <stop offset="0" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset=".5" stopColor="#38bdf8" stopOpacity=".55" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="ts-gum" d={`M ${TEETH[0].x - 14} ${TEETH[0].y + 18} Q 160 -70 ${TEETH[N - 1].x + 14} ${TEETH[N - 1].y + 18}`} />
          {TEETH.map((t, i) => (
            <g key={i} transform={`translate(${t.x} ${t.y}) rotate(${t.rot})`}>
              <rect className="ts-tooth" x={-t.w / 2} y={-t.h / 2} width={t.w} height={t.h} rx={t.w / 2.6} style={{ animationDelay: `${(t.x / 320) * DUR}s` }} />
            </g>
          ))}
          {FINDINGS.map((f) => {
            const t = TEETH[f.tooth]
            return (
              <g key={f.tooth} className={`ts-find ${f.tone}`} transform={`translate(${t.x} ${t.y})`}>
                <circle r="15" className="ts-ring" />
                <circle r="4" />
              </g>
            )
          })}
          <g className="ts-beam-g">
            <rect x="-26" y="0" width="52" height="175" fill="url(#ts-beam)" />
            <line x1="0" x2="0" y1="0" y2="175" className="ts-beam-line" />
          </g>
        </svg>
        <div className="ts-side">
          <div className="ts-phase">{PHASES[phase]}</div>
          <div className="ts-bar"><i style={{ width: `${pct}%` }} /></div>
          <ul className="ts-results">
            {FINDINGS.map((f) => (
              <li key={f.label} className={f.tone}><b>{f.label}</b><span>{f.conf}% match</span></li>
            ))}
            <li className="ok"><b>26 teeth healthy</b><span>Gums look fine</span></li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Dashboard card for dental clinics: the scan animation with a way into the AI tools.
export function DentalScanCard({ tenant, onSmile, onXray }) {
  if (!/dental/i.test(tenant?.kind || '')) return null
  return (
    <section className="card">
      <div className="card-body dash-scan">
        <ToothScan />
        <div className="dash-scan-copy">
          <span className="ai-sum-tag" style={{ justifySelf: 'start' }}><ScanLine size={13} /> AI dental check</span>
          <h3>Show patients what AI sees</h3>
          <span className="small muted">Open the AI Smile preview on a patient’s photo, or keep X-rays on their profile so you can explain each tooth. Full AI X-ray reading is coming as a paid add-on.</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary sm" onClick={onSmile}><ScanLine /> AI Smile preview</button>
            <button className="btn sm" onClick={onXray}>Patients and X-rays</button>
          </div>
        </div>
      </div>
    </section>
  )
}

// A short "AI is reading" scan shown when a records page opens.
const SCAN_TEXT = [
  [/\/consult\//, 'Preparing the prescription pad'],
  [/\/patients\/[^/]+$/, 'Reading patient details'],
  [/\/patients$/, 'Loading the patient list'],
  [/\/prescriptions$/, 'Loading prescriptions'],
  [/\/analytics$/, 'Analysing your practice'],
]
export function RouteScan({ path }) {
  const text = SCAN_TEXT.find(([re]) => re.test(path))?.[1]
  const [on, setOn] = useState(!!text)
  useEffect(() => {
    if (!text) return
    const id = setTimeout(() => setOn(false), 750)
    return () => clearTimeout(id)
  }, [text])
  if (!text || !on) return null
  return (
    <div className="rscan" aria-hidden="true">
      <div className="rscan-card">
        <span className="rscan-orb"><ScanLine size={18} /></span>
        <div className="rscan-txt"><b>{text}</b><span>AI is checking the records…</span></div>
        <div className="rscan-lines"><i /><i /><i /></div>
      </div>
    </div>
  )
}
