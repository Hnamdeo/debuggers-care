// Clickable dental chart (FDI numbering). Tap a tooth to mark what was found (cavity, filling, RCT…),
// plan a treatment and mark it done. Saved on the patient as `teeth`: { '36': { c: ['cavity'], plan, done, note, at } }.
import { useState } from 'react'
import { Baby, Smile, ClipboardList, FileSpreadsheet, Check, Eraser } from 'lucide-react'
import { useTenant, Card, Modal, Textarea, toast } from './ui'
import { db } from '../lib/store'
import { today, fmtDate, money } from '../lib/utils'
import { proceduresFor } from '../lib/slots'
import { EstimateForm as EstimateFormLazy } from './estimates'

export const CONDITIONS = [
  ['cavity', 'Cavity', '#e53935'], ['filling', 'Filling', '#1e88e5'], ['crown', 'Crown', '#f9a825'], ['rct', 'RCT', '#8e24aa'],
  ['missing', 'Missing / extracted', '#78909c'], ['implant', 'Implant', '#00897b'], ['fracture', 'Fracture', '#f4511e'],
  ['bridge', 'Bridge', '#6d4c41'], ['sealant', 'Sealant', '#43a047'], ['sensitive', 'Sensitive', '#d81b60'], ['mobile', 'Mobile', '#ff8f00'],
  ['impacted', 'Impacted', '#5e35b1'],
]
const COND = Object.fromEntries(CONDITIONS.map(([k, l, c]) => [k, { label: l, color: c }]))

const ADULT = { ur: [18, 17, 16, 15, 14, 13, 12, 11], ul: [21, 22, 23, 24, 25, 26, 27, 28], lr: [48, 47, 46, 45, 44, 43, 42, 41], ll: [31, 32, 33, 34, 35, 36, 37, 38] }
const CHILD = { ur: [55, 54, 53, 52, 51], ul: [61, 62, 63, 64, 65], lr: [85, 84, 83, 82, 81], ll: [71, 72, 73, 74, 75] }
const QUAD = { 1: 'Upper right', 2: 'Upper left', 3: 'Lower left', 4: 'Lower right', 5: 'Upper right', 6: 'Upper left', 7: 'Lower left', 8: 'Lower right' }
const ADULT_NAMES = ['', 'central incisor', 'lateral incisor', 'canine', 'first premolar', 'second premolar', 'first molar', 'second molar', 'third molar (wisdom)']
const CHILD_NAMES = ['', 'central incisor', 'lateral incisor', 'canine', 'first molar', 'second molar']
export const toothName = (n) => {
  const q = Math.floor(n / 10), i = n % 10
  return `${QUAD[q]} ${(q > 4 ? CHILD_NAMES : ADULT_NAMES)[i]}${q > 4 ? ' (milk tooth)' : ''}`
}
const kindOf = (n) => { const q = Math.floor(n / 10), i = n % 10; if (q > 4) return i >= 4 ? 'molar' : i === 3 ? 'canine' : 'incisor'; return i >= 6 ? 'molar' : i >= 4 ? 'premolar' : i === 3 ? 'canine' : 'incisor' }

// One tooth drawn as crown + roots. Upper teeth have roots up, lower ones down.
function ToothSvg({ n, info }) {
  const upper = [1, 2, 5, 6].includes(Math.floor(n / 10))
  const k = kindOf(n)
  const conds = info?.c || []
  const missing = conds.includes('missing')
  const main = conds.find((c) => c !== 'missing')
  const fill = main ? COND[main].color : null
  const crown = {
    molar: 'M6 30 C5 24 9 20 14 21 C17 19 23 19 26 21 C31 20 35 24 34 30 C34 37 31 42 26 42 L14 42 C9 42 6 37 6 30 Z',
    premolar: 'M9 30 C8 24 12 20 20 20 C28 20 32 24 31 30 C31 37 28 42 23 42 L17 42 C12 42 9 37 9 30 Z',
    canine: 'M11 31 C11 26 15 19 20 17 C25 19 29 26 29 31 C29 37 26 42 22 42 L18 42 C14 42 11 37 11 31 Z',
    incisor: 'M11 22 C11 20 13 19 20 19 C27 19 29 20 29 22 L28 36 C27 40 25 42 22 42 L18 42 C15 42 13 40 12 36 Z',
  }[k]
  const roots = {
    molar: 'M10 42 C10 52 11 60 14 64 C16 60 17 52 18 44 M22 44 C23 52 24 60 26 64 C29 60 30 52 30 42',
    premolar: 'M16 42 C16 52 18 60 20 66 C22 60 24 52 24 42',
    canine: 'M15 42 C15 54 18 64 20 72 C22 64 25 54 25 42',
    incisor: 'M15 42 C15 52 18 60 20 66 C22 60 25 52 25 42',
  }[k]
  return (
    <svg viewBox="0 0 40 76" className="dc-svg" aria-hidden="true" style={{ transform: upper ? 'scaleY(-1)' : undefined }}>
      <path d={roots} className="dc-root" />
      <path d={crown} className={`dc-crown ${missing ? 'missing' : ''}`} style={fill ? { fill: `color-mix(in srgb, ${fill} 30%, var(--surface))`, stroke: fill } : undefined} />
      {conds.includes('rct') && <path d="M20 26 V64" className="dc-canal" />}
      {conds.includes('cavity') && <circle cx="20" cy="29" r="4.2" fill={COND.cavity.color} />}
      {conds.includes('crown') && <path d={crown} fill="none" stroke={COND.crown.color} strokeWidth="2.6" />}
      {conds.includes('implant') && <path d="M17 44 H23 M16 50 H24 M17 56 H23 M18 62 H22" stroke={COND.implant.color} strokeWidth="2" />}
      {missing && <path d="M8 22 L32 44 M32 22 L8 44" stroke={COND.missing.color} strokeWidth="2.4" strokeLinecap="round" />}
    </svg>
  )
}

