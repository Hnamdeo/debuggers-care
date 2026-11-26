import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Plus, Sparkles, ChevronRight, ChevronDown, LogOut, Settings as SettingsIcon, CalendarPlus, UserPlus, Pill, Receipt, BedDouble, PanelRightClose } from 'lucide-react'
import { useTenant, Avatar } from './ui'
import { MODULES, hasModule, ROLE_LABEL } from '../lib/plans'

// Enterprise top bar (Pro look): where you are, one search for every patient, a "+ New" menu
// for the everyday jobs, and the AI assistant on demand instead of always open.
const EXTRA = { analytics: 'Practice analytics', expenses: 'Expenses', smile: 'AI Smile preview', settings: 'Plan & settings', consult: 'Consultation', home: 'Clinic home page' }

export function AppBar({ mods, lookSwitch, onLogout, canSettings }) {
  const { tenant, list, base, me, user } = useTenant()
  const nav = useNavigate()
  const loc = useLocation()
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const [menu, setMenu] = useState(false)
  const [who, setWho] = useState(false)
  const box = useRef(null)
  const [aiOn, setAiOn] = useState(() => document.body.classList.contains('ai-shown'))
  useEffect(() => {
    const on = () => setAiOn(document.body.classList.contains('ai-shown'))
    window.addEventListener('ai-state', on)
    on()
    return () => window.removeEventListener('ai-state', on)
  }, [])
  const input = useRef(null)

  const parts = loc.pathname.replace(base, '').split('/').filter(Boolean)
  const section = parts[0] || 'dashboard'
  const title = MODULES[section]?.label || EXTRA[section] || 'Dashboard'
  const child = parts[1] && section === 'patients' ? list('patients').find((p) => p.id === parts[1])?.name : null

  const hits = q.trim().length < 2 ? [] : list('patients')
    .filter((p) => `${p.name} ${p.phone} ${p.id} ${p.opdNo || ''}`.toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 7)

  // "/" jumps to the search box, as in most business apps.
  useEffect(() => {
    const key = (e) => {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) { e.preventDefault(); input.current?.focus() }
    }
    const away = (e) => { if (!box.current?.contains(e.target)) { setQ(''); setMenu(false); setWho(false) } }
    window.addEventListener('keydown', key)
    window.addEventListener('mousedown', away)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('mousedown', away) }
  }, [])

  const open = (p) => { setQ(''); nav(`${base}/patients/${p.id}`) }
  const can = (m) => mods.includes(m) && hasModule(tenant, m)
  const news = [
    can('appointments') && [CalendarPlus, 'Appointment', `${base}/appointments?new=1`],
    can('patients') && [UserPlus, 'Patient', `${base}/patients?new=1`],
    can('prescriptions') && [Pill, 'Prescription', `${base}/prescriptions`],
    can('billing') && [Receipt, 'Bill', `${base}/billing`],
    can('ipd') && [BedDouble, 'Admission', `${base}/ipd`],
  ].filter(Boolean)

  return (
    <header className="appbar" ref={box}>
      <nav className="ab-crumbs" aria-label="Breadcrumb">
        <span className="muted">{tenant.short || tenant.name}</span>
        <ChevronRight />
        {child ? <><button className="ab-link" onClick={() => nav(`${base}/patients`)}>{title}</button><ChevronRight /><b>{child}</b></> : <b>{title}</b>}
      </nav>

      <div className="ab-search">
        <Search />
        <input ref={input} value={q} placeholder="Search patients by name, mobile or UHID" aria-label="Search patients"
          onChange={(e) => { setQ(e.target.value); setHi(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, hits.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
            if (e.key === 'Enter' && hits[hi]) open(hits[hi])
            if (e.key === 'Escape') { setQ(''); e.target.blur() }
          }} />
        <kbd>/</kbd>
        {q.trim().length >= 2 && (
          <div className="ab-results" role="listbox">
            {hits.length ? hits.map((p, i) => (
              <button key={p.id} role="option" aria-selected={i === hi} className={i === hi ? 'on' : ''} onMouseEnter={() => setHi(i)} onClick={() => open(p)}>
                <Avatar name={p.name} />
                <span><b>{p.name}</b><small>{p.id} · {p.phone}{p.age ? ` · ${p.age} y` : ''}</small></span>
              </button>
            )) : <div className="ab-none">No patient matches “{q.trim()}”.</div>}
          </div>
        )}
      </div>

      <div className="ab-actions">
        {news.length > 0 && (
          <div className="ab-new">
            <button className="btn primary" onClick={() => { setMenu((m) => !m); setWho(false) }} aria-expanded={menu}><Plus /> New</button>
            {menu && (
              <div className="ab-menu" role="menu">
                {news.map(([Icon, label, to]) => (
                  <button key={label} role="menuitem" onClick={() => { setMenu(false); nav(to) }}><Icon /> {label}</button>
                ))}
              </div>
            )}
          </div>
        )}
        <button className={`btn ab-ai ${aiOn ? 'on' : ''}`} onClick={() => window.dispatchEvent(new Event('ai-toggle'))} aria-pressed={aiOn} title={`${aiOn ? 'Hide' : 'Show'} the AI assistant (Ctrl+K)`}>{aiOn ? <PanelRightClose /> : <Sparkles />} {aiOn ? 'Hide AI' : 'Show AI'}</button>
        <div className="ab-new">
          <button className="ab-me" onClick={() => { setWho((w) => !w); setMenu(false) }} aria-expanded={who} aria-haspopup="menu">
            <Avatar name={me?.name} />
            <span className="ab-me-t"><b>{me?.name}</b><small>{ROLE_LABEL[user.role]}{me?.dept && user.role === 'doctor' ? ` · ${me.dept}` : ''}</small></span>
            <ChevronDown />
          </button>
          {who && (
            <div className="ab-menu ab-who" role="menu">
              <div className="ab-who-head"><Avatar name={me?.name} /><span><b>{me?.name}</b><small>{ROLE_LABEL[user.role]} · {tenant.name}</small></span></div>
              <div className="ab-who-sec"><small>Screen look</small>{lookSwitch}</div>
              {canSettings && <button role="menuitem" onClick={() => { setWho(false); nav(`${base}/settings`) }}><SettingsIcon /> Plan &amp; settings</button>}
              <button role="menuitem" onClick={() => { setWho(false); onLogout() }}><LogOut /> Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
