import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Phone, MapPin, Navigation, Star, Clock, LogIn, Stethoscope, Sparkles, Crown, Smile, GraduationCap, BadgeCheck, MessageCircle, ShieldCheck, HeartHandshake, Heart, CalendarCheck, ScanLine, ClipboardList, BellRing, FileText, Languages, Wallet, PlayCircle, ChevronDown, ChevronLeft, ChevronRight, Menu, X, Mail, Award, Users, CheckCircle2, AlertTriangle, Send,
} from 'lucide-react'
import { Tooth3D } from '../components/tooth3d'
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
  tooth: { when: 'Deep decay, severe toothache, pain at night, swelling or a tooth that hurts on biting.', video: 'Root canal', visits: 'Usually 1–3 visits', points: ['Saves your own tooth instead of removing it', 'Done under local anaesthesia, so you feel pressure, not pain', 'A crown is often advised afterwards to protect the tooth'] },
  implant: { when: 'One or more missing teeth, or loose dentures you want replaced with fixed teeth.', video: 'Implants', visits: 'Usually 3–6 months, in stages', points: ['A titanium post replaces the lost root', 'The bone heals around it before the final tooth is fixed', 'Looks, feels and chews like a natural tooth'] },
  smile: { when: 'Yellow or stained teeth, gaps, chipped front teeth, or before a wedding or big event.', video: 'Smile & cosmetic', visits: 'Usually 1–2 visits', points: ['Whitening, bonding or laminates for a brighter smile', 'Shade chosen with you before starting', 'Advice on keeping the result longer'] },
  crown: { when: 'Cavities, broken or cracked teeth, or a tooth after root canal treatment.', video: 'Crowns & bridges', visits: 'Filling 1 visit · crown 2 visits', points: ['Tooth-coloured fillings that match your teeth', 'Metal-free (zirconia) or metal-ceramic crowns', 'Restores chewing and protects weak teeth'] },
  sparkles: { when: 'Crooked, crowded or forward teeth, gaps, or a bite that does not close well.', video: 'Braces & aligners', visits: 'Usually 12–24 months', points: ['Fixed braces or clear aligners for children and adults', 'Check-ups every 4–6 weeks to adjust', 'A retainer keeps teeth straight afterwards'] },
  stethoscope: { when: 'A tooth that cannot be saved, a painful or stuck wisdom tooth, or space needed for braces.', video: 'Extraction & wisdom teeth', visits: 'Usually 1 visit', points: ['Gentle removal under local anaesthesia', 'Wisdom tooth surgery when a tooth is stuck', 'Clear aftercare instructions for quick healing'] },
  shield: { when: 'Bleeding gums, bad breath, tartar build-up, or a regular six-monthly check-up.', video: 'Cleaning & gum care', visits: '1 visit · every 6 months', points: ['Removes tartar that brushing cannot', 'Helps bleeding gums and bad breath', 'Polishing for smooth, clean teeth'] },
  heart: { when: 'Many or all teeth missing, or an old denture that is loose or broken.', video: 'Dentures', visits: 'Usually 4–5 visits', points: ['Complete or partial dentures', 'Measured and tried in before the final set', 'Helps you chew and speak with confidence'] },
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

