import { useEffect, useState } from 'react'
import { Sparkles, MessageCircle, Copy, MonitorPlay, ShieldCheck } from 'lucide-react'
import { useTenant, toast } from './ui'
import { db, auth } from '../lib/store'
import { whatsappLink, VideoPlayer } from './videos'

// AI analysis of lab and imaging reports.
// Lab values are read against their normal range with a built-in medical guide, so it works
// offline and costs nothing. Imaging findings are read from the radiologist's text.
// Every result is a suggestion for the doctor, who checks it before it goes to the patient.

const LAB = {
  Haemoglobin: { low: ['Low haemoglobin (anaemia)', 'Your blood has less haemoglobin than normal, which can cause tiredness and weakness.', 'Check iron studies, B12 and folate; consider iron and diet advice.'], high: ['High haemoglobin', 'Your haemoglobin is higher than usual, often from dehydration or smoking.', 'Repeat after hydration; rule out polycythaemia if it persists.'] },
  'WBC count': { low: ['Low white cells', 'Your infection-fighting cells are low, so infections can come easily.', 'Repeat CBC with differential; review medicines and viral illness.'], high: ['High white cells', 'Your body may be fighting an infection or inflammation.', 'Look for a source of infection; differential count and CRP.'] },
  Platelets: { low: ['Low platelets', 'The cells that stop bleeding are low, so bruising or bleeding can happen easily.', 'Repeat count; rule out dengue or viral fever; avoid aspirin and NSAIDs.'], high: ['High platelets', 'Platelets are higher than usual, often after infection or with low iron.', 'Repeat after recovery; check iron levels.'] },
  'Glucose (fasting)': { low: ['Low fasting sugar', 'Your sugar is lower than normal, which can cause shakiness or dizziness.', 'Review diabetes medicines and meal timing.'], high: ['High fasting sugar', 'Your fasting sugar is above normal; this can mean prediabetes or diabetes.', 'Confirm with HbA1c; diet, exercise and follow-up.'] },
  HbA1c: { high: ['High HbA1c', 'Your average sugar over the last 3 months is high.', '5.7–6.4% suggests prediabetes, 6.5% or more suggests diabetes; plan treatment and recheck in 3 months.'] },
  'Total cholesterol': { high: ['High cholesterol', 'Your cholesterol is high, which raises the risk of heart disease over time.', 'Diet and exercise advice; assess cardiovascular risk for statins.'] },
  LDL: { high: ['High LDL ("bad" cholesterol)', 'The "bad" cholesterol that can block blood vessels is high.', 'Lifestyle changes; consider a statin based on overall risk.'] },
  HDL: { low: ['Low HDL ("good" cholesterol)', 'The "good" cholesterol that protects the heart is low.', 'Encourage exercise, stop smoking, review weight.'] },
  Triglycerides: { high: ['High triglycerides', 'The fat in your blood is high, often linked to sugar, sweets and alcohol.', 'Cut sugar and alcohol; recheck fasting lipids.'] },
  TSH: { high: ['High TSH (underactive thyroid)', 'Your thyroid may be working slowly, which can cause tiredness and weight gain.', 'Check free T4; consider thyroxine.'], low: ['Low TSH (overactive thyroid)', 'Your thyroid may be working too fast, which can cause weight loss and a fast heartbeat.', 'Check free T3 and T4; refer if needed.'] },
  'SGPT (ALT)': { high: ['Raised liver enzyme (SGPT)', 'Your liver may be under strain, for example from fatty liver, alcohol or medicines.', 'Review alcohol and medicines; ultrasound abdomen if it stays high.'] },
  'Bilirubin total': { high: ['High bilirubin', 'Bilirubin is high, which can cause yellow eyes or skin (jaundice).', 'Check direct and indirect bilirubin and liver tests.'] },
}

