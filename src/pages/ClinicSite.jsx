import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Phone, MapPin, Navigation, Star, Clock, LogIn, Stethoscope, Sparkles, Crown, Smile, GraduationCap, BadgeCheck, MessageCircle, ShieldCheck, HeartHandshake, Heart, CalendarCheck, ScanLine, ClipboardList, BellRing, FileText, Languages, Wallet, PlayCircle, ChevronDown,
} from 'lucide-react'
import { HEALTH_VIDEOS } from '../lib/healthvideos'
import { useTenant, BrandMark, SiteFooter } from '../components/ui'
import { DentalScreen } from '../components/dentalscreen'

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
  heart: Heart,
  shield: ShieldCheck,
}

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const fmt = (h) => {
  const hr = Math.floor(h)
  const m = Math.round((h - hr) * 60)
  return `${hr % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${hr < 12 ? 'AM' : 'PM'}`
}
export const slots = (list) => list.map(([a, b]) => `${fmt(a)} – ${fmt(b)}`).join(', ')

// Open or closed right now, in India time, whatever the visitor's own time zone.
export function useOpenNow(hours) {
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

// General facts about each treatment, shown under the clinic's own list. Typical ranges only:
// the dentist confirms the plan for each patient.
const DETAILS = {
  tooth: { visits: 'Usually 1–3 visits', points: ['Saves your own tooth instead of removing it', 'Done under local anaesthesia, so you feel pressure, not pain', 'A crown is often advised afterwards to protect the tooth'] },
  implant: { visits: 'Usually 3–6 months, in stages', points: ['A titanium post replaces the lost root', 'The bone heals around it before the final tooth is fixed', 'Looks, feels and chews like a natural tooth'] },
  smile: { visits: 'Usually 1–2 visits', points: ['Whitening, bonding or laminates for a brighter smile', 'Shade chosen with you before starting', 'Advice on keeping the result longer'] },
  crown: { visits: 'Filling 1 visit · crown 2 visits', points: ['Tooth-coloured fillings that match your teeth', 'Metal-free (zirconia) or metal-ceramic crowns', 'Restores chewing and protects weak teeth'] },
  sparkles: { visits: 'Usually 12–24 months', points: ['Fixed braces or clear aligners for children and adults', 'Check-ups every 4–6 weeks to adjust', 'A retainer keeps teeth straight afterwards'] },
  stethoscope: { visits: 'Usually 1 visit', points: ['Gentle removal under local anaesthesia', 'Wisdom tooth surgery when a tooth is stuck', 'Clear aftercare instructions for quick healing'] },
  shield: { visits: '1 visit · every 6 months', points: ['Removes tartar that brushing cannot', 'Helps bleeding gums and bad breath', 'Polishing for smooth, clean teeth'] },
  heart: { visits: 'Usually 4–5 visits', points: ['Complete or partial dentures', 'Measured and tried in before the final set', 'Helps you chew and speak with confidence'] },
}

// Match by the treatment's name, so each clinic's own list gets the right facts.
const KEYS = [[/root canal|rct|endo/i, 'tooth'], [/implant/i, 'implant'], [/whiten|smile|cosmetic|veneer|laminate/i, 'smile'], [/crown|filling|cap|bridge/i, 'crown'], [/brace|aligner|ortho/i, 'sparkles'], [/extract|surgery|wisdom/i, 'stethoscope'], [/clean|scal|gum|perio/i, 'shield'], [/denture/i, 'heart']]
const detailFor = (title) => DETAILS[KEYS.find(([re]) => re.test(title))?.[1]]

const STEPS = [
  [CalendarCheck, 'Book', 'Call or WhatsApp us, or walk in during clinic hours.'],
  [ScanLine, 'Check-up', 'The dentist examines your teeth and takes an X-ray if needed.'],
  [ClipboardList, 'Clear plan', 'You hear the options, number of visits and cost before anything starts.'],
  [Stethoscope, 'Treatment', 'Done gently, with your comfort checked at every step.'],
  [BellRing, 'Follow-up', 'You get reminders for your next visit on WhatsApp.'],
]

const FAQ = [
  ['Is root canal treatment painful?', 'It is done under local anaesthesia, so most patients feel only pressure. Mild soreness for a day or two afterwards is normal and settles with the medicines your dentist advises.'],
  ['How long does a dental implant take?', 'Usually 3 to 6 months from start to the final tooth, because the bone needs time to heal around the implant. Your dentist will tell you the exact plan after an X-ray.'],
  ['Does scaling (cleaning) weaken teeth?', 'No. Scaling removes tartar, not tooth. Teeth may feel a little sensitive for a few days because the tartar that covered them is gone.'],
  ['What should I bring to my first visit?', 'Any old X-rays or dental reports, and a list of the medicines you take, especially for blood pressure, diabetes or blood thinners.'],
  ['Can I get my prescription and reports on my phone?', 'Yes. Your prescription, bills and reports are saved to your file, and you can see them by signing in as a patient with your mobile number.'],
  ['How do I book an appointment?', 'Call or WhatsApp the clinic number on this page. You will get a confirmation and a reminder before your visit.'],
]

function Faq({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`cs-faq ${open ? 'open' : ''}`}>
      <button onClick={() => setOpen(!open)} aria-expanded={open}><span>{q}</span><ChevronDown /></button>
      {open && <p>{a}</p>}
    </div>
  )
}