// Symptom check ("Diagnosis" page). General guidance only; the dentist examines and decides.
const SYMPTOMS = [
  { k: 'pain', label: 'Toothache', hi: 'दाँत में दर्द', causes: ['Tooth decay (cavity) reaching the nerve', 'Cracked tooth or old filling'], care: ['Filling if the decay is small', 'Root canal treatment if the nerve is affected'], urgent: 'Severe pain, pain at night or swelling: see a dentist within 1–2 days.' },
  { k: 'sens', label: 'Sensitivity to cold or sweet', hi: 'ठंडा-मीठा लगना', causes: ['Worn enamel or exposed roots', 'Early cavity', 'Gum recession'], care: ['Desensitising treatment and toothpaste', 'Filling or bonding of worn areas'] },
  { k: 'gums', label: 'Bleeding or swollen gums', hi: 'मसूड़ों से खून', causes: ['Tartar and plaque (gingivitis)', 'Gum disease (pyorrhoea)'], care: ['Scaling and polishing', 'Gum treatment if pockets are deep'] },
  { k: 'breath', label: 'Bad breath', hi: 'मुँह से बदबू', causes: ['Tartar and gum infection', 'Food trapped in cavities', 'Coated tongue'], care: ['Scaling and cleaning', 'Fillings for cavities', 'Tongue cleaning advice'] },
  { k: 'broken', label: 'Broken or chipped tooth', hi: 'टूटा दाँत', causes: ['Injury or biting something hard', 'A weak tooth with a large filling'], care: ['Bonding or filling for small chips', 'Crown, or root canal if the nerve is exposed'], urgent: 'If it hurts or bleeds, see a dentist soon.' },
  { k: 'missing', label: 'Missing tooth', hi: 'दाँत नहीं है', causes: ['Earlier extraction or injury'], care: ['Dental implant', 'Bridge', 'Partial denture'] },
  { k: 'crooked', label: 'Crooked or gapped teeth', hi: 'टेढ़े दाँत', causes: ['Crowding, jaw size or habits'], care: ['Braces', 'Clear aligners'] },
  { k: 'wisdom', label: 'Pain at the back of the jaw', hi: 'अक्कल दाढ़ का दर्द', causes: ['Wisdom tooth coming in or stuck (impacted)', 'Gum infection around it'], care: ['X-ray to check its position', 'Cleaning and medicines, or wisdom tooth removal'], urgent: 'Swelling, fever or difficulty opening the mouth: see a dentist the same day.' },
  { k: 'yellow', label: 'Yellow or stained teeth', hi: 'पीले दाँत', causes: ['Tea, coffee, tobacco or tartar', 'Natural tooth shade'], care: ['Scaling and polishing', 'Teeth whitening or veneers'] },
  { k: 'loose', label: 'Loose tooth (adult)', hi: 'हिलता दाँत', causes: ['Advanced gum disease', 'Injury'], care: ['Gum treatment and splinting', 'Extraction and replacement if it cannot be saved'] },
  { k: 'denture', label: 'Loose or painful denture', hi: 'ढीला नकली दाँत', causes: ['Gums and bone change over time', 'Worn or broken denture'], care: ['Denture relining or repair', 'A new denture, or implant-supported denture'] },
  { k: 'child', label: 'Child’s tooth problem', hi: 'बच्चों के दाँत', causes: ['Cavities in milk teeth', 'Teeth coming in crooked'], care: ['Fillings or pulpectomy for milk teeth', 'Sealants and fluoride to prevent decay', 'Early check for braces'] },
]

const PAGES = [['home', 'Home'], ['about', 'About'], ['services', 'Services'], ['diagnosis', 'Smile check'], ['contact', 'Contact']]

function useSite(site) {
  const { tenant, base, user } = useTenant()
  const tel = `tel:${site.phone.replace(/\s/g, '')}`
  const waText = (t) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(t)}`
  const wa = waText(`Hello ${site.name}, I would like to book an appointment.`)
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapQuery)}`
  const embed = `https://maps.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&z=16&output=embed`
  const docs = site.doctors || [site.doctor]
  const href = (page) => (page === 'home' ? (user ? `${base}/home` : base) : `${base}/site/${page}`)
  const dental = /dental/i.test(tenant.kind || '') || /dental/i.test(site.name)
  return { tenant, base, user, tel, wa, waText, maps, embed, docs, href, dental, src: site.reviewSource || 'Google' }
}

function videosFor(section) {
  return HEALTH_VIDEOS.filter((v) => v.section === section).slice(0, 3)
}

function PageBanner({ title, sub, crumb, go }) {
  return (
    <section className="cw-banner">
      <div className="cs-in">
        <div className="cw-crumb"><button onClick={() => go('home')}>Home</button> <ChevronRight size={14} /> <span>{crumb || title}</span></div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
    </section>
  )
}

