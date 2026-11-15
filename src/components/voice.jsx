// Voice prescription: the doctor speaks, the pad fills itself.
// Uses the browser's own speech recognition (Chrome, Edge, Safari). Nothing is saved until the
// doctor checks the result and presses "Fill the pad".
import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Wand2, X } from 'lucide-react'
import { Modal } from './ui'

const Rec = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
export const voiceSupported = !!Rec

const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, fifteen: 15, ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, saat: 7, das: 10, pandrah: 15, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'सात': 7, 'दस': 10 }
const numFrom = (w) => (/^\d+$/.test(w) ? +w : NUM[w?.toLowerCase()])

const FREQ_RULES = [
  [/three times|thrice|1-1-1|1 1 1|teen (baar|bar|time)|तीन बार|\btds\b/i, 'Three times a day'],
  [/twice|two times|1-0-1|1 0 1|do (baar|bar|time)|दो बार|\bbd\b/i, 'Twice a day'],
  [/at night|bed ?time|raat|रात|0-0-1|\bhs\b/i, 'At night'],
  [/once|one time|1-0-0|ek (baar|bar)|एक बार|\bod\b|daily/i, 'Once a day'],
  [/\bsos\b|when needed|if needed|in pain|dard ho|दर्द हो/i, 'When needed for pain'],
]
const DOSE_RULES = [[/(\d+)\s*ml/i, (m) => `${m[1]} ml`], [/capsule|\bcap\b/i, () => '1 cap'], [/half|aadhi|आधी/i, () => '½ tab'], [/apply|lagana|लगाना/i, () => 'Apply']]

// Pull the parts of a dictated prescription out of plain speech.
export function parseDictation(text, medNames) {
  const t = ` ${text.replace(/\s+/g, ' ').trim()} `
  const low = t.toLowerCase()
  const out = { meds: [], complaint: '', findings: '', diagnosis: '', advice: '', nextDays: 0 }
  // Medicines: find each known name by its first word, read the words that follow it.
  const hits = []
  for (const name of medNames) {
    const key = name.toLowerCase().split(/\s+/)[0]
    if (key.length < 4) continue
    const at = low.indexOf(key)
    if (at >= 0 && !hits.some((h) => h.name === name || h.at === at)) hits.push({ name, at })
  }
  hits.sort((a, b) => a.at - b.at)
  hits.forEach((h, i) => {
    const seg = t.slice(h.at, i + 1 < hits.length ? hits[i + 1].at : h.at + 140)
    const freq = FREQ_RULES.find(([re]) => re.test(seg))?.[1] || 'Twice a day'
    const dn = [...seg.matchAll(/(\d+|\p{L}+)\s*(?:days?|din|दिन)/giu)].map((m) => numFrom(m[1])).find(Boolean)
    const wk = /one week|ek hafta|एक हफ्ता/i.test(seg) ? 7 : 0
    const dose = DOSE_RULES.map(([re, f]) => { const m = seg.match(re); return m && f(m) }).find(Boolean) || (/mouthwash|syrup/i.test(h.name) ? '10 ml' : /paste|gel/i.test(h.name) ? 'Apply' : '1 tab')
    out.meds.push({ name: h.name, dose, freq, days: dn || wk || 5 })
  })
  // Labelled parts: "complaint …", "diagnosis …", "advice …" up to the next label or full stop.
  const grab = (re) => {
    const m = t.match(new RegExp(`(?:${re})\\s*(?:is|of|:|-)?\\s*([^.।]*?)(?=\\s(?:complaint|c/o|diagnosis|diagnosed|advice|advise|findings|on examination|o/e|next visit|follow ?up|medicine|शिकायत|निदान|सलाह)\\b|[.।]|$)`, 'i'))
    if (!m) return ''
    let v = m[1]
    // Stop before the first medicine name, in case the doctor did not pause.
    const keys = medNames.map((n) => n.toLowerCase().split(/\s+/)[0]).filter((k) => k.length >= 4)
    const cut = Math.min(...keys.map((k) => v.toLowerCase().indexOf(k)).filter((x) => x >= 0), v.length)
    return v.slice(0, cut).trim().replace(/[,;]$/, '')
  }
  out.complaint = grab('complaint|c/o|complains of|शिकायत')
  out.findings = grab('on examination|o/e|findings')
  out.diagnosis = grab('diagnosis|diagnosed with|निदान')
  out.advice = grab('advice|advise|सलाह')
  const nv = low.match(/(?:next visit|follow ?up|come (?:back|again))\D{0,20}?(\d+|\w+)\s*(days?|weeks?|months?|din|hafte|दिन)/i)
  if (nv) {
    const n = numFrom(nv[1]) || 1
    out.nextDays = n * (/week|hafte/i.test(nv[2]) ? 7 : /month/i.test(nv[2]) ? 30 : 1)
  }
  return out
}

