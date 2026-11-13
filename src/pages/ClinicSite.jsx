import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Phone, MapPin, Navigation, Star, Clock, LogIn, Stethoscope, Sparkles, Crown, Smile, GraduationCap, BadgeCheck, MessageCircle, ShieldCheck, HeartHandshake,
} from 'lucide-react'
import { useTenant, BrandMark, SiteFooter } from '../components/ui'

// A simple tooth outline (lucide has none). Drawn in currentColor like the other icons.
function Tooth({ implant }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {implant ? (
        <>
          <path d="M7 3.5c1.6-.9 3.2-.4 5 .4 1.8-.8 3.4-1.3 5-.4 2 1.2 2 4 1 6.5H6c-1-2.5-1-5.3 1-6.5Z" />
          <path d="M9 13h6M9.5 16h5M10 19h4M12 10v11" />
        </>
      ) : (
        <path d="M7 3.5c1.6-.9 3.2-.4 5 .4 1.8-.8 3.4-1.3 5-.4 2.4 1.4 2 5 .9 7.6-.8 1.9-1 3.8-1.4 6.2-.3 1.9-.8 3.7-1.9 3.7-1.2 0-1.3-2-1.6-3.7-.2-1.2-.5-2.1-1-2.1s-.8.9-1 2.1c-.3 1.7-.4 3.7-1.6 3.7-1.1 0-1.6-1.8-1.9-3.7-.4-2.4-.6-4.3-1.4-6.2C5 8.5 4.6 4.9 7 3.5Z" />
      )}
    </svg>
  )
}

const SERVICE_ICON = {
  stethoscope: Stethoscope,
  sparkles: Sparkles,
  tooth: () => <Tooth />,
  crown: Crown,
  implant: () => <Tooth implant />,
  smile: Smile,
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const fmt = (h) => {
  const hr = Math.floor(h)
  const m = Math.round((h - hr) * 60)
  return `${hr % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${hr < 12 ? 'AM' : 'PM'}`
}
const slots = (list) => list.map(([a, b]) => `${fmt(a)} – ${fmt(b)}`).join(', ')

// Open or closed right now, in India time, whatever the visitor's own time zone.
function useOpenNow(hours) {
  const calc = () => {
    const ist = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60000)
    const day = ist.getDay()
    const h = ist.getHours() + ist.getMinutes() / 60
    const today = hours.find(([d]) => d === day)?.[1] || []
    const now = today.find(([a, b]) => h >= a && h < b)
    if (now) return { day, open: true, text: `Open now · until ${fmt(now[1])}` }
    const later = today.find(([a]) => a > h)
    return { day, open: false, text: later ? `Closed now · opens ${fmt(later[0])}` : 'Closed now · opens tomorrow' }
  }
  const [s, setS] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setS(calc()), 60000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return s
}

