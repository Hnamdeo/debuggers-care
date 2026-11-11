import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import { useTenant, PageHead, Card, Table, Pill, toast } from '../components/ui'
import { PatientHeader, PatientRecord } from './Patients'
import { BookAppointment } from '../components/forms'
import { InvoiceDoc } from '../components/docs'
import { db } from '../lib/store'
import { fmtDate, fmtTime, money, billTotal, billStatus, today } from '../lib/utils'

export function PatientHome() {
  const { me, base } = useTenant()
  const nav = useNavigate()
  return (
    <>
      <PatientHeader p={me}>
        <button className="btn primary" onClick={() => nav(`${base}/book`)}><CalendarPlus /> Book appointment</button>
      </PatientHeader>
      <PatientRecord p={me} />
    </>
  )
}

export function PatientBook() {
  const { me, base, doctors } = useTenant()
  const nav = useNavigate()
  const [doc, setDoc] = useState(null)
  return (
    <>
      <PageHead title="Book an appointment" sub="Pick a doctor, then a free time" />
      <div className="grid g3">
        {doctors().map((d) => (
          <div key={d.id} className="tenant-card">
            <strong>{d.name}</strong>
            <span className="small muted">{d.dept} · {d.qualification}</span>
            <span className="small">Consultation {money(d.fee)}</span>
            <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => setDoc(d.id)}>Choose time</button>
          </div>
        ))}
      </div>
      {doc && <BookAppointment patientId={me.id} doctorId={doc} onClose={(a) => { setDoc(null); if (a) nav(`${base}/my-appointments`) }} />}
    </>
  )
}

export function PatientAppointments() {
  const { tid, me, list, staff } = useTenant()
  const rows = list('appointments').filter((a) => a.patientId === me.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  return (
    <>
      <PageHead title="My appointments" />
      <Card>
        <Table rows={rows} empty="You have no appointments yet." cols={[
          { label: 'Date', render: (a) => <><div className="cell-main">{fmtDate(a.date)}</div><div className="cell-sub">{fmtTime(a.time)}</div></> },
          { label: 'Doctor', render: (a) => <><div>{staff(a.doctorId)?.name}</div><div className="cell-sub">{staff(a.doctorId)?.dept}</div></> },
          { label: 'Reason', key: 'reason' },
          { label: 'Status', render: (a) => <Pill status={a.status} /> },
          { label: '', render: (a) => a.status === 'scheduled' && a.date >= today() && <button className="btn sm ghost danger" onClick={() => { db.update(tid, 'appointments', a.id, { status: 'cancelled' }); toast('Appointment cancelled') }}>Cancel</button> },
        ]} />
      </Card>
    </>
  )
}

export function PatientBills() {
  const { tid, me, list } = useTenant()
  const [open, setOpen] = useState(null)
  const bills = list('bills').filter((b) => b.patientId === me.id).sort((a, b) => b.date.localeCompare(a.date))
  const due = bills.reduce((s, b) => s + Math.max(0, billTotal(b) - b.paid), 0)
  return (
    <>
      <PageHead title="My bills" sub={due ? `${money(due)} to pay` : 'All bills are paid'} />
      <Card>
        <Table rows={bills} onRow={(b) => setOpen(b.id)} cols={[
          { label: 'Invoice', render: (b) => <><div className="cell-main">{b.id}</div><div className="cell-sub">{fmtDate(b.date)} · {b.source}</div></> },
          { label: 'Items', render: (b) => <span className="small">{b.items.map((i) => i.desc).join(', ')}</span> },
          { label: 'Amount', num: true, render: (b) => money(billTotal(b)) },
          { label: 'Status', render: (b) => <Pill status={billStatus(b)} /> },
          { label: '', render: (b) => billStatus(b) !== 'paid' && <button className="btn sm primary" onClick={(e) => { e.stopPropagation(); db.update(tid, 'bills', b.id, { paid: billTotal(b), mode: 'UPI' }); toast(`Paid ${money(billTotal(b) - b.paid)} by UPI (demo)`) }}>Pay by UPI</button> },
        ]} />
      </Card>
      {open && <InvoiceDoc bill={bills.find((b) => b.id === open)} onClose={() => setOpen(null)} />}
    </>
  )
}
