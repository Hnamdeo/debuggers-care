import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarPlus, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'
import { useTenant, PageHead, Card, Table, Pill, Select, toast } from '../components/ui'
import { BookAppointment } from '../components/forms'
import { db } from '../lib/store'
import { today, addDays, fmtDate, fmtTime } from '../lib/utils'
import { slotsOn, slotMinutes, hoursOn } from '../lib/slots'
import { BookAppointment as Book } from '../components/forms'

export default function Appointments() {
  const { tid, tenant, list, patient, staff, doctors, user, me, base } = useTenant()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [date, setDate] = useState(today())
  const isDoc = user.role === 'doctor'
  const [doc, setDoc] = useState(isDoc ? me.id : 'all')
  const [view, setView] = useState(() => { try { return localStorage.getItem('ap-view') || 'slots' } catch { return 'slots' } })
  const [book, setBook] = useState(null)
  const pickView = (v) => { setView(v); try { localStorage.setItem('ap-view', v) } catch { /* private mode */ } }
  const rows = list('appointments')
    .filter((a) => a.date === date && (doc === 'all' || a.doctorId === doc))
    .sort((a, b) => a.time.localeCompare(b.time))
  const setStatus = (a, status) => {
    db.update(tid, 'appointments', a.id, { status })
    toast(`${patient(a.patientId).name}: ${status === 'checked-in' ? 'checked in' : status}`)
  }
  const counts = ['scheduled', 'checked-in', 'completed', 'cancelled'].map((s) => [s, rows.filter((r) => r.status === s).length])

  return (
    <>
      <PageHead title="Appointments" sub={`${fmtDate(date)}${date === today() ? ' · today' : ''}`}>
        <button className="btn primary" onClick={() => setParams({ new: '1' })}><CalendarPlus /> Book appointment</button>
      </PageHead>
      <div className="row between">
        <div className="row">
          <button className="btn sm" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><ChevronLeft /></button>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 160 }} aria-label="Date" />
          <button className="btn sm" onClick={() => setDate(addDays(date, 1))} aria-label="Next day"><ChevronRight /></button>
          {date !== today() && <button className="btn sm" onClick={() => setDate(today())}>Today</button>}
        </div>
        <div className="row">
          {counts.map(([s, n]) => <Pill key={s} status={s}>{`${n} ${s === 'checked-in' ? 'checked in' : s}`}</Pill>)}
          {(!isDoc || doctors().length > 1) && <Select id="ap-doc" value={doc} onChange={(e) => setDoc(e.target.value)} options={[{ value: 'all', label: 'All doctors' }, ...doctors().map((d) => ({ value: d.id, label: d.name }))]} style={{ width: 200 }} />}
        </div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button className={`btn sm ${view === 'slots' ? 'primary' : ''}`} onClick={() => pickView('slots')}><LayoutGrid /> Time slots</button>
        <button className={`btn sm ${view === 'list' ? 'primary' : ''}`} onClick={() => pickView('list')}><List /> List</button>
      </div>
      {view === 'slots' ? (
        (doc === 'all' ? doctors().map((d) => d.id) : [doc]).map((id) => <SlotBoard key={id} date={date} doctorId={id} onBook={(time, doctorId) => setBook({ time, doctorId })} />)
      ) : (
      <Card>
        <Table
          rows={rows}
          empty="No appointments on this day."
          cols={[
            { label: 'Time', render: (a) => <span className="tabular cell-main">{fmtTime(a.time)}</span> },
            { label: 'Patient', render: (a) => <><a href="#" onClick={(e) => { e.preventDefault(); nav(`${base}/patients/${a.patientId}`) }} className="cell-main">{patient(a.patientId)?.name}</a><div className="cell-sub">{a.patientId} · {patient(a.patientId)?.phone}</div></> },
            { label: 'Reason', key: 'reason' },
            ...(isDoc ? [] : [{ label: 'Doctor', render: (a) => <><div>{staff(a.doctorId)?.name}</div><div className="cell-sub">{staff(a.doctorId)?.dept}</div></> }]),
            { label: 'Status', render: (a) => <Pill status={a.status} /> },
            {
              label: '', render: (a) => (
                <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                  {a.status === 'scheduled' && <button className="btn sm" onClick={() => setStatus(a, 'checked-in')}>Check in</button>}
                  {(a.status === 'scheduled' || a.status === 'checked-in') && (isDoc || user.role === 'admin') && <button className="btn sm primary" onClick={() => nav(`${base}/consult/${a.id}`)}>Consult</button>}
                  {a.status === 'scheduled' && <button className="btn sm ghost danger" onClick={() => setStatus(a, 'cancelled')}>Cancel</button>}
                  {a.status === 'completed' && <button className="btn sm" onClick={() => nav(`${base}/patients/${a.patientId}`)}>Record</button>}
                </div>
              ),
            },
          ]}
        />
      </Card>
      )}
      {params.get('new') === '1' && <BookAppointment doctorId={isDoc ? me.id : undefined} onClose={(a) => { setParams({}); if (a) setDate(a.date) }} />}
      {book && <BookAppointment date={date} time={book.time} doctorId={book.doctorId} onClose={() => setBook(null)} />}
    </>
  )
}

