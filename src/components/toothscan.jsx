// Animated "AI inspection" of a tooth: a see-through glowing molar (enamel, dentin, pulp, roots) in a
// holographic box, an AI chip sending a laser probe to it, a scan line and findings with callouts.
// A visual for the product page and the dental dashboard.
import { useEffect, useState } from 'react'
import { ScanLine } from 'lucide-react'

const TOOTH = 'M128 74 C126 46 150 36 162 50 C172 38 190 38 200 50 C212 36 236 46 232 74 C234 96 226 112 222 128 C218 162 214 196 205 216 C199 226 189 221 189 206 C188 182 185 162 180 152 C175 162 172 182 171 206 C171 221 161 226 155 216 C146 196 142 162 138 128 C134 112 126 96 128 74 Z'
const PULP = 'M158 82 C164 72 196 72 202 82 C207 96 200 112 194 120 C192 150 197 182 197 204 L193 204 C190 180 186 156 182 142 L178 142 C174 156 170 180 167 204 L163 204 C163 182 168 150 166 120 C160 112 153 96 158 82 Z'
const FINDINGS = [
  { tone: 'bad', label: 'Early decay on the crown', conf: 87 },
  { tone: 'warn', label: 'Decay is near the pulp', conf: 72 },
]
const PHASES = ['Reading the X-ray…', 'Checking enamel…', 'Measuring decay depth…', 'Tracing root canals…', 'Report ready']

export function ToothScan({ compact = false, className = '' }) {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 1700)
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
        <svg className="ts-holo" viewBox="0 0 360 250" role="img" aria-label="AI scanning a tooth">
          <defs>
            <linearGradient id="tsEnamel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fef3c7" /><stop offset=".45" stopColor="#fbbf24" /><stop offset="1" stopColor="#f97316" />
            </linearGradient>
            <linearGradient id="tsDentin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fde68a" stopOpacity=".55" /><stop offset="1" stopColor="#fb923c" stopOpacity=".18" />
            </linearGradient>
            <radialGradient id="tsPulp" cx=".5" cy=".25" r=".8">
              <stop offset="0" stopColor="#fb7185" /><stop offset="1" stopColor="#e11d48" stopOpacity=".7" />
            </radialGradient>
            <linearGradient id="tsScan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#22d3ee" stopOpacity="0" /><stop offset=".5" stopColor="#22d3ee" stopOpacity=".5" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
            <filter id="tsGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <clipPath id="tsBox"><rect x="96" y="24" width="168" height="214" rx="10" /></clipPath>
          </defs>

          {/* floor grid */}
          <g className="ts-grid">
            {Array.from({ length: 9 }, (_, i) => <line key={`h${i}`} x1="0" x2="360" y1={170 + i * 10} y2={170 + i * 10} />)}
            {Array.from({ length: 13 }, (_, i) => <line key={`v${i}`} x1={180 + (i - 6) * 18} x2={180 + (i - 6) * 46} y1="170" y2="250" />)}
          </g>

          {/* AI chip with circuit traces */}
          <g className="ts-chip" transform="translate(18 26)">
            <rect width="54" height="42" rx="7" />
            <text x="27" y="27" textAnchor="middle">AI</text>
            {[8, 18, 28, 38, 48].map((x) => <line key={`t${x}`} x1={x} x2={x} y1="-6" y2="0" />)}
            {[8, 18, 28, 38, 48].map((x) => <line key={`b${x}`} x1={x} x2={x} y1="42" y2="48" />)}
          </g>
          <g className="ts-traces">
            <path d="M72 40 H96 L110 54 H150" />
            <path d="M72 52 H88 L104 70 H128" />
            <path d="M45 74 V110 L70 135 H104" />
            <path d="M30 74 V150 L50 170 H90" />
          </g>

          {/* holographic box */}
          <rect className="ts-box" x="96" y="24" width="168" height="214" rx="10" />
          <path className="ts-corner" d="M96 40 V24 H112 M248 24 H264 V40 M264 222 V238 H248 M112 238 H96 V222" />

          {/* the tooth */}
          <g clipPath="url(#tsBox)">
            <path d={TOOTH} fill="url(#tsDentin)" />
            <path d={TOOTH} className="ts-enamel" stroke="url(#tsEnamel)" filter="url(#tsGlow)" />
            <path d={PULP} fill="url(#tsPulp)" className="ts-pulp" filter="url(#tsGlow)" />
            <path d="M136 92 C150 84 210 84 224 92" className="ts-dej" />
            <circle cx="146" cy="62" r="6" className="ts-decay" />
            <g className="ts-scanline"><rect x="96" y="-10" width="168" height="20" className="ts-scanband" /><line x1="96" x2="264" y1="0" y2="0" /></g>
          </g>

          {/* laser probe from the chip */}
          <line className="ts-laser" x1="72" y1="34" x2="146" y2="62" />
          <circle className="ts-spark" cx="146" cy="62" r="3" />

          {/* callouts */}
          <g className="ts-call c1"><circle cx="146" cy="62" r="13" className="ts-ring bad" /><path d="M234 58 H300" /><text x="302" y="55">Decay</text><text x="302" y="67" className="sub">0.8 mm</text></g>
          <g className="ts-call c2"><path d="M188 98 L236 112 H300" /><text x="302" y="109">Pulp</text><text x="302" y="121" className="sub">close</text></g>
          <g className="ts-call c3"><path d="M200 196 L236 184 H300" /><text x="302" y="181">Roots</text><text x="302" y="193" className="sub">2 canals</text></g>
          <g className="ts-call c4"><path d="M128 76 L104 76" /></g>

          {[[300, 30], [330, 150], [84, 200], [250, 14], [24, 220]].map(([x, y], i) => <circle key={i} className="ts-dot" cx={x} cy={y} r="1.6" style={{ animationDelay: `${i * 0.6}s` }} />)}
        </svg>
        <div className="ts-side">
          <div className="ts-phase">{PHASES[phase]}</div>
          <div className="ts-bar"><i style={{ width: `${pct}%` }} /></div>
          <ul className="ts-results">
            {FINDINGS.map((f) => (
              <li key={f.label} className={f.tone}><b>{f.label}</b><span>{f.conf}% match</span></li>
            ))}
            <li className="ok"><b>Roots and bone healthy</b><span>Suggest: filling or RCT review</span></li>
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