function Slider({ site, x, go }) {
  const pick = site.services.slice(0, 4)
  const slides = [
    { eyebrow: site.area, title: <>Healthy teeth,<br /><span>confident smiles.</span></>, text: site.tagline },
    ...pick.slice(0, 3).map(([, title, sub]) => ({ eyebrow: 'Treatment', title: <>{title}</>, text: `${sub} ${detailFor(title)?.visits ? `${detailFor(title).visits}.` : ''}`, service: title })),
  ]
  const [i, setI] = useState(0)
  const [hold, setHold] = useState(false)
  useEffect(() => {
    if (hold || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [hold, slides.length])
  const s = slides[i]
  return (
    <div className="cw-slider" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <div className="cw-slide" key={i}>
        <span className="cw-eyebrow-l">{s.eyebrow}</span>
        <h1>{s.title}</h1>
        <p className="cs-lead">{s.text}</p>
        <div className="cs-cta">
          <a className="cs-btn primary" href={s.service ? x.waText(`Hello ${site.name}, I would like to know about ${s.service}.`) : x.wa} target="_blank" rel="noopener noreferrer"><CalendarCheck /> Book appointment</a>
          {s.service ? <button className="cs-btn ghost" onClick={() => go('services')}>Learn more <ChevronRight /></button>
            : <a className="cs-btn ghost" href={x.tel}><Phone /> {site.phone}</a>}
        </div>
      </div>
      <div className="cw-dots">
        <button aria-label="Previous slide" onClick={() => setI((i - 1 + slides.length) % slides.length)}><ChevronLeft /></button>
        {slides.map((_, n) => <button key={n} className={`cw-dot ${n === i ? 'on' : ''}`} aria-label={`Slide ${n + 1}`} onClick={() => setI(n)} />)}
        <button aria-label="Next slide" onClick={() => setI((i + 1) % slides.length)}><ChevronRight /></button>
      </div>
    </div>
  )
}

function Home({ site, x, go, status }) {
  const d = x.docs[0]
  return (
    <>
      <section className="cs-hero cw-hero">
        <div className="cs-glow" aria-hidden="true" />
        <div className="cs-in cw-hero-in">
          <Slider site={site} x={x} go={go} />
          <div className="cw-hero-art">
            {x.dental ? <Tooth3D fallback={<DentalScreen />} /> : <DentalScreen />}
            <span className="cw-drag small">Drag to turn the tooth</span>
          </div>
        </div>
      </section>

      <section className="cs-in cw-stats">
        <div><Star /><strong>{site.rating}</strong><span>{site.reviews ? `${site.reviews} ${x.src} reviews` : `on ${x.src}`}</span></div>
        <div><Users /><strong>{x.docs.length}</strong><span>{x.docs.length > 1 ? 'Dental surgeons' : 'Dental surgeon'}</span></div>
        <div><Award /><strong>{d.years ? `${d.years}+` : site.services.length}</strong><span>{d.years ? 'Years of practice' : 'Treatments offered'}</span></div>
        <div><Clock /><strong className={status.open ? 'ok' : ''}>{status.open ? 'Open' : 'Closed'}</strong><span>{status.text.replace(/^(Open|Closed) now · /, '')}</span></div>
      </section>

      <section className="cs-in cs-sec">
        <div className="cw-head-row">
          <div className="cs-head"><span className="cs-eyebrow">Our services</span><h2>Complete dental care under one roof</h2></div>
          <button className="cs-btn ghost sm" onClick={() => go('services')}>All services <ChevronRight /></button>
        </div>
        <div className="cs-services">
          {site.services.slice(0, 6).map(([ic, title, sub]) => {
            const Icon = SERVICE_ICON[ic] || Sparkles
            return (
              <button className="cs-svc cw-svc-link" key={title} onClick={() => go('services', title)}>
                <span className="cs-svc-ic"><Icon /></span>
                <strong>{title}</strong>
                <span className="small">{sub}</span>
                <span className="cw-more">Read more <ChevronRight size={14} /></span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="cs-in cs-sec cw-about-strip">
        <div>
          <span className="cs-eyebrow">About the clinic</span>
          <h2>Gentle, honest dental care in {site.area}</h2>
          <p>{site.name} is led by {x.docs.map((v) => v.name).join(' and ')}. Every visit starts with a careful check-up and a clear plan, so you know the options, the number of visits and the cost before treatment begins.</p>
          <button className="cs-btn primary" onClick={() => go('about')}>Meet the doctors <ChevronRight /></button>
        </div>
        <ul className="cw-checks">
          {['Treatment plan and cost explained first', 'Gentle care with local anaesthesia', 'Prescriptions in English and Hindi', 'Records and reports on your phone', 'WhatsApp reminders for your next visit'].map((t) => <li key={t}><CheckCircle2 /> {t}</li>)}
        </ul>
      </section>

      <section className="cs-in cs-sec">
        <div className="cw-cta-band">
          <div>
            <strong>Not sure what treatment you need?</strong>
            <span>Tell us what you feel. Our smile check suggests what it could be, and you can send it to the clinic in one tap.</span>
          </div>
          <button className="cs-btn primary" onClick={() => go('diagnosis')}><ScanLine /> Start smile check</button>
        </div>
      </section>

      <section className="cs-in cs-sec">
        <div className="cs-head"><span className="cs-eyebrow">Your visit</span><h2>What to expect, step by step</h2></div>
        <ol className="cs-steps">
          {STEPS.map(([Icon, t, sub], n) => <li key={t}><span className="cs-step-n">{n + 1}</span><Icon /><strong>{t}</strong><span className="small">{sub}</span></li>)}
        </ol>
      </section>

      <section className="cs-in cs-sec">
        <div className="cs-head"><span className="cs-eyebrow">Questions</span><h2>Frequently asked questions</h2></div>
        <div className="cs-faqs">{FAQ.map(([q, a]) => <Faq key={q} q={q} a={a} />)}</div>
      </section>

      <VisitBlock site={site} x={x} status={status} />
    </>
  )
}

function About({ site, x, go, status }) {
  return (
    <>
      <PageBanner title="About us" sub={`${site.name}, ${site.area}`} go={go} />
      <section className="cs-in cs-sec cw-about">
        <div>
          <span className="cs-eyebrow">Who we are</span>
          <h2>Dental care for the whole family</h2>
          <p>{site.name} offers complete dental treatment in {site.area}, from check-ups and cleaning to root canals, implants, braces and smile makeovers. {site.tagline}</p>
          <p>We believe good treatment starts with understanding. That is why every patient gets a clear explanation of the problem, the options and the cost before anything begins, in Hindi or English.</p>
          <div className="cw-rating"><span className="cs-stars">{[0, 1, 2, 3, 4].map((n) => <Star key={n} />)}</span> <strong>{site.rating}</strong> <span className="muted">{site.reviews ? `from ${site.reviews} ${x.src} reviews` : `on ${x.src}`}</span></div>
        </div>
        <div className="cw-values">
          {[[Wallet, 'Clear costs', 'Options and cost shared before treatment'], [HeartHandshake, 'Gentle care', 'Comfort checked at every step'], [Languages, 'Your language', 'Advice and prescriptions in Hindi and English'], [FileText, 'Digital records', 'Prescriptions, bills and reports on your phone']].map(([Icon, t, sub]) => (
            <div key={t}><Icon /><strong>{t}</strong><span className="small">{sub}</span></div>
          ))}
        </div>
      </section>

      <section className="cs-in cs-sec">
        <div className="cs-head"><span className="cs-eyebrow">Our doctors</span><h2>Meet the team</h2></div>
        <div className="cw-docs">
          {x.docs.map((d) => (
            <div key={d.name} className="cw-doc">
              <span className="cs-doc-av" aria-hidden="true">{initials(d.name)}</span>
              <div>
                <strong>{d.name}</strong>
                <span className="small muted">{d.title}{d.years ? ` · ${d.years}+ years` : ''}</span>
                <ul>{d.quals.map((q) => <li key={q}>{/^reg/i.test(q) ? <BadgeCheck /> : <GraduationCap />}<span>{q}</span></li>)}</ul>
              </div>
            </div>
          ))}
        </div>
      </section>
      <VisitBlock site={site} x={x} status={status} />
    </>
  )
}

function Services({ site, x, go, focus }) {
  useEffect(() => {
    if (!focus) return
    const el = document.getElementById(`svc-${focus.replace(/\W+/g, '-')}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus])
  return (
    <>
      <PageBanner title="Our services" sub="What each treatment involves, how long it takes, and when you might need it." go={go} />
      <div className="cs-in cw-svc-chips">
        {site.services.map(([, title]) => <a key={title} href={`#svc-${title.replace(/\W+/g, '-')}`} onClick={(e) => { e.preventDefault(); document.getElementById(`svc-${title.replace(/\W+/g, '-')}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{title}</a>)}
      </div>
      <section className="cs-in cw-svc-list">
        {site.services.map(([ic, title, sub]) => {
          const Icon = SERVICE_ICON[ic] || Sparkles
          const det = detailFor(title)
          const vids = det?.video ? videosFor(det.video) : []
          return (
            <article key={title} id={`svc-${title.replace(/\W+/g, '-')}`} className="cw-svc-row">
              <span className="cs-svc-ic"><Icon /></span>
              <div className="cw-svc-body">
                <h3>{title}</h3>
                <p>{sub}</p>
                {det && (
                  <div className="cw-svc-grid">
                    <div><strong>When you might need it</strong><p>{det.when}</p></div>
                    <div><strong>What happens</strong><ul>{det.points.map((t) => <li key={t}>{t}</li>)}</ul></div>
                    <div><strong>How long</strong><p><Clock size={14} /> {det.visits}</p></div>
                  </div>
                )}
                <div className="cw-svc-act">
                  <a className="cs-btn primary sm" href={x.waText(`Hello ${site.name}, I would like to book an appointment for ${title}.`)} target="_blank" rel="noopener noreferrer"><CalendarCheck /> Book for {title.split(/[&,(]/)[0].trim().toLowerCase()}</a>
                  {vids.map((v) => <a key={v.id} className="cs-btn ghost sm" href={v.url} target="_blank" rel="noopener noreferrer"><PlayCircle /> {v.lang === 'Hindi' ? 'वीडियो देखें' : 'Watch video'}</a>)}
                </div>
              </div>
            </article>
          )
        })}
      </section>
      <p className="cs-in small muted cs-disclaim">Times are typical ranges. Your dentist will advise what is right for you after a check-up.</p>
    </>
  )
}

function Diagnosis({ site, x, go }) {
  const [sel, setSel] = useState([])
  const [days, setDays] = useState('')
  const toggle = (k) => setSel((s) => (s.includes(k) ? s.filter((v) => v !== k) : [...s, k]))
  const picked = SYMPTOMS.filter((s) => sel.includes(s.k))
  const msg = `Hello ${site.name}, I did the smile check on your website.\nMy problems: ${picked.map((p) => p.label).join(', ')}${days ? `\nSince: ${days}` : ''}\nI would like to book a check-up.`
  return (
    <>
      <PageBanner title="Smile check" crumb="Smile check" sub="Tell us what you feel. We suggest what it could be and the usual treatments. Only a dentist can confirm after examining you." go={go} />
      <section className="cs-in cs-sec cw-diag">
        <div className="cw-diag-pick">
          <h3>1. What are you feeling? <span className="small muted">Tap all that apply</span></h3>
          <div className="cw-sym">
            {SYMPTOMS.map((s) => (
              <button key={s.k} className={sel.includes(s.k) ? 'on' : ''} onClick={() => toggle(s.k)} aria-pressed={sel.includes(s.k)}>
                <strong>{s.label}</strong><span className="hi">{s.hi}</span>
              </button>
            ))}
          </div>
          <h3>2. Since when?</h3>
          <div className="cw-since">
            {['A few days', '1–2 weeks', 'More than a month'].map((d) => <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(days === d ? '' : d)}>{d}</button>)}
          </div>
        </div>
        <div className="cw-diag-out">
          <h3>3. What it could be</h3>
          {!picked.length && <div className="cw-empty"><ScanLine /> Pick one or more problems on the left to see likely causes and treatments.</div>}
          {picked.map((p) => (
            <div key={p.k} className="cw-res">
              <strong>{p.label}</strong>
              <div className="cw-res-grid">
                <div><span className="small muted">Common causes</span><ul>{p.causes.map((c) => <li key={c}>{c}</li>)}</ul></div>
                <div><span className="small muted">Usual treatments</span><ul>{p.care.map((c) => <li key={c}>{c}</li>)}</ul></div>
              </div>
              {p.urgent && <div className="cw-urgent"><AlertTriangle /> {p.urgent}</div>}
            </div>
          ))}
          {picked.length > 0 && (
            <div className="cw-send">
              <a className="cs-btn wa" href={x.waText(msg)} target="_blank" rel="noopener noreferrer"><Send /> Send to the clinic on WhatsApp</a>
              <a className="cs-btn ghost" href={x.tel}><Phone /> Call {site.phone}</a>
            </div>
          )}
          <p className="small muted">This is general information to help you talk to your dentist. It is not a diagnosis.</p>
        </div>
      </section>
    </>
  )
}

function Contact({ site, x, go, status }) {
  const [f, setF] = useState({ name: '', phone: '', day: '', note: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const msg = `Hello ${site.name}, I would like to book an appointment.\nName: ${f.name}\nMobile: ${f.phone}${f.day ? `\nPreferred day: ${f.day}` : ''}${f.note ? `\nProblem: ${f.note}` : ''}`
  const ok = f.name.trim() && /^\d{10}$/.test(f.phone.replace(/\D/g, '').slice(-10))
  return (
    <>
      <PageBanner title="Contact us" sub="Call, WhatsApp or send a request. We reply during clinic hours." go={go} />
      <section className="cs-in cs-sec cw-contact">
        <div className="cs-card">
          <h3><CalendarCheck /> Request an appointment</h3>
          <form className="cw-form" onSubmit={(e) => { e.preventDefault(); if (ok) window.open(x.waText(msg), '_blank', 'noopener') }}>
            <label>Your name<input value={f.name} onChange={set('name')} autoComplete="name" required /></label>
            <label>Mobile number<input value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="10 digits" required /></label>
            <label>Preferred day<input type="date" value={f.day} onChange={set('day')} /></label>
            <label>What is the problem? (optional)<textarea rows={3} value={f.note} onChange={set('note')} placeholder="e.g. toothache on the left side" /></label>
            <button className="cs-btn wa" type="submit" disabled={!ok}><Send /> Send on WhatsApp</button>
            <span className="small muted">Opens WhatsApp with your request ready. Press Send there.</span>
          </form>
        </div>
        <div className="cw-contact-side">
          <a className="cw-cline" href={x.tel}><Phone /><span><strong>{site.phone}</strong><span className="small muted">Call the clinic</span></span></a>
          <a className="cw-cline" href={x.wa} target="_blank" rel="noopener noreferrer"><MessageCircle /><span><strong>WhatsApp</strong><span className="small muted">Chat with the clinic</span></span></a>
          <a className="cw-cline" href={x.maps} target="_blank" rel="noopener noreferrer"><MapPin /><span><strong>{site.addrLines?.[0] || site.area}</strong><span className="small muted">{site.address}</span></span></a>
          <div className="cw-cline"><Clock /><span><strong>{status.text}</strong><span className="small muted">See all timings below</span></span></div>
        </div>
      </section>
      <VisitBlock site={site} x={x} status={status} />
    </>
  )
}

function VisitBlock({ site, x, status }) {
  return (
    <section className="cs-in cs-sec cs-visit">
      <div className="cs-card">
        <h3><Clock /> Clinic timings</h3>
        <table className="cs-hours"><tbody>
          {site.hours.map(([day, list]) => (
            <tr key={day} className={day === status.day ? 'today' : ''}>
              <th>{DAYS[day]}{day === status.day && <span className="cs-today">Today</span>}</th>
              <td>{slots(list)}</td>
            </tr>
          ))}
        </tbody></table>
        <a className="cs-btn primary block" href={x.tel}><Phone /> Call to book a visit</a>
      </div>
      <div className="cs-card cs-map-card">
        <h3><MapPin /> Find us</h3>
        <p>{site.address}</p>
        <div className="cs-map"><iframe title={`Map to ${site.name}`} src={x.embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
        <a className="cs-btn ghost block" href={x.maps} target="_blank" rel="noopener noreferrer"><Navigation /> Open in Google Maps</a>
      </div>
    </section>
  )
}

export default function ClinicSite({ site, page = 'home' }) {
  const x = useSite(site)
  const nav = useNavigate()
  const status = useOpenNow(site.hours)
  const [menu, setMenu] = useState(false)
  const [focus, setFocus] = useState('')
  const go = (p, f = '') => { setMenu(false); setFocus(f); nav(x.href(p)) }
  const cur = PAGES.some(([k]) => k === page) ? page : 'home'

  useEffect(() => {
    const before = document.title
    const label = PAGES.find(([k]) => k === cur)?.[1]
    document.title = `${cur === 'home' ? '' : `${label} · `}${site.name} · ${site.area}`
    return () => { document.title = before }
  }, [site.name, cur])
  useEffect(() => { if (!focus) window.scrollTo({ top: 0 }) }, [cur]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cs cw">
      <div className="cw-top">
        <div className="cs-in cw-top-in">
          <span><Clock size={14} /> {status.text}</span>
          <a href={x.tel}><Phone size={14} /> {site.phone}</a>
          <span className="cw-top-addr"><MapPin size={14} /> {site.addrLines?.join(', ') || site.area}</span>
        </div>
      </div>
      <header className="cs-nav">
        <div className="cs-in cs-nav-in">
          <button className="cs-brand cw-brand" onClick={() => go('home')}>
            <BrandMark tenant={x.tenant} size={38} />
            <div><strong>{site.name}</strong><span className="small">Dental clinic · {site.area}</span></div>
          </button>
          <nav className={`cw-links ${menu ? 'open' : ''}`} aria-label="Website">
            {PAGES.map(([k, label]) => <button key={k} className={cur === k ? 'on' : ''} onClick={() => go(k)}>{label}</button>)}
            <button className="cw-staff" onClick={() => { setMenu(false); nav(x.user ? x.base : `${x.base}/login`) }}><LogIn size={15} /> {x.user ? 'Dashboard' : 'Staff sign in'}</button>
          </nav>
          <div className="cw-nav-cta">
            <a className="cs-btn primary sm" href={x.wa} target="_blank" rel="noopener noreferrer"><CalendarCheck /> <span className="cw-hide-s">Book appointment</span><span className="cw-show-s">Book</span></a>
            <button className="cw-burger" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
          </div>
        </div>
      </header>

      <main className="cw-main">
        {cur === 'home' && <Home site={site} x={x} go={go} status={status} />}
        {cur === 'about' && <About site={site} x={x} go={go} status={status} />}
        {cur === 'services' && <Services site={site} x={x} go={go} focus={focus} />}
        {cur === 'diagnosis' && <Diagnosis site={site} x={x} go={go} />}
        {cur === 'contact' && <Contact site={site} x={x} go={go} status={status} />}
      </main>

      <footer className="cw-foot">
        <div className="cs-in cw-foot-in">
          <div>
            <div className="cw-foot-brand"><BrandMark tenant={x.tenant} size={34} /><strong>{site.name}</strong></div>
            <p>{site.tagline}</p>
            <div className="cw-rating"><span className="cs-stars">{[0, 1, 2, 3, 4].map((n) => <Star key={n} />)}</span> <strong>{site.rating}</strong> <span>{site.reviews ? `${site.reviews} ${x.src} reviews` : x.src}</span></div>
          </div>
          <div>
            <strong>Quick links</strong>
            {PAGES.map(([k, label]) => <button key={k} onClick={() => go(k)}>{label}</button>)}
          </div>
          <div>
            <strong>Services</strong>
            {site.services.slice(0, 6).map(([, title]) => <button key={title} onClick={() => go('services', title)}>{title}</button>)}
          </div>
          <div>
            <strong>Contact</strong>
            <a href={x.tel}><Phone size={14} /> {site.phone}</a>
            <a href={x.wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> WhatsApp</a>
            <a href={x.maps} target="_blank" rel="noopener noreferrer"><MapPin size={14} /> {site.area}</a>
            {site.hours.length > 0 && <span><Clock size={14} /> {slots(site.hours.find(([dd]) => dd === 1)?.[1] || site.hours[0][1])} (Mon)</span>}
          </div>
        </div>
      </footer>

      <div className="cs-callbar">
        <a className="cs-btn primary" href={x.tel}><Phone /> Call</a>
        <a className="cs-btn wa" href={x.wa} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a>
        <a className="cs-btn ghost" href={x.maps} target="_blank" rel="noopener noreferrer"><Navigation /> Map</a>
      </div>
      <SiteFooter className="cs-footer" />
    </div>
  )
}