// Words a radiologist uses, in simple language, with the usual next step.
const IMAGING = [
  [/deep caries|caries/i, 'Tooth decay', 'There is a cavity (decay) in the tooth.', 'Filling, or root canal if it is deep.', 'Root canal treatment'],
  [/approaching pulp|pulp/i, 'Decay close to the nerve', 'The decay has reached close to the nerve of the tooth, which can cause pain.', 'Root canal treatment is usually needed.', 'Root canal treatment'],
  [/periapical radiolucency|apical periodontitis/i, 'Infection at the root tip', 'There is an infection at the tip of the tooth root.', 'Root canal treatment, sometimes with antibiotics.', 'Root canal treatment'],
  [/impacted/i, 'Impacted wisdom tooth', 'A wisdom tooth is stuck under the gum and cannot come out properly.', 'Surgical removal if it causes pain or damage.', 'Tooth extraction'],
  [/bone levels normal|lung fields clear|no consolidation|cardiac size normal|normal sinus rhythm|no st-t/i, 'Normal finding', 'This part of the scan looks normal.', 'No action needed for this finding.', null],
  [/consolidation/i, 'Patch in the lung', 'There is a patch in the lung that can mean pneumonia.', 'Clinical correlation; antibiotics if infection.', null],
  [/effusion/i, 'Fluid around the lung', 'There is some fluid around the lung.', 'Further tests to find the cause.', null],
]

// How far outside the range: mild under 20 %, otherwise marked.
const severity = (r) => {
  const [lo, hi] = String(r.range).split('-').map((x) => parseFloat(x))
  const v = parseFloat(r.value)
  if (isNaN(v) || isNaN(lo) || isNaN(hi)) return 'mild'
  const off = r.flag === 'High' ? (v - hi) / (hi || 1) : (lo - v) / (lo || 1)
  return off > 0.2 ? 'marked' : 'mild'
}

export function analyseReport(rep) {
  const items = []
  ;(rep.results || []).filter((r) => r.flag).forEach((r) => {
    const g = LAB[r.param]?.[r.flag === 'High' ? 'high' : 'low']
    items.push({
      title: g?.[0] || `${r.flag} ${r.param}`,
      value: `${r.param} ${r.value} ${r.unit} (normal ${r.range})`,
      patient: g?.[1] || `${r.param} is ${r.flag.toLowerCase()}er than normal.`,
      next: g?.[2] || 'Doctor to review.',
      level: severity(r),
    })
  })
  const seen = new Set()
  if (rep.findings) {
    rep.findings.split(/\.\s*/).filter(Boolean).forEach((s) => {
      const m = IMAGING.find(([re]) => re.test(s))
      if (!m || seen.has(m[1])) return
      seen.add(m[1])
      items.push({ title: m[1], value: s.trim(), patient: m[2], next: m[3], treatment: m[4], level: m[4] ? 'marked' : 'ok' })
    })
  }
  const abnormal = items.filter((i) => i.level !== 'ok')
  const summary = !items.length
    ? (rep.results?.length ? 'All values are within the normal range.' : 'No findings to analyse yet.')
    : abnormal.length
      ? `${abnormal.length} finding${abnormal.length > 1 ? 's need' : ' needs'} attention: ${abnormal.map((i) => i.title.toLowerCase()).join(', ')}.`
      : 'Everything looks normal.'
  return { items, summary, abnormal: abnormal.length }
}

export function patientText(rep, a, name) {
  const lines = a.items.filter((i) => i.level !== 'ok').map((i) => `• ${i.patient}`)
  return `Hello ${name}, your ${rep.test} report is ready.\n${lines.length ? lines.join('\n') : 'Everything looks normal.'}\nPlease follow your doctor's advice. Do not start or stop medicines on your own.`
}

// The panel shown under a completed report.
export function ReportAI({ rep }) {
  const { patient, list } = useTenant()
  const [stage, setStage] = useState(0) // 0 thinking, 1 done
  const [play, setPlay] = useState(null)
  useEffect(() => { const t = setTimeout(() => setStage(1), 900); return () => clearTimeout(t) }, [rep.id])
  if (rep.status !== 'completed') return null
  const p = patient(rep.patientId)
  const a = analyseReport(rep)
  const text = patientText(rep, a, p?.name?.split(' ')[0] || '')
  const videoFor = (t) => t && list('videos').find((v) => v.procedure === t || v.title.toLowerCase().includes(t.toLowerCase()))
  return (
    <div className="ai-box no-print">
      <div className="ai-head"><Sparkles size={16} /> AI analysis <span className="ai-tag">suggestion</span></div>
      {stage === 0 ? (
        <div className="ai-think"><span /><span /><span /> Reading {rep.results?.length ? `${rep.results.length} values` : 'the findings'}…</div>
      ) : (
        <>
          <p className={`ai-sum ${a.abnormal ? 'warn' : 'ok'}`}>{a.summary}</p>
          {a.items.map((i) => {
            const v = videoFor(i.treatment)
            return (
              <div key={i.title} className={`ai-item ${i.level}`}>
                <div className="ai-item-head"><strong>{i.title}</strong>{i.level !== 'ok' && <span className={`ai-level ${i.level}`}>{i.level === 'marked' ? 'Needs attention' : 'Mild'}</span>}</div>
                <div className="small muted">{i.value}</div>
                <div className="small"><b>For the patient:</b> {i.patient}</div>
                <div className="small"><b>Suggested next step:</b> {i.next}</div>
                {v && <button className="btn sm" style={{ marginTop: 6 }} onClick={() => setPlay(v)}><MonitorPlay /> Explain with video: {v.title}</button>}
              </div>
            )
          })}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {p?.phone && <a className="btn sm primary" href={whatsappLink(p.phone, text)} target="_blank" rel="noreferrer"><MessageCircle /> Send simple explanation on WhatsApp</a>}
            <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(text); toast('Explanation copied') }}><Copy /> Copy</button>
          </div>
          <div className="small muted ai-safe"><ShieldCheck size={13} /> AI only suggests. The doctor checks before anything is shared with the patient.</div>
        </>
      )}
      {play && <VideoPlayer video={play} patientId={rep.patientId} onClose={() => setPlay(null)} />}
    </div>
  )
}

