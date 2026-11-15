import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, CheckCircle2, HeartPulse, Minus, Zap, History, Save, Sparkles } from 'lucide-react'
import { VisitForm, vitalsText } from '../components/visits'
import { useTenant, Card, Input, Select, Textarea, toast, Pill } from '../components/ui'
import { PatientHeader } from './Patients'
import { VideoPlayer } from '../components/videos'
import { MonitorPlay, PlayCircle } from 'lucide-react'
import { db } from '../lib/store'
import { LAB_CATALOG } from '../lib/seed'
import { fmtDate, fmtTime, money, today, age, addDays } from '../lib/utils'
import { slotsOn } from '../lib/slots'
import { HISTORY, historyFor, usePad } from '../components/rxpad'
import { PrescriptionDoc } from '../components/docs'
import { groupByLanguage } from '../lib/healthvideos'
import { FileText, Mic } from 'lucide-react'
import { VoiceRx } from '../components/voice'

// One-tap timings, written the way doctors write them (1-0-1) with the words patients read.
const QUICK_FREQ = [['1-0-0', 'Once a day'], ['1-0-1', 'Twice a day'], ['1-1-1', 'Three times a day'], ['0-0-1', 'At night'], ['SOS', 'When needed for pain']]
const ADVICE = {
  dental: ['Take medicines after food', 'Avoid hard and sticky food', 'Warm salt water rinse 3 times a day', 'Do not spit or rinse for 24 hours', 'Soft, cold diet today', 'Brush twice a day with a soft brush'],
  general: ['Take medicines after food', 'Drink plenty of water', 'Rest for 2 days', 'Come back if fever or pain increases', 'Avoid oily and spicy food'],
}
// Starting one-tap sets for a dental clinic; the doctor edits them, saves their own and removes any.
const DENTAL_SETS = [
  [['Amoxicillin 500 mg', '1 cap', 'Three times a day', 5], ['Ketorolac 10 mg', '1 tab', 'When needed for pain', 3]],
  [['Metronidazole 400 mg', '1 tab', 'Three times a day', 5], ['Ibuprofen 400 mg', '1 tab', 'Twice a day after food', 3]],
  [['Chlorhexidine mouthwash', '10 ml', 'Twice a day', 14]],
  [['Sensitivity toothpaste', 'Apply', 'Twice a day', 30]],
]
const BLANK = () => ({ name: '', dose: '1 tab', freq: 'Twice a day', days: 5 })
const setLabel = (set) => set.map((x) => x[0].replace(/\s+\d.*$/, '')).join(' + ')
const FREQ = ['Once a day', 'Twice a day', 'Three times a day', 'At night', 'Before breakfast', 'Twice a day after food', 'When needed for pain', 'Once a week']

