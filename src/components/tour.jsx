// Product tour on the landing page: numbered tabs on the left, the story and a live-looking
// mock screen on the right. It moves on by itself until the visitor picks a tab.
import { useEffect, useState } from 'react'
import {
  FileHeart, CalendarCheck, MessageCircle, MonitorPlay, Sparkles, QrCode, Check, ArrowRight, PlayCircle, Clock, Bell,
} from 'lucide-react'

const TABS = [
  {
    key: 'rx', icon: FileHeart, title: 'Smart prescription', sub: 'Write & print Rx in seconds',
    head: 'Write a full prescription in a few taps.',
    points: ['One-tap medicine sets, “Repeat last” and 1-0-1 timing buttons', 'Prints on your clinic’s own pad design, Hindi and English', 'Tests, procedures and the bill go out with it'],
  },
  {
    key: 'queue', icon: CalendarCheck, title: 'Appointments & queue', sub: 'Walk-ins and bookings together',
    head: 'One calm queue for the whole day.',
    points: ['Walk-ins and appointments in a single queue', 'Slots from your real timings, move or rebook in one tap', 'Next visit booked from the prescription itself'],
  },
  {
    key: 'remind', icon: MessageCircle, title: 'WhatsApp & SMS reminders', sub: 'Fewer missed appointments',
    head: 'Patients get reminded, automatically.',
    points: ['WhatsApp reminder 30 minutes before, from your clinic’s number', 'SMS for patients without WhatsApp', '“Remind all” sends the whole day in one tap'],
  },
  {
    key: 'edu', icon: MonitorPlay, title: 'Patient education', sub: 'Explain with videos',
    head: 'Explain treatment the way patients understand.',
    points: ['Short videos for RCT, braces, implants and more', 'One thumbnail, Hindi and English buttons', 'Share the video on WhatsApp after the visit'],
  },
  {
    key: 'smile', icon: Sparkles, title: 'AI Smile preview', sub: 'Before & after, on their photo',
    head: 'Show the new smile before you start.',
    points: ['Whitening preview on the patient’s own photo', 'Before / after slider the patient can keep', 'Full AI smile design available as an add-on'],
  },
  {
    key: 'records', icon: QrCode, title: 'QR registration & records', sub: 'Every visit saved',
    head: 'Register once. Every visit stays on record.',
    points: ['Patients scan a QR and register from their own phone', 'Visits, prescriptions, X-rays and bills saved day by day', 'Patients sign in to see their own reports and bills'],
  },
]

