import { useNavigate } from 'react-router-dom'
import { CalendarDays, Users, IndianRupee, BedDouble, Siren, PackageX, FlaskConical, Clock } from 'lucide-react'
import { useTenant, PageHead, Stat, Card, Table, Pill } from '../components/ui'
import { today, addDays, fmtTime, money, billTotal, fmtDate } from '../lib/utils'

export default function Dashboard() {
  const t = useTenant()
  return t.user.role === 'doctor' ? <DoctorDash /> : <AdminDash />
}

function RevenueBars({ bills }) {
  const T = today()
  const days = Array.from({ length: 7 }, (_, i) => addDays(T, i - 6))
  const vals = days.map((d) => bills.filter((b) => b.date === d).reduce((s, b) => s + Math.min(b.paid, billTotal(b)), 0))
  const max = Math.max(...vals, 1)
  return (
    <div className="bars" aria-label="Collections, last 7 days">
      {days.map((d, i) => (
        <div key={d} className={`bar ${d === T ? 'today' : ''}`}>
          <b>{vals[i] ? (vals[i] >= 1000 ? `${(vals[i] / 1000).toFixed(1)}k` : vals[i]) : '0'}</b>
          <i style={{ height: `${(vals[i] / max) * 100}%` }} />
          <span>{new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}</span>
        </div>
      ))}
    </div>
  )
}