export default function Consult() {
  const { id } = useParams()
  const { tid, tenant, list, patient, staff, doctors, base } = useTenant()
  const nav = useNavigate()
  const appt = list('appointments').find((a) => a.id === id)
  const p = appt && patient(appt.patientId)
  // One login is shared by the clinic's doctors, so the doctor writing this prescription is picked here.
  const [docId, setDocId] = useState(appt?.doctorId)
  const doc = appt && (staff(docId) || staff(appt.doctorId))
  const docs = doctors()
  const meds = list('medicines')
  const [dx, setDx] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([BLANK()])
  const [tests, setTests] = useState([])
  const [procs, setProcs] = useState([])
  const [err, setErr] = useState('')
  const [play, setPlay] = useState(null)
  const [vitals, setVitals] = useState(false)
  const [plan, setPlan] = useState(null)
  const [nextDate, setNextDate] = useState('')
  const [nextTime, setNextTime] = useState('11:00')
  const [co, setCo] = useState(null)
  const [oe, setOe] = useState('')
  const [hist, setHist] = useState(() => historyFor(appt && patient(appt.patientId)))
  const [histNote, setHistNote] = useState(() => (appt && patient(appt.patientId)?.historyNote) || '')
  const [preview, setPreview] = useState(false)
  const [voice, setVoice] = useState(false)
  const pad = usePad()
  if (!appt || !p) return <div className="empty">Appointment not found.</div>
  const visit = list('visits').find((v) => v.appointmentId === appt.id) || list('visits').find((v) => v.patientId === p.id && v.date === appt.date && v.status !== 'done')

  const history = list('prescriptions').filter((r) => r.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  const reports = list('reports').filter((r) => r.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  const upd = (i, k, v) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)))
  const dental = /dental/i.test(tenant.kind || '')
  const sets = tenant.rxSets || (dental ? DENTAL_SETS : [])
  const filled = lines.filter((l) => l.name.trim())
  // Add medicines to the pad, filling the empty row first and skipping any already written.
  const addMeds = (items) => {
    const have = new Set(filled.map((l) => l.name.trim().toLowerCase()))
    const fresh = items.filter((m) => !have.has(m.name.toLowerCase()))
    if (!fresh.length) return toast('Already on the prescription')
    setLines([...filled, ...fresh])
  }
  const applySet = (set) => addMeds(set.map(([name, dose, freq, days]) => ({ name, dose, freq, days })))
  const last = history[0]
  const quickMeds = [...new Set([...sets.flat().map((x) => x[0]), ...meds.map((m) => m.name)])].filter((n) => !filled.some((l) => l.name === n)).slice(0, 8)
  const doseFor = (name) => sets.flat().find((x) => x[0] === name)?.[1] || (/mouthwash|syrup/i.test(name) ? '10 ml' : /paste|gel/i.test(name) ? 'Apply' : /cap/i.test(meds.find((m) => m.name === name)?.form || '') ? '1 cap' : '1 tab')
  const saveSet = () => {
    if (!filled.length) return
    const set = filled.map((l) => [l.name.trim(), l.dose, l.freq, +l.days])
    db.updateTenant(tid, { rxSets: [...sets, set] })
    toast(`Saved “${setLabel(set)}” as a quick set`)
  }
  const addAdvice = (a) => setNotes((n) => (n.includes(a) ? n : n.trim() ? `${n.trim()}. ${a}` : a))
  const enterNext = (i) => (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (i === lines.length - 1 && lines[i].name.trim()) setLines([...lines, BLANK()])
    setTimeout(() => document.getElementById(`cs-m${i + 1}`)?.focus(), 30)
  }
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const allergic = p.allergies && lines.some((l) => l.name && p.allergies.toLowerCase().includes('penicillin') && /amoxi|penicillin/i.test(l.name))

  const complaint = co ?? (visit?.complaint || (appt.reason !== 'Consultation' ? appt.reason : '') || '')
  const draftItems = () => lines.filter((l) => l.name.trim()).map((l) => ({ name: l.name, dose: l.dose, freq: l.freq, days: +l.days }))
  const extra = () => ({ complaint: complaint.trim(), findings: oe.trim(), history: hist, historyNote: hist.includes('Others') ? histNote.trim() : '', tests, done: procs })
  const draft = { id: 'Draft', patientId: p.id, doctorId: doc.id, date: today(), diagnosis: dx, notes, items: draftItems(), ...extra(), ...(nextDate ? { nextVisit: nextDate } : {}) }

  const busyNext = new Set(nextDate ? list('appointments').filter((a) => a.doctorId === doc.id && a.date === nextDate && !['cancelled', 'no-show'].includes(a.status)).map((a) => a.time) : [])
  const nextFree = nextDate ? slotsOn(tenant, nextDate).filter((t) => !busyNext.has(t)) : []
  const nextT = nextFree.includes(nextTime) ? nextTime : nextFree[0]

  const finish = () => {
    if (!dx.trim()) return setErr('Add a diagnosis before completing the visit.')
    if (nextDate && !nextT) return setErr('No free slot on the next-visit date. Pick another day.')
    const items = lines.filter((l) => l.name.trim()).map((l) => {
      const m = meds.find((x) => x.name === l.name)
      const per = /Three/.test(l.freq) ? 3 : /Twice/.test(l.freq) ? 2 : /week/.test(l.freq) ? 1 / 7 : 1
      return { medicineId: m?.id, name: l.name, dose: l.dose, freq: l.freq, days: +l.days, qty: m && ['Tablet', 'Capsule'].includes(m.form) ? Math.ceil(per * l.days) : 1 }
    })
    if (doc.id !== appt.doctorId) db.update(tid, 'appointments', appt.id, { doctorId: doc.id })
    const rx = db.add(tid, 'prescriptions', { patientId: p.id, doctorId: doc.id, appointmentId: appt.id, date: today(), diagnosis: dx, notes, items, dispensed: false, ...extra(), ...(nextDate ? { nextVisit: nextDate } : {}) })
    tests.forEach((t) => db.add(tid, 'reports', { patientId: p.id, doctorId: doc.id, date: today(), test: t, category: LAB_CATALOG[t].category, price: LAB_CATALOG[t].price, status: 'ordered', results: [], findings: '', completedDate: '' }))
    const bill = db.add(tid, 'bills', {
      patientId: p.id, date: today(), source: 'OPD', ref: appt.id, discount: 0, paid: 0, mode: 'UPI',
      items: [
        { desc: `Consultation · ${doc.name}`, qty: 1, rate: doc.fee },
        ...procs.map((n) => ({ desc: n, qty: 1, rate: tenant.services.find((s) => s[0] === n)[1] })),
        ...tests.map((t) => ({ desc: t, qty: 1, rate: LAB_CATALOG[t].price })),
      ],
    })
    db.update(tid, 'appointments', appt.id, { status: 'completed', prescriptionId: rx.id })
    if (JSON.stringify(hist) !== JSON.stringify(p.history) || histNote.trim() !== (p.historyNote || '')) db.update(tid, 'patients', p.id, { history: hist, historyNote: histNote.trim() })
    if (plan !== null && plan.trim() !== (p.plan || '')) db.update(tid, 'patients', p.id, { plan: plan.trim(), planOn: today(), planBy: doc.id })
    if (nextDate) db.add(tid, 'appointments', { patientId: p.id, doctorId: doc.id, date: nextDate, time: nextT, reason: (plan ?? p.plan ?? '').split('\n')[0].replace(/^\d+\.\s*/, '').slice(0, 60) || 'Follow-up', status: 'scheduled', type: 'OPD' })
    if (visit) db.update(tid, 'visits', visit.id, { status: 'done', appointmentId: appt.id, prescriptionId: rx.id, doctorId: doc.id })
    else db.add(tid, 'visits', { patientId: p.id, date: today(), time: appt.time, status: 'done', source: 'appointment', complaint: appt.reason, doctorId: doc.id, appointmentId: appt.id, prescriptionId: rx.id, vitals: {} })
    toast(`Visit completed. Prescription ${rx.id} and bill ${bill.id} sent to the front desk.${nextDate ? ` Next visit booked for ${fmtDate(nextDate)} at ${fmtTime(nextT)}.` : ''}`)
    nav(`${base}/patients/${p.id}`)
  }

  return (
    <>
      <PatientHeader p={p} back={() => nav(-1)}>
        <div className="consult-vitals">
          <div className="small muted">{fmtDate(appt.date)} · {fmtTime(appt.time)}{appt.reason ? ` · ${appt.reason}` : ''}</div>
          <div className="row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <HeartPulse size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ minWidth: 0 }}><strong>Today’s vitals</strong>{visit?.complaint && <span className="muted"> · {visit.complaint}</span>}<div className="small">{(visit && vitalsText(visit.vitals)) || 'Not taken yet'}</div></div>
            <button className="btn sm ghost" style={{ marginLeft: 'auto' }} onClick={() => setVitals(true)}>{visit && vitalsText(visit.vitals) ? 'Edit' : 'Add'}</button>
          </div>
          {dental && <button className="btn sm smile-link" onClick={() => nav(`${base}/smile`)}><Sparkles /> AI Smile preview</button>}
        </div>
      </PatientHeader>
      {voice && <VoiceRx medNames={[...new Set([...sets.flat().map((x) => x[0]), ...meds.map((m) => m.name)])]} onClose={() => setVoice(false)} onApply={(v) => {
        if (v.complaint) setCo(v.complaint)
        if (v.findings) setOe(v.findings)
        if (v.diagnosis) setDx(v.diagnosis.charAt(0).toUpperCase() + v.diagnosis.slice(1))
        if (v.meds.length) addMeds(v.meds.map((m) => (m.dose === '1 tab' ? { ...m, dose: doseFor(m.name) } : m)))
        if (v.advice) addAdvice(v.advice.charAt(0).toUpperCase() + v.advice.slice(1))
        if (v.nextDays) setNextDate(addDays(today(), v.nextDays))
        setVoice(false)
        toast('Prescription filled from your voice. Please check it.')
      }} />}
      {vitals && <VisitForm patientId={p.id} onClose={() => setVitals(false)} />}
      {allergic && <div className="card pad" style={{ borderColor: 'var(--bad)', color: 'var(--bad)', fontWeight: 600 }}>Allergy alert: {p.name} is allergic to {p.allergies}. Check the antibiotic before you sign.</div>}
      <div className="grid consult-grid">
        <div className="stack">
          <Card title="Prescription pad" actions={<><button className="btn sm voice-btn" onClick={() => setVoice(true)}><Mic /> Speak prescription</button><button className="btn sm" onClick={() => setPreview(true)}><FileText /> See printed pad</button></>}>
            <div className="stack">
              <div className="pad-strip">
                <span>OPD No. <b>{p.opdNo || p.id}</b></span>
                <span>Date <b>{fmtDate(today())}</b></span>
                <span>Age/Sex <b>{p.dob ? `${age(p.dob)} y` : '–'} / {p.gender || '–'}</b></span>
                <span style={{ flexBasis: '100%' }}>Name <b>{p.name}</b></span>
                {docs.length > 1 && (
                  <label className="pad-doc" style={{ flexBasis: '100%' }}>Doctor
                    <select className="input" value={doc.id} onChange={(e) => setDocId(e.target.value)}>
                      {docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </label>
                )}
              </div>
              <div className="field"><span>Medical history (tick what applies)</span></div>
              <div className="hist-chips">
                {(pad.history || HISTORY).map((h) => (
                  <label key={h} className={`hist-chip${hist.includes(h) ? ' on' : ''}`}>
                    <input type="checkbox" checked={hist.includes(h)} onChange={() => toggle(hist, setHist, h)} /> {h}
                  </label>
                ))}
              </div>
              {hist.includes('Others') && <Input id="cs-hist-o" label="Other history" value={histNote} onChange={(e) => setHistNote(e.target.value)} placeholder="e.g. On blood thinners" />}
              <div className="grid g2">
                <Textarea id="cs-co" label="C/O (patient’s complaint)" rows={2} value={complaint} onChange={(e) => setCo(e.target.value)} placeholder="e.g. Pain in lower left back tooth, 3 days" />
                <Textarea id="cs-oe" label="O/E (what you found)" rows={2} value={oe} onChange={(e) => setOe(e.target.value)} placeholder="e.g. Deep caries 36, tender on percussion" />
              </div>
              <Input id="cs-dx" label="Diagnosis" list="dx-list" value={dx} onChange={(e) => setDx(e.target.value)} placeholder="Start typing" />
              <datalist id="dx-list">{tenant.diagnoses.map((d) => <option key={d} value={d} />)}</datalist>
              {tenant.diagnoses?.length > 0 && (
                <div className="quick-chips" aria-label="Common diagnoses">
                  {tenant.diagnoses.slice(0, 8).map((d) => <button key={d} type="button" className={`qchip ${dx === d ? 'on' : ''}`} onClick={() => setDx(dx === d ? '' : d)}>{d}</button>)}
                </div>
              )}
              <div className="rx-head">
                <span className="field"><span><span className="pad-rx-mark">℞</span> Medicines</span></span>
                <span className="row" style={{ gap: 6 }}>
                  {last?.items?.length > 0 && <button type="button" className="btn sm" onClick={() => addMeds(last.items.map((x) => ({ name: x.name, dose: x.dose, freq: x.freq, days: x.days })))} title={`From ${fmtDate(last.date)}`}><History /> Repeat last</button>}
                  {filled.length > 0 && <button type="button" className="btn sm ghost" onClick={saveSet} title="Save these medicines as a one-tap set"><Save /> Save as set</button>}
                </span>
              </div>
              {sets.length > 0 && (
                <div className="quick-chips sets" aria-label="Quick sets">
                  <span className="qlabel"><Zap /> Quick sets</span>
                  {sets.map((set, k) => (
                    <span key={k} className="qchip set">
                      <button type="button" onClick={() => applySet(set)} title={set.map((x) => `${x[0]} · ${x[2]} · ${x[3]} days`).join('\n')}>{setLabel(set)}</button>
                      <button type="button" className="qx" aria-label={`Remove set ${setLabel(set)}`} title="Remove this set" onClick={() => { db.updateTenant(tid, { rxSets: sets.filter((_, j) => j !== k) }); toast('Quick set removed') }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="rx-cards">
                {lines.map((l, i) => (
                  <div key={i} className="rx-card">
                    <span className="rx-n">{i + 1}</span>
                    <div className="rx-main">
                      <div className="rx-top">
                        <input id={`cs-m${i}`} className="input rx-name" list="med-list" value={l.name} onChange={(e) => upd(i, 'name', e.target.value)} onKeyDown={enterNext(i)} placeholder="Type a medicine, press Enter for the next" aria-label="Medicine" />
                        <input id={`cs-d${i}`} className="input rx-dose" value={l.dose} onChange={(e) => upd(i, 'dose', e.target.value)} aria-label="Dose" />
                      </div>
                      <div className="rx-bottom">
                        <span className="seg" role="radiogroup" aria-label="When">
                          {QUICK_FREQ.map(([code, f]) => <button key={code} type="button" role="radio" aria-checked={l.freq === f} className={l.freq === f ? 'on' : ''} title={f} onClick={() => upd(i, 'freq', f)}>{code}</button>)}
                          <select value={QUICK_FREQ.some((q) => q[1] === l.freq) ? '' : l.freq} onChange={(e) => e.target.value && upd(i, 'freq', e.target.value)} aria-label="Other timing" className={QUICK_FREQ.some((q) => q[1] === l.freq) ? '' : 'on'}>
                            <option value="">More…</option>
                            {FREQ.filter((f) => !QUICK_FREQ.some((q) => q[1] === f)).map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </span>
                        <span className="stepper" aria-label="Days">
                          <button type="button" onClick={() => upd(i, 'days', Math.max(1, +l.days - 1))} aria-label="One day less"><Minus /></button>
                          <input id={`cs-n${i}`} type="number" min="1" value={l.days} onChange={(e) => upd(i, 'days', e.target.value)} aria-label="Days" />
                          <span className="small muted">days</span>
                          <button type="button" onClick={() => upd(i, 'days', +l.days + 1)} aria-label="One day more"><Plus /></button>
                        </span>
                        <span className="small muted rx-say">{l.freq}</span>
                      </div>
                    </div>
                    <button className="btn ghost sm rx-del" onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : [BLANK()])} aria-label="Remove"><Trash2 /></button>
                  </div>
                ))}
              </div>
              <datalist id="med-list">{meds.map((m) => <option key={m.id} value={m.name}>{m.stock} in stock</option>)}</datalist>
              <div className="quick-chips" aria-label="Add a medicine">
                <button type="button" className="qchip add" onClick={() => { setLines([...lines, BLANK()]); setTimeout(() => document.getElementById(`cs-m${lines.length}`)?.focus(), 30) }}><Plus /> Add medicine</button>
                {quickMeds.map((n) => <button key={n} type="button" className="qchip" onClick={() => addMeds([{ ...BLANK(), name: n, dose: doseFor(n) }])}>+ {n}</button>)}
              </div>
              <Textarea id="cs-notes" label="Advice for the patient" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Avoid hard food on the left side" />
              <div className="quick-chips" aria-label="Common advice">
                {ADVICE[dental ? 'dental' : 'general'].map((a) => <button key={a} type="button" className={`qchip ${notes.includes(a) ? 'on' : ''}`} onClick={() => addAdvice(a)}>{a}</button>)}
              </div>
              <Textarea id="cs-plan" label="Treatment plan (what happens next)" rows={3} value={plan ?? p.plan ?? ''} onChange={(e) => setPlan(e.target.value)} placeholder={'e.g. 1. RCT 36, second sitting\n2. Crown on 36'} />
              <div className="grid g2">
                <Input id="cs-next" label="Next visit (books it)" type="date" min={today()} value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
                {!nextDate ? <div className="field"><span>Time</span><div className="small muted">Pick a date first</div></div>
                  : nextFree.length ? <Select id="cs-next-t" label={`Time (${nextFree.length} free)`} value={nextT} onChange={(e) => setNextTime(e.target.value)} options={nextFree.map((t) => ({ value: t, label: fmtTime(t) }))} />
                  : <div className="field"><span>Time</span><div className="small" style={{ color: 'var(--bad)' }}>Clinic closed or full that day</div></div>}
              </div>
              <div className="row" style={{ gap: 6 }}>
                {[['1 week', 7], ['2 weeks', 14], ['1 month', 30], ['3 months', 90], ['6 months', 180]].map(([l, n]) => {
                  const d = addDays(today(), n)
                  return <button key={l} className={`btn sm ${nextDate === d ? 'primary' : ''}`} onClick={() => setNextDate(nextDate === d ? '' : d)}>{l}</button>
                })}
              </div>
            </div>
          </Card>
          <div className="grid g2">
            <Card title="Order tests">
              <div className="stack" style={{ gap: 6 }}>
                {tenant.tests.map((t) => (
                  <label key={t} className="row" style={{ cursor: 'pointer', flexWrap: 'nowrap' }}>
                    <input type="checkbox" checked={tests.includes(t)} onChange={() => toggle(tests, setTests, t)} />
                    <span style={{ flex: 1 }}>{t}</span><span className="muted small tabular">{money(LAB_CATALOG[t].price)}</span>
                  </label>
                ))}
              </div>
            </Card>
            <Card title="Procedures done today">
              <div className="stack" style={{ gap: 6 }}>
                {tenant.services.slice(1).map(([n, r]) => (
                  <label key={n} className="row" style={{ cursor: 'pointer', flexWrap: 'nowrap' }}>
                    <input type="checkbox" checked={procs.includes(n)} onChange={() => toggle(procs, setProcs, n)} />
                    <span style={{ flex: 1 }}>{n}</span><span className="muted small tabular">{money(r)}</span>
                  </label>
                ))}
              </div>
            </Card>
          </div>
          {err && <div style={{ color: 'var(--bad)' }}>{err}</div>}
          <div className="row consult-actions">
            <button className="btn primary lg" onClick={finish}><CheckCircle2 /> Complete visit and send bill</button>
            <span className="muted small">Bill: consultation {money(doc.fee)}{procs.length + tests.length ? ` + ${procs.length + tests.length} items` : ''}</span>
          </div>
        </div>
        <div className="stack">
          <ExplainCard doc={doc} patientId={p.id} onPlay={setPlay} />
          <Card title="Past prescriptions">
            {history.length ? history.map((r) => (
              <div key={r.id} className="tl-item" style={{ gridTemplateColumns: '1fr' }}>
                <div className="small muted">{fmtDate(r.date)} · {staff(r.doctorId)?.name}</div>
                <div style={{ fontWeight: 600 }}>{r.diagnosis}</div>
                <div className="small">{r.items.map((i) => i.name).join(', ')}</div>
              </div>
            )) : <div className="muted small">First visit, nothing on record.</div>}
          </Card>
          <Card title="Recent reports">
            {reports.length ? reports.map((r) => (
              <div key={r.id} className="row between" style={{ padding: '6px 0' }}>
                <span><strong>{r.test}</strong><div className="small muted">{fmtDate(r.date)}</div></span>
                <Pill status={r.status === 'completed' ? (r.results.some((x) => x.flag) ? 'red' : 'ok') : 'ordered'}>{r.status === 'completed' ? (r.results.some((x) => x.flag) ? 'Abnormal' : 'Normal') : 'In lab'}</Pill>
              </div>
            )) : <div className="muted small">No reports yet.</div>}
          </Card>
        </div>
      </div>
      {preview && <PrescriptionDoc rx={draft} title="Prescription pad · preview" onClose={() => setPreview(false)} />}
      {play && <VideoPlayer video={play} patientId={p.id} onClose={() => setPlay(null)} />}
    </>
  )
}

// One row per treatment; Hindi / English picks which video Show and Share use.
function ExplainRow({ g, patientId, onPlay }) {
  const v = g.main
  return (
    <div className="vid-row">
      <div style={{ flex: 1, minWidth: 140 }}><div style={{ fontWeight: 600, lineHeight: 1.3 }}>{v.builtIn && v.procedure ? v.procedure : v.title}</div><div className="small muted">{v.minutes} min</div></div>
      <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
        {g.items.map((x) => (
          <button key={x.id} className="btn sm primary" onClick={() => onPlay(x)} title={`Play ${x.lang || ''} video`}>
            <PlayCircle /> {g.items.length > 1 ? (x.lang === 'Hindi' ? 'हिंदी' : x.lang || 'Play') : 'Play'}
          </button>
        ))}
      </span>
    </div>
  )
}

// Videos for this doctor's speciality first, then the rest of the library.
function ExplainCard({ doc, patientId, onPlay }) {
  const { list, can } = useTenant()
  if (!can('education')) return null
  const all = list('videos')
  const mine = all.filter((v) => v.speciality === doc.dept || (doc.dept === 'Dental Surgery' || doc.dept === 'Orthodontics') && v.speciality === 'Dental')
  const vids = groupByLanguage([...mine, ...all.filter((v) => !mine.includes(v))]).slice(0, 5)
  return (
    <Card title={<h2><MonitorPlay size={17} style={{ verticalAlign: '-3px' }} /> Explain to patient</h2>}>
      {vids.map((g) => <ExplainRow key={g.main.id} g={g} patientId={patientId} onPlay={onPlay} />)}
    </Card>
  )
}
