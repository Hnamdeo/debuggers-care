import { useState } from 'react'
import { ArrowRight, CheckCircle2, MessageCircle, Phone } from 'lucide-react'
import { SALES_PHONE, salesWhatsApp } from '../lib/plans'

const KINDS = ['Dental clinic', 'Clinic (GP / speciality)', 'Multi-doctor clinic', 'Hospital']

// Where the visitor came from: ?src=fb-ad or ?utm_source=... on the link, else the referrer.
function leadSource() {
  const q = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '')
  return q.get('src') || q.get('utm_source') || (document.referrer ? new URL(document.referrer).hostname : 'direct')
}

// "Get a free demo" form. Saves the lead on the server, then opens WhatsApp to our sales
// number with the details filled in, so the conversation starts at once.
export default function LeadForm() {
  const [f, setF] = useState({ name: '', clinic: '', city: '', phone: '', kind: KINDS[0], website: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const waText = `Hi Debuggers Space, I'd like a free demo of the Clinic & Hospital Management System.\nName: ${f.name}\nClinic: ${f.clinic || '-'}\nCity: ${f.city || '-'}\nType: ${f.kind}\nMobile: ${f.phone}`

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    const phone = f.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')
    if (!f.name.trim()) return setErr('Please enter your name.')
    if (!/^[6-9]\d{9}$/.test(phone)) return setErr('Please enter a 10-digit mobile number.')
    setBusy(true)
    // Open the WhatsApp window first, inside the click, so pop-up blockers allow it.
    const wa = window.open(salesWhatsApp(waText), '_blank', 'noopener')
    try {
      await fetch(`${import.meta.env.BASE_URL}api/leads.php?a=add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, phone, source: leadSource() }),
      })
    } catch { /* WhatsApp still carries the lead */ }
    setBusy(false)
    setDone(true)
    if (!wa) window.location.href = salesWhatsApp(waText)
  }

  if (done) {
    return (
      <div className="lead-card done">
        <CheckCircle2 size={40} />
        <h3>Thank you, {f.name.split(' ')[0]}!</h3>
        <p>We'll call you on {f.phone} within a few hours to set up your free demo. If WhatsApp didn't open, message us directly.</p>
        <div className="lx-cta-row center">
          <a className="lx-btn" href={salesWhatsApp(waText)} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> WhatsApp us</a>
          <a className="lx-btn ghost" href={`tel:+91${SALES_PHONE}`}><Phone size={16} /> Call {SALES_PHONE.replace(/(\d{5})(\d{5})/, '$1 $2')}</a>
        </div>
      </div>
    )
  }

  return (
    <form className="lead-card" onSubmit={submit} noValidate>
      <div className="lead-grid">
        <label>Your name*<input value={f.name} onChange={set('name')} placeholder="Dr. Sharma" autoComplete="name" /></label>
        <label>Mobile number*<input value={f.phone} onChange={set('phone')} placeholder="98xxxxxxxx" inputMode="tel" autoComplete="tel" /></label>
        <label>Clinic or hospital name<input value={f.clinic} onChange={set('clinic')} placeholder="Smile Dental Care" autoComplete="organization" /></label>
        <label>City<input value={f.city} onChange={set('city')} placeholder="Raipur" autoComplete="address-level2" /></label>
        <label className="full">Type
          <select value={f.kind} onChange={set('kind')}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        </label>
        <input className="lead-hp" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} aria-hidden="true" />
      </div>
      {err && <p className="lead-err">{err}</p>}
      <button className="lx-btn lead-go" disabled={busy}>{busy ? 'Sending…' : <>Get my free demo <ArrowRight /></>}</button>
      <p className="lead-fine">Free setup call · no payment needed · we reply on WhatsApp</p>
    </form>
  )
}
