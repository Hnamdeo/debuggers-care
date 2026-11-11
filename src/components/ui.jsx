import { createContext, useContext, useEffect, useState } from 'react'
import { X, Search, Printer } from 'lucide-react'
import { initials } from '../lib/utils'

export const TenantCtx = createContext(null)
export const useTenant = () => useContext(TenantCtx)

// ---- toast ----
let pushToast = () => {}
export const toast = (msg) => pushToast(msg)
export function Toaster() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    let t
    pushToast = (m) => {
      setMsg(m)
      clearTimeout(t)
      t = setTimeout(() => setMsg(''), 2600)
    }
  }, [])
  return msg ? <div className="toast" role="status">{msg}</div> : null
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  )
}

export function Card({ title, actions, children, pad, className = '' }) {
  return (
    <section className={`card ${pad ? 'pad' : ''} ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {typeof title === 'string' ? <h2>{title}</h2> : title}
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      {pad ? children : <div className="card-body">{children}</div>}
    </section>
  )
}

export function Stat({ label, value, sub, icon: Icon }) {
  return (
    <div className="card stat">
      <div className="row between">
        <span className="eyebrow">{label}</span>
        {Icon && <Icon size={16} className="faint" />}
      </div>
      <span className="v">{value}</span>
      {sub && <span className="sub">{sub}</span>}
    </div>
  )
}

const STATUS_TONE = {
  scheduled: 'info', 'checked-in': 'warn', completed: 'ok', cancelled: 'plain',
  paid: 'ok', unpaid: 'bad', partial: 'warn',
  ordered: 'warn', admitted: 'info', discharged: 'ok',
  waiting: 'warn', 'in-treatment': 'info',
  processed: 'warn', dispensed: 'ok', pending: 'warn',
  red: 'bad', yellow: 'warn', green: 'ok', low: 'bad', expiring: 'warn', ok: 'ok',
}
const STATUS_TEXT = { 'checked-in': 'Checked in', 'in-treatment': 'In treatment', red: 'Critical', yellow: 'Urgent', green: 'Stable' }
export function Pill({ status, children, tone }) {
  const t = tone || STATUS_TONE[status] || ''
  const text = children || STATUS_TEXT[status] || (status ? status[0].toUpperCase() + status.slice(1) : '')
  return <span className={`pill ${t}`}>{text}</span>
}

export function Avatar({ name, lg }) {
  return <span className={`avatar ${lg ? 'lg' : ''}`}>{initials(name || '?')}</span>
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Input({ label, ...p }) {
  const el = <input className="input" {...p} />
  return label ? <Field label={label}>{el}</Field> : el
}
export function Select({ label, options, ...p }) {
  const el = (
    <select className="input" {...p}>
      {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  )
  return label ? <Field label={label}>{el}</Field> : el
}
export function Textarea({ label, ...p }) {
  const el = <textarea className="input" {...p} />
  return label ? <Field label={label}>{el}</Field> : el
}

export function SearchBox({ value, onChange, placeholder = 'Search' }) {
  return (
    <div className="search">
      <Search />
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab ${value === t.id ? 'active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count != null && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Table({ cols, rows, onRow, empty = 'Nothing here yet.' }) {
  if (!rows.length) return <div className="empty">{empty}</div>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{cols.map((c) => <th key={c.key || c.label} className={c.num ? 'num' : ''}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={onRow ? 'click' : ''} onClick={onRow ? () => onRow(r) : undefined}>
              {cols.map((c) => <td key={c.key || c.label} className={c.num ? 'num' : ''}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Printable documents. Printing is not available inside the shareable demo frame,
// so the button only shows in the normal (hosted) build.
const CAN_PRINT = import.meta.env.MODE !== 'single'
export function DocModal({ title, onClose, children, extra }) {
  return (
    <Modal title={title} onClose={onClose} wide footer={<>{extra}{CAN_PRINT && <button className="btn" onClick={() => window.print()}><Printer /> Print</button>}<button className="btn primary" onClick={onClose}>Done</button></>}>
      {children}
    </Modal>
  )
}

export function SheetHead({ tenant, title, sub }) {
  return (
    <div className="sheet-head">
      <div>
        <h2>{tenant.name}</h2>
        <div className="muted small">{tenant.address}</div>
        <div className="muted small">{tenant.phone}{tenant.regNo ? ` · Reg. ${tenant.regNo}` : ''}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <h3>{title}</h3>
        {sub && <div className="muted small">{sub}</div>}
      </div>
    </div>
  )
}
