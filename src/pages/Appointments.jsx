import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTenant, PageHead, Card, Table, Pill, Select, toast } from '../components/ui'
import { BookAppointment } from '../components/forms'
import { db } from '../lib/store'
import { today, addDays, fmtDate, fmtTime } from '../lib/utils'

export default function Appointments() {
  const { tid, list, patient, staff, doctors, user, me, base } = useTenant()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [date, setDate] = useState(today())
  const isDoc = user.role === 'doctor'
  const [doc, setDoc] = useState(isDoc ? me.id : 'all')
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
          {!isDoc && <Select id="ap-doc" value={doc} onChange={(e) => setDoc(e.target.value)} options={[{ value: 'all', label: 'All doctors' }, ...doctors().map((d) => ({ value: d.id, label: d.name }))]} style={{ width: 200 }} />}
        </div>
      </div>
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
      {params.get('new') === '1' && <BookAppointment doctorId={isDoc ? me.id : undefined} onClose={(a) => { setParams({}); if (a) setDate(a.date) }} />}
    </>
  )
}