const initials = (n) => n.replace(/^Dr\.?\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

export default function ClinicSite({ site }) {
  const { tenant, base, user } = useTenant()
  const nav = useNavigate()
  const status = useOpenNow(site.hours)
  const tel = `tel:${site.phone.replace(/\s/g, '')}`
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(`Hello ${site.name}, I would like to book an appointment.`)}`
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapQuery)}`
  const embed = `https://maps.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&z=16&output=embed`
  const docs = site.doctors || [site.doctor]
  const d = docs[0]
  const src = site.reviewSource || 'Google'

  useEffect(() => {
    const before = document.title
    document.title = `${site.name} · ${site.area}`
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
              <span className="small">Dental clinic · {site.area}</span>
            </div>
          </div>
          {user
            ? <button className="cs-btn ghost sm" onClick={() => nav(base)}><LogIn /> Back to dashboard</button>
            : <button className="cs-btn ghost sm" onClick={() => nav(`${base}/login`)}><LogIn /> Staff sign in</button>}
        </div>
      </header>

      <section className="cs-hero">
        <div className="cs-glow" aria-hidden="true" />
        <div className="cs-in cs-hero-in">
          <div className="cs-hero-art"><DentalScreen /></div>
          <div className="cs-hero-copy">
            <div className="cs-tags">
              <span className={`cs-status ${status.open ? 'open' : ''}`}><i />{status.text}</span>
              <span className="cs-ai"><Sparkles size={14} /> AI powered clinical management</span>
            </div>
            <h1>Healthy teeth,<br /><span>confident smiles.</span></h1>
            <p className="cs-lead">{site.tagline}</p>
            <div className="cs-rating" aria-label={`Rated ${site.rating} out of 5 ${site.reviews ? ` from ${site.reviews} ${src} reviews` : ` on ${src}`}`}>
              <span className="cs-stars">{[0, 1, 2, 3, 4].map((i) => <Star key={i} />)}</span>
              <strong>{site.rating}</strong>
              <span>· {site.reviews ? `${site.reviews} ${src} reviews` : `rated on ${src}`}</span>
            </div>
            <div className="cs-cta">
              <a className="cs-btn primary" href={tel}><Phone /> Call <span className="cs-cc">+91 </span>{site.phone.replace(/^\+91\s*/, '')}</a>
              <a className="cs-btn wa" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle /> <span className="cs-wa-long">Book on </span>WhatsApp</a>
              <a className="cs-btn ghost" href={maps} target="_blank" rel="noopener noreferrer"><Navigation /> Directions</a>
            </div>
          </div>

          <aside className="cs-doc">
            {docs.map((x) => (
              <div key={x.name} className="cs-doc-one">
                <div className="cs-doc-top">
                  <span className="cs-doc-av" aria-hidden="true">{initials(x.name)}</span>
                  <div>
                    <strong>{x.name}</strong>
                    <span className="small">{x.title}{x.years ? ` · ${x.years}+ years` : ''}</span>
                  </div>
                </div>
                <ul>
                  {x.quals.map((q) => (
                    <li key={q}>{/^reg/i.test(q) ? <BadgeCheck /> : <GraduationCap />}<span>{q}</span></li>
                  ))}
                </ul>
              </div>
            ))}
            {site.fee ? <div className="cs-doc-fee small"><HeartHandshake /> Consultation fee about ₹{site.fee}</div>
              : <div className="cs-doc-fee small"><HeartHandshake /> Call or WhatsApp to book your visit</div>}
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
                {detailFor(title) && <>
                  <ul className="cs-svc-pts">{detailFor(title).points.map((t) => <li key={t}>{t}</li>)}</ul>
                  <span className="cs-svc-visits"><Clock size={14} /> {detailFor(title).visits}</span>
                </>}
              </div>
            )
          })}
        </div>
      </section>

      <section className="cs-in cs-sec">
        <div className="cs-head">
          <span className="cs-eyebrow">Your visit</span>
          <h2>What to expect, step by step</h2>
        </div>
        <ol className="cs-steps">
          {STEPS.map(([Icon, t, sub], i) => (
            <li key={t}><span className="cs-step-n">{i + 1}</span><Icon /><strong>{t}</strong><span className="small">{sub}</span></li>
          ))}
        </ol>
      </section>

      {/dental/i.test(tenant.kind || '') && (
        <section className="cs-in cs-sec">
          <div className="cs-head">
            <span className="cs-eyebrow">Patient videos</span>
            <h2>See how treatments are done</h2>
            <p className="cs-sub">Short animations in English and Hindi. Watch before your visit, and ask the dentist anything.</p>
          </div>
          <div className="cs-vids">
            {HEALTH_VIDEOS.map((v) => (
              <a key={v.id} className="cs-vid" href={v.url} target="_blank" rel="noopener noreferrer">
                <PlayCircle />
                <span><strong>{v.procedure}</strong><span className="small">{v.lang === 'Hindi' ? 'हिंदी' : 'English'} · {Math.max(1, Math.round(v.minutes))} min</span></span>
              </a>
            ))}
          </div>
        </section>
      )}

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
        <div className="cs-head">
          <span className="cs-eyebrow">Why patients choose us</span>
          <h2>Care you can trust</h2>
        </div>
        <div className="cs-trust cs-trust6">
          <div><ShieldCheck /><span><strong>{d.years ? `${d.years}+ years of practice` : docs.length > 1 ? `${docs.length} dental surgeons` : 'Qualified dentist'}</strong><span className="small">Experienced, qualified dental {docs.length > 1 ? 'team' : 'surgeon'}</span></span></div>
          <div><Star /><span><strong>{site.rating} on {src}</strong><span className="small">{site.reviews ? `Trusted by ${site.reviews}+ reviewers` : 'Loved by local patients'}</span></span></div>
          <div><Wallet /><span><strong>Cost explained first</strong><span className="small">Options and cost shared before treatment starts</span></span></div>
          <div><FileText /><span><strong>Records on your phone</strong><span className="small">Prescriptions, bills and reports in your patient login</span></span></div>
          <div><BellRing /><span><strong>Visit reminders</strong><span className="small">WhatsApp confirmations and reminders</span></span></div>
          <div><Languages /><span><strong>Hindi and English</strong><span className="small">Prescriptions and advice you can read</span></span></div>
        </div>
      </section>

      <section className="cs-in cs-sec">
        <div className="cs-head">
          <span className="cs-eyebrow">Questions</span>
          <h2>Frequently asked questions</h2>
        </div>
        <div className="cs-faqs">{FAQ.map(([q, a]) => <Faq key={q} q={q} a={a} />)}</div>
        <p className="small muted cs-disclaim">General information only. Your dentist will advise what is right for you.</p>
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