export function VoiceRx({ medNames, onApply, onClose }) {
  const [lang, setLang] = useState('en-IN')
  const [on, setOn] = useState(false)
  const [final, setFinal] = useState('')
  const [interim, setInterim] = useState('')
  const [err, setErr] = useState('')
  const rec = useRef(null)

  const start = () => {
    if (!Rec) return
    setErr('')
    const r = new Rec()
    r.lang = lang
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      let fin = '', mid = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const s = e.results[i][0].transcript
        if (e.results[i].isFinal) fin += `${s}. `
        else mid += s
      }
      if (fin) setFinal((x) => x + fin)
      setInterim(mid)
    }
    r.onerror = (e) => setErr(e.error === 'not-allowed' ? 'Please allow the microphone for this site, then try again.' : e.error === 'no-speech' ? 'Didn’t hear anything. Tap the mic and speak.' : `Voice stopped (${e.error}).`)
    r.onend = () => { setOn(false); setInterim('') }
    rec.current = r
    r.start()
    setOn(true)
  }
  const stop = () => rec.current?.stop()
  useEffect(() => () => rec.current?.abort(), [])

  const text = `${final}${interim}`.trim()
  const parsed = parseDictation(text, medNames)
  const any = parsed.meds.length || parsed.complaint || parsed.diagnosis || parsed.advice || parsed.findings || parsed.nextDays

  return (
    <Modal title="Speak the prescription" onClose={onClose} wide footer={<>
      <button className="btn" onClick={onClose}><X /> Cancel</button>
      <button className="btn primary" disabled={!any} onClick={() => { stop(); onApply(parsed, text) }}><Wand2 /> Fill the pad</button>
    </>}>
      {!Rec ? (
        <div className="muted">Voice typing needs Chrome, Edge or Safari. Please open the app in one of them.</div>
      ) : (
        <div className="voice">
          <div className="voice-top">
            <button className={`voice-mic ${on ? 'on' : ''}`} onClick={on ? stop : start} aria-label={on ? 'Stop listening' : 'Start listening'}>
              {on ? <Square /> : <Mic />}
              {on && <><i /><i /><i /></>}
            </button>
            <div className="stack" style={{ gap: 6 }}>
              <strong>{on ? 'Listening… speak naturally' : final ? 'Tap the mic to add more' : 'Tap the mic and speak'}</strong>
              <span className="small muted">Say it like you dictate: “Complaint pain in lower left tooth. Diagnosis irreversible pulpitis 36. Amoxicillin 500 three times a day for 5 days. Ketorolac SOS 3 days. Advice avoid hard food. Next visit after 7 days.”</span>
              <span className="seg" role="radiogroup" aria-label="Language">
                {[['en-IN', 'English / Hinglish'], ['hi-IN', 'हिंदी']].map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={lang === v} className={lang === v ? 'on' : ''} disabled={on} onClick={() => setLang(v)}>{l}</button>)}
              </span>
            </div>
          </div>
          {on && <div className="voice-wave" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ animationDelay: `${(i % 6) * 0.09}s` }} />)}</div>}
          {err && <div style={{ color: 'var(--bad)' }}>{err}</div>}
          <div className="voice-text">{final}<span className="muted">{interim}</span>{!text && <span className="faint">Your words appear here…</span>}</div>
          {any ? (
            <div className="voice-got">
              <div className="eyebrow">What I understood</div>
              {parsed.complaint && <div><b>Complaint</b> {parsed.complaint}</div>}
              {parsed.findings && <div><b>Findings</b> {parsed.findings}</div>}
              {parsed.diagnosis && <div><b>Diagnosis</b> {parsed.diagnosis}</div>}
              {parsed.meds.map((m) => <div key={m.name}><b>℞</b> {m.name} · {m.dose} · {m.freq} · {m.days} days</div>)}
              {parsed.advice && <div><b>Advice</b> {parsed.advice}</div>}
              {parsed.nextDays > 0 && <div><b>Next visit</b> after {parsed.nextDays} days</div>}
              <div className="small muted">Check everything on the pad before you complete the visit.</div>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  )
}