export function DentalChart({ p, compact = false }) {
  const { tid, tenant, user } = useTenant()
  const [kids, setKids] = useState(() => !!p.dob && new Date().getFullYear() - +p.dob.slice(0, 4) < 12)
  const [sel, setSel] = useState(null)
  const [estimate, setEstimate] = useState(false)
  const teeth = p.teeth || {}
  const set = kids ? CHILD : ADULT
  const edit = user.role !== 'patient'
  const save = (n, patch) => {
    const cur = { ...(teeth[n] || {}), ...patch, at: today() }
    const next = { ...teeth }
    if (!cur.c?.length && !cur.plan && !cur.note) delete next[n]
    else next[n] = cur
    db.update(tid, 'patients', p.id, { teeth: next })
  }
  const marked = Object.entries(teeth).sort(([a], [b]) => +a - +b)
  const planned = marked.filter(([, t]) => t.plan)
  const tooth = (n) => (
    <button key={n} type="button" className={`dc-tooth ${sel === n ? 'sel' : ''} ${teeth[n] ? 'has' : ''}`} onClick={() => edit && setSel(sel === n ? null : n)} title={`${n} · ${toothName(n)}${teeth[n]?.c?.length ? ` · ${teeth[n].c.map((c) => COND[c]?.label).join(', ')}` : ''}`} disabled={!edit}>
      <span className="dc-num">{n}</span>
      <ToothSvg n={n} info={teeth[n]} />
      {teeth[n]?.plan && <span className={`dc-plan ${teeth[n].done ? 'done' : ''}`}>{teeth[n].done ? <Check size={9} /> : null}{teeth[n].plan}</span>}
    </button>
  )
  const body = (
    <div className="dc">
      <div className="dc-bar">
        <div className="dc-switch" role="tablist" aria-label="Teeth set">
          <button role="tab" aria-selected={!kids} className={!kids ? 'on' : ''} onClick={() => { setKids(false); setSel(null) }}><Smile size={14} /> Adult (32)</button>
          <button role="tab" aria-selected={kids} className={kids ? 'on' : ''} onClick={() => { setKids(true); setSel(null) }}><Baby size={14} /> Child (20)</button>
        </div>
        <span className="small muted">{edit ? 'Tap a tooth to mark it' : 'Your teeth as marked by the doctor'}</span>
      </div>
      <div className="dc-mouth">
        <div className="dc-label top">Upper jaw</div>
        <div className="dc-row up">{set.ur.map(tooth)}<i className="dc-mid" />{set.ul.map(tooth)}</div>
        <div className="dc-sides"><span>Patient’s right</span><span>Patient’s left</span></div>
        <div className="dc-row down">{set.lr.map(tooth)}<i className="dc-mid" />{set.ll.map(tooth)}</div>
        <div className="dc-label">Lower jaw</div>
      </div>
      <div className="dc-legend">{CONDITIONS.map(([k, l, c]) => <span key={k}><i style={{ background: c }} />{l}</span>)}</div>
      {sel && <ToothEditor n={sel} info={teeth[sel] || {}} tenant={tenant} onSave={(patch) => save(sel, patch)} onClose={() => setSel(null)} />}
      {marked.length > 0 && (
        <div className="dc-summary">
          <div className="row between">
            <strong><ClipboardList size={15} style={{ verticalAlign: '-3px' }} /> Findings and treatment plan</strong>
            {edit && planned.some(([, t]) => !t.done) && <button className="btn sm primary" onClick={() => setEstimate(true)}><FileSpreadsheet /> Make estimate from plan</button>}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tooth</th><th>Found</th><th>Treatment</th><th>Status</th></tr></thead>
              <tbody>
                {marked.map(([n, t]) => (
                  <tr key={n} className={edit ? 'click' : ''} onClick={() => edit && setSel(+n)}>
                    <td><b>{n}</b><div className="cell-sub">{toothName(+n)}</div></td>
                    <td>{(t.c || []).map((c) => <span key={c} className="dc-chip sm" style={{ '--c': COND[c]?.color }}>{COND[c]?.label}</span>)}{t.note && <div className="cell-sub">{t.note}</div>}</td>
                    <td>{t.plan || <span className="muted">–</span>}</td>
                    <td>{t.plan ? (t.done ? <span className="pill ok">Done</span> : <span className="pill warn">Planned</span>) : <span className="muted small">Noted {fmtDate(t.at)}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {estimate && <EstimateFromPlan p={p} rows={planned.filter(([, t]) => !t.done)} onClose={() => setEstimate(false)} />}
    </div>
  )
  return compact ? body : <Card title={<h2>Dental chart</h2>}>{body}</Card>
}

function ToothEditor({ n, info, tenant, onSave, onClose }) {
  const c = info.c || []
  const svc = tenant.services.map(([x]) => x).filter((x) => !/consult/i.test(x))
  const procs = [...svc, ...proceduresFor(tenant).map(([x]) => x).filter((x) => x !== 'Consultation' && !serviceFor(tenant, x))].slice(0, 18)
  return (
    <div className="dc-edit">
      <div className="row between">
        <div><h3 style={{ margin: 0 }}>Tooth {n}</h3><div className="small muted">{toothName(n)}</div></div>
        <div className="row" style={{ gap: 6 }}>
          {(c.length || info.plan || info.note) && <button className="btn sm ghost" onClick={() => { onSave({ c: [], plan: '', done: false, note: '' }); toast(`Tooth ${n} cleared`) }}><Eraser /> Clear</button>}
          <button className="btn sm" onClick={onClose}>Done</button>
        </div>
      </div>
      <div className="dc-sec">What did you find?</div>
      <div className="dc-chips">
        {CONDITIONS.map(([k, l, col]) => (
          <button key={k} type="button" className={`dc-chip ${c.includes(k) ? 'on' : ''}`} style={{ '--c': col }} aria-pressed={c.includes(k)} onClick={() => onSave({ c: c.includes(k) ? c.filter((x) => x !== k) : [...c, k] })}>{l}</button>
        ))}
      </div>
      <div className="dc-sec">Treatment to do</div>
      <div className="dc-chips">
        {procs.map((x) => <button key={x} type="button" className={`qchip ${info.plan === x ? 'on' : ''}`} onClick={() => onSave({ plan: info.plan === x ? '' : x, done: false })}>{x}</button>)}
      </div>
      {info.plan && (
        <label className="row" style={{ gap: 8, cursor: 'pointer', marginTop: 8 }}>
          <input type="checkbox" checked={!!info.done} onChange={(e) => onSave({ done: e.target.checked })} /> {info.plan} on tooth {n} is done
        </label>
      )}
      <Textarea id={`dc-note-${n}`} label="Note" rows={2} defaultValue={info.note || ''} onBlur={(e) => e.target.value !== (info.note || '') && onSave({ note: e.target.value })} placeholder="e.g. Deep distal caries, pain on biting" />
    </div>
  )
}

// The clinic's service (with its price) for a planned treatment: "RCT" finds "Root canal treatment".
const ALIAS = [['rct', 'root canal'], ['root canal', 'root canal'], ['extraction', 'extraction'], ['filling', 'filling'], ['crown', 'crown'], ['denture', 'denture'], ['implant', 'implant'], ['scaling', 'scaling'], ['whitening', 'whitening'], ['braces', 'braces'], ['bridge', 'bridge']]
export function serviceFor(tenant, name) {
  const n = name.toLowerCase()
  const exact = tenant.services.find(([x]) => x.toLowerCase() === n)
  if (exact) return exact
  const key = ALIAS.find(([a]) => n.includes(a))?.[1]
  return key ? tenant.services.find(([x]) => x.toLowerCase().includes(key) && !/surgical|impacted/i.test(x)) || tenant.services.find(([x]) => x.toLowerCase().includes(key)) : null
}
export const priceFor = (tenant, name) => +(serviceFor(tenant, name)?.[1] || 0)

function EstimateFromPlan({ p, rows, onClose }) {
  const { tenant } = useTenant()
  const items = rows.map(([n, t]) => ({ desc: serviceFor(tenant, t.plan)?.[0] || t.plan, tooth: n, qty: 1, rate: priceFor(tenant, t.plan) }))
  return <EstimateFormLazy p={p} initial={items} onClose={onClose} />
}

// Button + popup for the consultation screen.
export function DentalChartButton({ p }) {
  const [open, setOpen] = useState(false)
  const n = Object.keys(p.teeth || {}).length
  return (
    <>
      <button className="btn sm" onClick={() => setOpen(true)}><Smile /> Dental chart{n ? ` (${n})` : ''}</button>
      {open && <Modal wide title={`Dental chart · ${p.name}`} onClose={() => setOpen(false)}><DentalChart p={p} compact /></Modal>}
    </>
  )
}

export const planTotal = (tenant, teeth = {}) => Object.values(teeth).filter((t) => t.plan && !t.done).reduce((s, t) => s + priceFor(tenant, t.plan), 0)
export const fmtPlanTotal = (tenant, teeth) => money(planTotal(tenant, teeth))