// X-ray or photo: explain what the doctor tagged in simple words; demo clinics also show a sample AI read.
// Real AI read of an X-ray, photo or photographed lab report (api/ai.php, Claude vision).
// If AI is not switched on for the server yet, it says so and shows a clearly labelled sample.
async function asDataUrl(src) {
  if (src.startsWith('data:')) return src
  const b = await (await fetch(src)).blob()
  return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(b) })
}
export async function aiRead(tenant, token, payload) {
  const r = await fetch(`${import.meta.env.BASE_URL}api/ai.php?t=${encodeURIComponent(tenant.slug)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  })
  let res = {}
  try { res = await r.json() } catch {}
  if (res.off) return { off: true }
  if (!r.ok || res.error) throw new Error(res.error || 'The AI could not read this just now. Please try again.')
  return res
}

const SEV = { normal: 'ok', mild: 'mild', moderate: 'marked', urgent: 'marked' }
const SEV_TEXT = { mild: 'Mild', moderate: 'Needs attention', urgent: 'Urgent' }

export function ImageAI({ im, src }) {
  const { tid, tenant, patient, list } = useTenant()
  const [stage, setStage] = useState(im.ai ? 'done' : 'idle') // idle | busy | done | sample | error
  const [read, setRead] = useState(im.ai || null)
  const [err, setErr] = useState('')
  const [hindi, setHindi] = useState(false)
  const p = patient(im.patientId)
  const run = async () => {
    setStage('busy')
    setErr('')
    try {
      const age = p?.dob ? `${Math.floor((Date.now() - new Date(p.dob)) / 3.156e10)} years` : p?.ageYears ? `${p.ageYears} years` : ''
      const res = await aiRead(tenant, auth.token(tid), { kind: im.kind, area: im.area, note: im.note, age, gender: p?.gender, clinic: tenant.kind, image: await asDataUrl(src) })
      if (res.off) return setStage('sample')
      setRead(res.read)
      setStage('done')
      db.update(tid, 'images', im.id, { ai: res.read, aiAt: res.at })
    } catch (e) {
      setErr(e.message)
      setStage('error')
    }
  }
  const saveReport = () => {
    const results = read.lab_values.map((v) => ({ param: v.test, value: isNaN(parseFloat(v.value)) ? v.value : parseFloat(v.value), unit: v.unit, range: v.range, flag: v.flag }))
    db.add(tid, 'reports', { patientId: im.patientId, doctorId: '', date: im.date, test: read.kind_detected || 'Lab report', category: 'Pathology', price: 0, status: 'completed', results, findings: read.summary, completedDate: im.date, source: 'AI read of report photo', imageId: im.id })
    db.update(tid, 'images', im.id, { reportSaved: true })
    toast('Saved as a lab report on the patient’s file')
  }
  const text = read && `Hello ${p?.name?.split(' ')[0] || ''}, about your ${im.kind.toLowerCase()} from ${tenant.short || tenant.name}:\n${hindi ? read.patient_explanation_hi : read.patient_explanation}\nPlease follow your doctor's advice.`
  // The old sample, kept for servers where AI is not switched on yet; always labelled as a sample.
  const sample = { 'Root canal treatment': 'Deep decay reaching the nerve, with a dark area at the root tip (infection).', 'Tooth extraction': 'Tooth badly broken down / impacted; cannot be saved.', 'Scaling & polishing': 'Tartar deposits along the gum line; early bone loss.', 'Composite filling': 'Small cavity in the enamel, not near the nerve.' }
  const sampleA = analyseReport({ findings: `${sample[im.treatment] || im.note || ''}. ${im.note || ''}` })
  const v = read && list('videos').find((x) => read.findings.some((f) => x.procedure && (f.title + f.detail).toLowerCase().includes(x.procedure.toLowerCase())))
  return (
    <div className="ai-box no-print">
      <div className="ai-head"><Sparkles size={16} /> AI read <span className="ai-tag">suggestion for the doctor</span></div>
      {stage === 'idle' && <div style={{ padding: 12 }}><button className="btn sm primary" onClick={run}><Sparkles /> Read this {im.kind.toLowerCase()} with AI</button><div className="small muted" style={{ marginTop: 6 }}>Takes about 20 to 40 seconds.</div></div>}
      {stage === 'busy' && <div className="ai-think"><span /><span /><span /> Reading the {im.kind.toLowerCase()}… this takes about half a minute</div>}
      {stage === 'error' && <div style={{ padding: 12 }} className="stack"><div className="small" style={{ color: 'var(--bad)' }}>{err}</div><button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={run}>Try again</button></div>}
      {stage === 'sample' && (
        <>
          <p className="ai-sum warn">Live AI reading is not switched on yet. Sample read: {sample[im.treatment] || im.note || 'no finding marked'}</p>
          {sampleA.items.filter((i) => i.level !== 'ok').map((i) => <div key={i.title} className="ai-item marked"><strong>{i.title}</strong><div className="small"><b>For the patient:</b> {i.patient}</div></div>)}
        </>
      )}
      {stage === 'done' && read && (
        <>
          <p className={`ai-sum ${read.findings.some((f) => f.severity !== 'normal') || read.lab_values.some((l) => l.flag) ? 'warn' : 'ok'}`}><b>{read.kind_detected}.</b> {read.summary}</p>
          {read.findings.map((f, k) => (
            <div key={k} className={`ai-item ${SEV[f.severity] || 'mild'}`}>
              <div className="ai-item-head"><strong>{f.title}</strong>{f.severity !== 'normal' && <span className={`ai-level ${SEV[f.severity]}`}>{SEV_TEXT[f.severity]}</span>}</div>
              {f.location && <div className="small muted">{f.location}</div>}
              <div className="small">{f.detail}</div>
            </div>
          ))}
          {read.lab_values.length > 0 && (
            <table className="mini-table" style={{ margin: '8px 0' }}><tbody>
              {read.lab_values.map((l, k) => <tr key={k}><td>{l.test}</td><td className="tabular" style={{ fontWeight: l.flag ? 700 : 400, color: l.flag ? 'var(--bad)' : undefined }}>{l.value} {l.unit}</td><td className="muted small">{l.range}</td><td>{l.flag}</td></tr>)}
            </tbody></table>
          )}
          {read.next_steps.length > 0 && <div className="small" style={{ padding: '4px 2px' }}><b>Suggested next steps:</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{read.next_steps.map((n, k) => <li key={k}>{n}</li>)}</ul></div>}
          <div className="ai-item ok">
            <div className="ai-item-head"><strong>For the patient</strong><button className="btn sm ghost" onClick={() => setHindi(!hindi)}>{hindi ? 'English' : 'हिंदी'}</button></div>
            <div className="small">{hindi ? read.patient_explanation_hi : read.patient_explanation}</div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {p?.phone && <a className="btn sm primary" href={whatsappLink(p.phone, text)} target="_blank" rel="noreferrer"><MessageCircle /> Send explanation on WhatsApp</a>}
            {v && <span className="small muted"><MonitorPlay size={13} /> Related video: {v.title}</span>}
            {read.lab_values.length > 0 && !im.reportSaved && <button className="btn sm" onClick={saveReport}>Save values as a lab report</button>}
            <button className="btn sm ghost" onClick={run}>Read again</button>
          </div>
          {read.limitations && <div className="small muted" style={{ marginTop: 6 }}>Limits: {read.limitations}</div>}
          <div className="small muted ai-safe"><ShieldCheck size={13} /> AI only suggests. The doctor checks the image before anything is told to the patient.</div>
        </>
      )}
    </div>
  )
}