// The day as a board of time slots: booked ones show the patient, free ones book with one tap.
function SlotBoard({ date, doctorId, onBook }) {
  const { tenant, list, patient, staff, user, base } = useTenant()
  const nav = useNavigate()
  const slots = slotsOn(tenant, date)
  const appts = list('appointments').filter((a) => a.date === date && a.doctorId === doctorId && a.status !== 'cancelled')
  const byTime = Object.fromEntries(appts.map((a) => [a.time, a]))
  const times = [...new Set([...slots, ...appts.map((a) => a.time)])].sort()
  const nowHM = new Date().toTimeString().slice(0, 5)
  const past = (t) => date < today() || (date === today() && t < nowHM)
  const canConsult = user.role === 'doctor' || user.role === 'admin'
  const free = slots.filter((t) => !byTime[t] && !past(t)).length
  if (!times.length) return <Card><div className="empty">The clinic is closed on {fmtDate(date)}. Pick another day.</div></Card>
  return (
    <Card title={<h2>{staff(doctorId)?.name}</h2>} actions={<span className="small muted">{free} free · {appts.length} booked · {slotMinutes(tenant)} min each</span>}>
      <div className="slot-board">
        {times.map((t) => {
          const a = byTime[t]
          if (a) {
            const p = patient(a.patientId)
            const open = () => (canConsult && a.status !== 'completed' ? nav(`${base}/consult/${a.id}`) : nav(`${base}/patients/${a.patientId}`))
            return (
              <button key={t} className={`slot booked s-${a.status}`} onClick={open} title={a.reason}>
                <span className="slot-time">{fmtTime(t)}</span>
                <span className="slot-name">{p?.name || a.patientId}</span>
                <span className="slot-sub">{a.status === 'checked-in' ? 'Checked in' : a.status === 'completed' ? 'Done' : 'Booked'}{slots.includes(t) ? '' : ' · walk-in'}</span>
              </button>
            )
          }
          return past(t) ? (
            <div key={t} className="slot past"><span className="slot-time">{fmtTime(t)}</span><span className="slot-sub">Past</span></div>
          ) : (
            <button key={t} className="slot free" onClick={() => onBook(t, doctorId)}>
              <span className="slot-time">{fmtTime(t)}</span>
              <span className="slot-sub">Free · tap to book</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

const hText = (h) => { const m = Math.round(h * 60); return fmtTime(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`) }

// Dashboard strip: today's opening hours and every slot, booked or free, for one doctor (or all doctors together).
export function TodayTimings({ doctorId }) {
  const { tenant, list, patient, doctors, base } = useTenant()
  const nav = useNavigate()
  const [book, setBook] = useState(null)
  const T = today()
  const docs = doctorId ? [doctorId] : doctors().map((d) => d.id)
  const hours = hoursOn(tenant, T)
  const slots = slotsOn(tenant, T)
  const appts = list('appointments').filter((a) => a.date === T && docs.includes(a.doctorId) && a.status !== 'cancelled')
  const nowHM = new Date().toTimeString().slice(0, 5)
  const times = [...new Set([...slots, ...appts.map((a) => a.time)])].sort()
  const bookedAt = (t) => appts.filter((a) => a.time === t)
  const freeAt = (t) => slots.includes(t) && bookedAt(t).length < docs.length
  const upcomingFree = times.filter((t) => t >= nowHM && freeAt(t))
  return (
    <Card title={<h2>Today’s timings</h2>} actions={<button className="btn sm" onClick={() => nav(`${base}/appointments`)}>Open schedule</button>}>
      <div className="small muted" style={{ marginBottom: 10 }}>
        {hours.length ? `Open ${hours.map(([a, b]) => `${hText(a)} to ${hText(b)}`).join(' and ')}` : 'Clinic closed today'}
        {` · ${appts.length} booked · ${upcomingFree.length} free slots left`}
        {upcomingFree[0] ? ` · next free ${fmtTime(upcomingFree[0])}` : ''}
      </div>
      {times.length > 0 && (
        <div className="slot-strip">
          {times.map((t) => {
            const b = bookedAt(t)
            const isPast = t < nowHM
            if (b.length) return b.map((a) => (
              <button key={a.id} className={`chip-slot booked s-${a.status}`} onClick={() => nav(`${base}/patients/${a.patientId}`)} title={a.reason}>
                <b>{fmtTime(t)}</b><span>{patient(a.patientId)?.name}</span>
              </button>
            ))
            return isPast ? null : (
              <button key={t} className="chip-slot free" onClick={() => setBook(t)}><b>{fmtTime(t)}</b><span>Free</span></button>
            )
          })}
        </div>
      )}
      {book && <Book date={T} time={book} doctorId={doctorId} onClose={() => setBook(null)} />}
    </Card>
  )
}