function Mock({ k }) {
  if (k === 'rx') return (
    <div className="tm tm-rx">
      <div className="tm-bar"><b>℞ Prescription</b><span>P-1024 · Anjali P.</span></div>
      <div className="tm-chips"><i className="on">RCT pain set</i><i>Repeat last</i><i>Gum infection</i></div>
      {[['Amoxicillin 500 mg', '1-1-1', '5 days'], ['Ketorolac 10 mg', 'SOS', '3 days'], ['Chlorhexidine mouthwash', '1-0-1', '14 days']].map(([n, f, d], i) => (
        <div key={n} className="tm-line" style={{ animationDelay: `${0.15 + i * 0.12}s` }}><span className="tm-n">{i + 1}</span><b>{n}</b><em>{f}</em><span>{d}</span></div>
      ))}
      <div className="tm-btn"><Check size={14} /> Complete visit and send bill</div>
    </div>
  )
  if (k === 'queue') return (
    <div className="tm tm-queue">
      <div className="tm-bar"><b>Today’s queue</b><span>8 booked · 3 waiting</span></div>
      <div className="tm-next"><span className="tm-tag">Up next</span><b>Gautam Lal · 32 M</b><span>10:30 AM · Tooth pain · Last visit 15 Oct</span></div>
      {[['11:00', 'Divya Verma', 'Booked'], ['11:15', 'Walk-in · Ravi S.', 'Waiting'], ['11:30', 'Sanjay Sharma', 'Booked']].map(([t, n, s], i) => (
        <div key={n} className="tm-line" style={{ animationDelay: `${0.15 + i * 0.12}s` }}><Clock size={14} /><b>{t}</b><span>{n}</span><em className={s === 'Waiting' ? 'warn' : ''}>{s}</em></div>
      ))}
    </div>
  )
  if (k === 'remind') return (
    <div className="tm tm-wa">
      <div className="tm-wa-top"><span className="tm-wa-av">V</span><b>Vedanta Dental Care</b><span className="tm-wa-ok">✓</span></div>
      <div className="tm-bubble">नमस्ते Anjali, आपका अपॉइंटमेंट आज 5:00 PM पर है।<br />Hello Anjali, a reminder of your appointment today at 5:00 PM with Dr. Megha.<span className="tm-time">4:30 PM ✓✓</span></div>
      <div className="tm-bubble me">Thank you, I will come<span className="tm-time">4:32 PM</span></div>
      <div className="tm-pill"><Bell size={13} /> 12 reminders sent automatically today</div>
    </div>
  )
  if (k === 'edu') return (
    <div className="tm tm-edu">
      {[['Root canal treatment', '1 min'], ['Braces & aligners', '2 min'], ['Dental implant', '2 min']].map(([t, m], i) => (
        <div key={t} className="tm-vid" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
          <span className="tm-thumb"><PlayCircle /></span>
          <span className="tm-vt"><b>{t}</b><span>{m}</span></span>
          <span className="tm-langs"><i>English</i><i>हिंदी</i></span>
        </div>
      ))}
    </div>
  )
  if (k === 'smile') return (
    <div className="tm tm-smile">
      <div className="tm-face"><span className="tm-teeth" /><span className="tm-split" /><span className="tm-lab l">Before</span><span className="tm-lab r">After</span></div>
      <div className="tm-chips"><i>Natural</i><i className="on">Bright</i><i>Hollywood</i></div>
    </div>
  )
  return (
    <div className="tm tm-rec">
      <div className="tm-prof"><span className="tm-av">RP</span><span><b>Ramesh Patel</b><span>UHID P-1048 · 46 M · B+</span></span></div>
      <div className="tm-track">{['Registered', 'Vitals', 'Consult', 'X-ray', 'Bill'].map((s, i) => <span key={s} style={{ animationDelay: `${0.1 + i * 0.1}s` }}><i><Check size={12} /></i>{s}</span>)}</div>
      {[['15 Nov', 'RCT 36 · first sitting', '₹3,500'], ['28 Oct', 'Scaling & polishing', '₹1,500']].map(([d, t, a]) => (
        <div key={d} className="tm-line"><b>{d}</b><span>{t}</span><em>{a}</em></div>
      ))}
    </div>
  )
}

export default function FeatureTour({ onTry }) {
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(true)
  useEffect(() => {
    if (!auto || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setTimeout(() => setI((x) => (x + 1) % TABS.length), 6500)
    return () => clearTimeout(id)
  }, [i, auto])
  const t = TABS[i]
  return (
    <div className="tour" data-reveal>
      <div className="tour-tabs" role="tablist" aria-label="Product features">
        {TABS.map((x, j) => (
          <button key={x.key} role="tab" aria-selected={i === j} className={`tour-tab ${i === j ? 'on' : ''}`} onClick={() => { setI(j); setAuto(false) }}>
            <span className="tour-n">{j + 1}</span>
            <span className="tour-tt"><b>{x.title}</b>{i === j && <span>{x.sub}</span>}</span>
            {i === j && auto && <span className="tour-prog" key={`p${i}`} />}
          </button>
        ))}
      </div>
      <div className="tour-pane" role="tabpanel" key={t.key}>
        <div className="tour-copy">
          <span className="tour-ic"><t.icon /></span>
          <h3>{t.head}</h3>
          <ul>{t.points.map((p) => <li key={p}><Check /> {p}</li>)}</ul>
          <button className="lx-btn primary" onClick={onTry}>Try it now <ArrowRight /></button>
        </div>
        <div className="tour-visual"><Mock k={t.key} /></div>
      </div>
    </div>
  )
}
