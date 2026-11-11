// Chat-style self-registration that patients open from the clinic's QR code or a
// shared link. One question at a time, big tap targets, works on any phone.
import { useEffect, useRef, useState } from 'react'
import { HeartPulse, Send, CheckCircle2 } from 'lucide-react'
import { useTenant } from '../components/ui'
import { db } from '../lib/store'
import { today, age } from '../lib/utils'

const STEPS = [
  { key: 'name', ask: (t) => `Namaste! Welcome to ${t.name}. I’ll get you registered in under a minute. What is your full name?`, type: 'text', placeholder: 'Full name', check: (v) => v.trim().length > 1 || 'Please type your full name.' },
  { key: 'phone', ask: (_, a) => `Thanks, ${a.name.split(' ')[0]}. What’s your mobile number? We’ll send appointment reminders here.`, type: 'tel', placeholder: '10-digit mobile', check: (v) => /^[6-9]\d{9}$/.test(v.replace(/\D/g, '').slice(-10)) || 'That doesn’t look like a 10-digit Indian mobile number.' , clean: (v) => v.replace(/\D/g, '').slice(-10) },
  { key: 'dob', ask: () => 'What is your date of birth?', type: 'date', check: (v) => (v && v < today()) || 'Please pick your date of birth.', show: (v) => `${new Date(v + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${age(v)} years)` },
  { key: 'gender', ask: () => 'And you are…', chips: [['F', 'Female'], ['M', 'Male'], ['O', 'Other']] },
  { key: 'blood', ask: () => 'Do you know your blood group?', chips: ['O+', 'B+', 'A+', 'AB+', 'O-', 'B-', 'A-', 'AB-', ['', 'I don’t know']] },
  { key: 'allergies', ask: () => 'Are you allergic to any medicine?', chips: [['', 'No allergies'], 'Penicillin', 'Sulpha drugs', 'Aspirin'], other: 'Type another allergy' },
  { key: 'conditions', ask: () => 'Any ongoing health conditions?', chips: [['', 'None'], 'Diabetes', 'High BP', 'Thyroid', 'Asthma', 'Heart condition'], other: 'Type another condition' },
  { key: 'address', ask: () => 'Your area or address? (You can skip this.)', type: 'text', placeholder: 'e.g. Mowa, Raipur', skip: true },
  { key: 'emergencyContact', ask: () => 'Someone we can call in an emergency? Name and number. (Optional)', type: 'text', placeholder: 'e.g. Ravi · 98xxxxxxxx', skip: true },
  { key: 'reason', ask: () => 'What brings you in today?', type: 'text', placeholder: 'e.g. Tooth pain', skip: true },
  { key: 'consent', ask: (t) => `Last step. Do you agree that ${t.name} can keep these details and your medical records for your treatment? You can ask the clinic to delete them any time.`, chips: [['yes', 'Yes, I agree']] },
]

export default function SelfRegister() {
  const { tenant, tid } = useTenant()
  const [answers, setAnswers] = useState({})
  const [step, setStep] = useState(0)
  const [log, setLog] = useState([{ from: 'bot', text: STEPS[0].ask(tenant, {}) }])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [otherOpen, setOtherOpen] = useState(false)
  const [done, setDone] = useState(null)
  const end = useRef(null)
  const cur = STEPS[step]

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [log, typing, done])

  const answer = (value, label) => {
    if (cur.check) {
      const ok = cur.check(value)
      if (ok !== true) { setLog((l) => [...l, { from: 'me', text: label ?? value }, { from: 'bot', text: ok, warn: true }]); setInput(''); return }
    }
    const v = cur.clean ? cur.clean(value) : value
    const next = { ...answers, [cur.key]: v }
    setAnswers(next)
    setInput('')
    setOtherOpen(false)
    setLog((l) => [...l, { from: 'me', text: label ?? (cur.show ? cur.show(v) : v || 'Skip') }])
    if (step === STEPS.length - 1) return finish(next)
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setLog((l) => [...l, { from: 'bot', text: STEPS[step + 1].ask(tenant, next) }])
      setStep(step + 1)
    }, 550)
  }

  const finish = (a) => {
    const existing = db.list(tid, 'patients').find((p) => p.phone === a.phone)
    const rec = { name: a.name.trim(), phone: a.phone, dob: a.dob, gender: a.gender, blood: a.blood || '', allergies: a.allergies, conditions: a.conditions, address: a.address || '', emergencyContact: a.emergencyContact || '', email: '', consentOn: today(), selfRegistered: true, visitReason: a.reason || '' }
    let p
    if (existing) { db.update(tid, 'patients', existing.id, rec); p = { ...existing, ...rec } }
    else p = db.add(tid, 'patients', { ...rec, regDate: today() })
    setTyping(true)
    setTimeout(() => { setTyping(false); setDone({ p, existing: !!existing }) }, 600)
  }

  const submitText = (e) => { e.preventDefault(); if (cur.skip && !input.trim()) return answer('', 'Skip'); answer(input) }

  return (
    <div className="chat-page">
      <header className="chat-head">
        <span className="brand-mark"><HeartPulse /></span>
        <div style={{ minWidth: 0 }}>
          <strong>{tenant.name}</strong>
          <div className="small muted">Patient registration · step {Math.min(step + 1, STEPS.length)} of {STEPS.length}</div>
        </div>
      </header>
      <div className="chat-progress"><i style={{ width: `${((done ? STEPS.length : step) / STEPS.length) * 100}%` }} /></div>
      <div className="chat-log" aria-live="polite">
        {log.map((m, i) => <div key={i} className={`bubble ${m.from} ${m.warn ? 'warn' : ''}`}>{m.text}</div>)}
        {typing && <div className="bubble bot typing" aria-label="Typing"><span /><span /><span /></div>}
        {done && (
          <div className="reg-card">
            <CheckCircle2 size={30} />
            <h2>{done.existing ? 'Details updated' : 'You’re registered'}</h2>
            <div className="uhid">{done.p.id}</div>
            <p>Show this number at the reception desk. {tenant.short} has your details, so you won’t need to fill any form.</p>
          </div>
        )}
        <div ref={end} />
      </div>
      {!done && !typing && (
        <div className="chat-input">
          {cur.chips && (
            <div className="chips">
              {cur.chips.map((c) => {
                const [val, lab] = Array.isArray(c) ? c : [c, c]
                return <button key={lab} className="chip" onClick={() => answer(val, lab)}>{lab}</button>
              })}
              {cur.other && <button className="chip ghost" onClick={() => setOtherOpen(true)}>Other…</button>}
            </div>
          )}
          {(cur.type || otherOpen) && (
            <form className="chat-form" onSubmit={submitText}>
              <input id="reg-input" className="input" autoFocus type={otherOpen ? 'text' : cur.type} value={input} max={cur.type === 'date' ? today() : undefined}
                onChange={(e) => setInput(e.target.value)} placeholder={otherOpen ? cur.other : cur.placeholder} inputMode={cur.type === 'tel' ? 'numeric' : undefined} aria-label={cur.placeholder || cur.other} />
              <button className="btn primary" type="submit" aria-label="Send">{cur.skip && !input.trim() ? 'Skip' : <Send />}</button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