function AdminDash() {
  const { tenant, list, patient, staff, can, base, me } = useTenant()
  const nav = useNavigate()
  const T = today()
  const appts = list('appointments')
  const todays = appts.filter((a) => a.date === T).sort((a, b) => a.time.localeCompare(b.time))
  const bills = list('bills')
  const month = T.slice(0, 7)
  const collectedMonth = bills.filter((b) => b.date.startsWith(month)).reduce((s, b) => s + Math.min(b.paid, billTotal(b)), 0)
  const due = bills.reduce((s, b) => s + Math.max(0, billTotal(b) - b.paid), 0)
  const beds = list('beds')
  const occupied = list('admissions').filter((a) => a.status === 'admitted')
  const icuBeds = beds.filter((b) => b.ward === 'ICU')
  const icuOcc = occupied.filter((a) => icuBeds.some((b) => b.id === a.bedId)).length
  const er = list('emergencies').filter((e) => ['waiting', 'in-treatment'].includes(e.status))
  const low = list('medicines').filter((m) => m.stock <= m.reorder)
  const pendingLabs = list('reports').filter((r) => r.status === 'ordered')

  return (
    <>
      <PageHead title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${me.name.split(' ')[0]}`} sub={`${tenant.name} · ${fmtDate(T)}`}>
        <button className="btn primary" onClick={() => nav(`${base}/appointments?new=1`)}><CalendarDays /> Book appointment</button>
        <button className="btn" onClick={() => nav(`${base}/patients?new=1`)}><Users /> Register patient</button>
      </PageHead>
      <div className="grid g4">
        <Stat label="Appointments today" value={todays.length} sub={`${todays.filter((a) => a.status === 'completed').length} seen · ${todays.filter((a) => a.status === 'scheduled').length} waiting`} icon={CalendarDays} />
        <Stat label="Collected this month" value={money(collectedMonth)} sub={`${money(due)} still due`} icon={IndianRupee} />
        {can('ipd') ? (
          <Stat label="Beds occupied" value={`${occupied.length} / ${beds.length}`} sub={`ICU ${icuOcc} of ${icuBeds.length}`} icon={BedDouble} />
        ) : (
          <Stat label="Patients registered" value={list('patients').length} sub={`${list('patients').filter((p) => p.regDate.startsWith(month)).length} new this month`} icon={Users} />
        )}
        {can('emergency') ? (
          <Stat label="Emergency active" value={er.length} sub={`${er.filter((e) => e.triage === 'red').length} critical`} icon={Siren} />
        ) : can('pharmacy') ? (
          <Stat label="Low stock items" value={low.length} sub="At or below reorder level" icon={PackageX} />
        ) : (
          <Stat label="Lab reports pending" value={pendingLabs.length} sub="Ordered, results not entered" icon={FlaskConical} />
        )}
      </div>
      <div className="grid g2">
        <Card title="Today’s appointments" actions={<button className="btn sm" onClick={() => nav(`${base}/appointments`)}>Open schedule</button>}>
          <Table
            rows={todays.slice(0, 8)}
            onRow={(a) => nav(`${base}/patients/${a.patientId}`)}
            empty="No appointments booked for today."
            cols={[
              { label: 'Time', render: (a) => <span className="tabular">{fmtTime(a.time)}</span> },
              { label: 'Patient', render: (a) => <><div className="cell-main">{patient(a.patientId)?.name}</div><div className="cell-sub">{a.reason}</div></> },
              { label: 'Doctor', render: (a) => staff(a.doctorId)?.name },
              { label: 'Status', render: (a) => <Pill status={a.status} /> },
            ]}
          />
        </Card>
        <div className="stack">
          <Card title="Collections, last 7 days">
            <RevenueBars bills={bills} />
          </Card>
          <Card title="Needs attention">
            <div className="stack" style={{ gap: 8 }}>
              {pendingLabs.length > 0 && <Attention icon={FlaskConical} text={`${pendingLabs.length} lab ${pendingLabs.length === 1 ? 'report' : 'reports'} waiting for results`} onClick={() => nav(`${base}/reports`)} />}
              {can('pharmacy') && low.length > 0 && <Attention icon={PackageX} text={`${low.length} ${low.length === 1 ? 'medicine' : 'medicines'} at or below reorder level`} onClick={() => nav(`${base}/pharmacy`)} />}
              {can('emergency') && er.filter((e) => e.status === 'waiting').length > 0 && <Attention icon={Siren} text={`${er.filter((e) => e.status === 'waiting').length} emergency patients waiting for a doctor`} onClick={() => nav(`${base}/emergency`)} />}
              {due > 0 && <Attention icon={IndianRupee} text={`${bills.filter((b) => b.paid < billTotal(b)).length} unpaid or part-paid bills (${money(due)})`} onClick={() => nav(`${base}/billing`)} />}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

function Attention({ icon: Icon, text, onClick }) {
  return (
    <button className="role-btn" onClick={onClick} style={{ padding: '9px 12px' }}>
      <Icon /> <span>{text}</span>
    </button>
  )
}

function DoctorDash() {
  const { me, list, patient, can, base } = useTenant()
  const nav = useNavigate()
  const T = today()
  const mine = list('appointments').filter((a) => a.doctorId === me.id)
  const todays = mine.filter((a) => a.date === T).sort((a, b) => a.time.localeCompare(b.time))
  const next = todays.find((a) => a.status !== 'completed' && a.status !== 'cancelled')
  const labs = list('reports').filter((r) => r.doctorId === me.id)
  const ipd = list('admissions').filter((a) => a.doctorId === me.id && a.status === 'admitted')
  const week = mine.filter((a) => a.date >= addDays(T, -6) && a.date <= T && a.status === 'completed').length

  return (
    <>
      <PageHead title={`Hello, ${me.name}`} sub={`${me.dept} · ${fmtDate(T)}`}>
        {next && <button className="btn primary" onClick={() => nav(`${base}/consult/${next.id}`)}><Clock /> Start next: {patient(next.patientId)?.name}</button>}
      </PageHead>
      <div className="grid g4">
        <Stat label="My patients today" value={todays.length} sub={`${todays.filter((a) => a.status === 'completed').length} seen`} icon={CalendarDays} />
        <Stat label="Seen this week" value={week} sub="Completed consultations" icon={Users} />
        <Stat label="Reports to review" value={labs.filter((r) => r.status === 'completed' && r.date >= addDays(T, -3)).length} sub={`${labs.filter((r) => r.status === 'ordered').length} still in lab`} icon={FlaskConical} />
        {can('ipd') ? <Stat label="My admitted patients" value={ipd.length} sub="IPD and ICU" icon={BedDouble} /> : <Stat label="Upcoming bookings" value={mine.filter((a) => a.date > T && a.status === 'scheduled').length} sub="Next 7 days" icon={CalendarDays} />}
      </div>
      <Card title="My queue today">
        <Table
          rows={todays}
          empty="No patients booked with you today."
          cols={[
            { label: 'Time', render: (a) => <span className="tabular">{fmtTime(a.time)}</span> },
            { label: 'Patient', render: (a) => <><div className="cell-main">{patient(a.patientId)?.name}</div><div className="cell-sub">{a.reason}</div></> },
            { label: 'Status', render: (a) => <Pill status={a.status} /> },
            { label: '', render: (a) => a.status === 'completed' ? <button className="btn sm" onClick={() => nav(`${base}/patients/${a.patientId}`)}>View record</button> : a.status !== 'cancelled' && <button className="btn sm primary" onClick={() => nav(`${base}/consult/${a.id}`)}>Consult</button> },
          ]}
        />
      </Card>
      {can('ipd') && ipd.length > 0 && (
        <Card title="My admitted patients" actions={<button className="btn sm" onClick={() => nav(`${base}/ipd`)}>Bed board</button>}>
          <Table rows={ipd} onRow={(a) => nav(`${base}/patients/${a.patientId}`)} cols={[
            { label: 'Patient', render: (a) => <span className="cell-main">{patient(a.patientId)?.name}</span> },
            { label: 'Bed', render: (a) => list('beds').find((b) => b.id === a.bedId)?.number },
            { label: 'Reason', key: 'reason' },
            { label: 'Since', render: (a) => fmtDate(a.admitDate) },
          ]} />
        </Card>
      )}
    </>
  )
}