export default function ClinicSite({ site }) {
  const { tenant, base } = useTenant()
  const nav = useNavigate()
  const status = useOpenNow(site.hours)
  const tel = `tel:${site.phone.replace(/\s/g, '')}`
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(`Hello ${site.name}, I would like to book an appointment.`)}`
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapQuery)}`
  const embed = `https://maps.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&z=16&output=embed`
  const d = site.doctor

  useEffect(() => {
    const before = document.title
    document.title = `${site.name} · Raipur`
    return () => { document.title = before }
  }, [site.name])

  return (
    <div className="cs">
      <header className="cs-nav">
        <div className="cs-in cs-nav-in">
          <div className="cs-brand">
            <BrandMark tenant={tenant} size={38} />
            <div>
              <strong>{site.name}</strong>
              <span className="small">Dental clinic · Mowa, Raipur</span>
            </div>
          </div>
          <button className="cs-btn ghost sm" onClick={() => nav(`${base}/login`)}><LogIn /> Staff sign in</button>
        </div>
      </header>

      <section className="cs-hero">
        <div className="cs-glow" aria-hidden="true" />
        <div className="cs-in cs-hero-in">
          <div className="cs-hero-copy">
            <span className={`cs-status ${status.open ? 'open' : ''}`}><i />{status.text}</span>
            <h1>Healthy teeth,<br /><span>confident smiles.</span></h1>
            <p className="cs-lead">{site.tagline}</p>
            <div className="cs-rating" aria-label={`Rated ${site.rating} out of 5 from ${site.reviews} Google reviews`}>
              <span className="cs-stars">{[0, 1, 2, 3, 4].map((i) => <Star key={i} />)}</span>
              <strong>{site.rating}</strong>
              <span>· {site.reviews} Google reviews</span>
            </div>
            <div className="cs-cta">
              <a className="cs-btn primary" href={tel}><Phone /> Call {site.phone}</a>
              <a className="cs-btn wa" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle /> Book on WhatsApp</a>
              <a className="cs-btn ghost" href={maps} target="_blank" rel="noopener noreferrer"><Navigation /> Directions</a>
            </div>
          </div>

          <aside className="cs-doc">
            <div className="cs-doc-top">
              <span className="cs-doc-av" aria-hidden="true">PM</span>
              <div>
                <strong>{d.name}</strong>
                <span className="small">{d.title} · {d.years}+ years</span>
              </div>
            </div>
            <ul>
              {d.quals.map((q, i) => (
                <li key={q}>{i === 2 ? <BadgeCheck /> : <GraduationCap />}<span>{q}</span></li>
              ))}
            </ul>
            <div className="cs-doc-fee small"><HeartHandshake /> Consultation fee about ₹{site.fee}</div>
          </aside>
        </div>
      </section>

      <section className="cs-in cs-sec">
        <div className="cs-head">
          <span className="cs-eyebrow">Treatments</span>
          <h2>Care for the whole family</h2>
        </div>
        <div className="cs-services">
          {site.services.map(([ic, title, sub]) => {
            const Icon = SERVICE_ICON[ic] || Sparkles
            return (
              <div className="cs-svc" key={title}>
                <span className="cs-svc-ic"><Icon /></span>
                <strong>{title}</strong>
                <span className="small">{sub}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="cs-in cs-sec cs-visit">
        <div className="cs-card">
          <h3><Clock /> Clinic timings</h3>
          <table className="cs-hours">
            <tbody>
              {site.hours.map(([day, list]) => (
                <tr key={day} className={day === status.day ? 'today' : ''}>
                  <th>{DAYS[day]}{day === status.day && <span className="cs-today">Today</span>}</th>
                  <td>{slots(list)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <a className="cs-btn primary block" href={tel}><Phone /> Call to book a visit</a>
        </div>
        <div className="cs-card cs-map-card">
          <h3><MapPin /> Find us</h3>
          <p>{site.address}</p>
          <div className="cs-map">
            <iframe title={`Map to ${site.name}`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <a className="cs-btn ghost block" href={maps} target="_blank" rel="noopener noreferrer"><Navigation /> Open in Google Maps</a>
        </div>
      </section>

      <section className="cs-in cs-sec">
        <div className="cs-trust">
          <div><ShieldCheck /><span><strong>{d.years}+ years of practice</strong><span className="small">Experienced, qualified dental surgeon</span></span></div>
          <div><Star /><span><strong>{site.rating} on Google</strong><span className="small">Trusted by {site.reviews}+ reviewers</span></span></div>
          <div><Smile /><span><strong>Affordable care</strong><span className="small">Quality treatment at a fair cost</span></span></div>
        </div>
      </section>

      <div className="cs-callbar">
        <a className="cs-btn primary" href={tel}><Phone /> Call</a>
        <a className="cs-btn wa" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a>
        <a className="cs-btn ghost" href={maps} target="_blank" rel="noopener noreferrer"><Navigation /> Map</a>
      </div>
      <SiteFooter className="cs-footer" />
    </div>
  )
}
