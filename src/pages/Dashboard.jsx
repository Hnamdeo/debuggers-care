import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { CalendarDays, Users, IndianRupee, BedDouble, Siren, PackageX, FlaskConical, Clock, QrCode, Receipt, UserPlus, Stethoscope, Sparkles } from 'lucide-react'
import { NotesCard } from '../components/notes'
import { DentalScanCard } from '../components/toothscan'
import { InsightsCard } from '../components/insights'
import RegisterQR from '../components/RegisterQR'
import { TodayTimings } from './Appointments'
import { ReminderCard } from '../components/reminders'
import { TodayVisits, sendToDoctor } from '../components/visits'
import { PatientFinder } from '../components/summary'
import { AskBar, callName } from '../components/assistant'
import { useTenant, PageHead, Stat, Card, Table, Pill } from '../components/ui'
import { today, addDays, fmtTime, money, billTotal, fmtDate } from '../lib/utils'

export default function Dashboard() {
  const t = useTenant()
  return t.user.role === 'doctor' ? <DoctorDash /> : <AdminDash />
}

const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

// Gradient welcome banner with big, plain-language action tiles: the first thing a
// non-technical doctor or receptionist needs, one tap away.
function IstClock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000 * 15); return () => clearInterval(i) }, [])
  return <span className="hb-chip mono">{t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST</span>
}

function Hero({ title, sub, actions }) {
  const { tenant } = useTenant()
  return (
    <>
      <section className="hero-bar">
        <div className="hb-text">
          <h1>{title}</h1>
          <p>{sub}</p>
        </div>
        <div className="hb-chips">
          <span className="hb-chip"><i className="hb-dot" /> {tenant.server ? 'Server online' : 'Saved on this computer'}</span>
          <span className="hb-chip">✦ AI ready</span>
          <IstClock />
        </div>
      </section>
      <div className={`qa-row ${actions.filter(Boolean).length === 6 ? 'six' : ''}`}>
        {actions.filter(Boolean).map((a) => (
          <div key={a.toggle ? 'toggle' : a.label} role="button" tabIndex={0} className={`qa ${a.main ? 'hot' : ''}`} onClick={a.onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.onClick() } }}>
            <span className="qa-icon"><a.icon /></span>
            <span className="qa-t"><b>{a.label}</b>{a.hint && <small>{a.hint}</small>}</span>
            {a.toggle && (
              <span className="qa-seg" role="radiogroup" aria-label="Period" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                {a.toggle.options.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={a.toggle.value === v} className={a.toggle.value === v ? 'on' : ''} onClick={() => a.toggle.onChange(v)}>{l}</button>)}
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  )
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
  const [qr, setQr] = useState(false)
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
      <Hero title={`${greet()}, ${callName(me, 'staff')} 👋`} sub={`${tenant.name} · ${fmtDate(T)}`} actions={[
        { icon: CalendarDays, label: 'Book appointment', hint: `${todays.filter((a) => a.status === 'scheduled').length} waiting today`, onClick: () => nav(`${base}/appointments?new=1`), main: true },
        { icon: UserPlus, label: 'Register patient', hint: 'Front desk form', onClick: () => nav(`${base}/patients?new=1`) },
        { icon: QrCode, label: 'Patient QR', hint: 'Patients self-register', onClick: () => setQr(true) },
        can('billing') && { icon: Receipt, label: 'New bill', hint: `${money(due)} due`, onClick: () => nav(`${base}/billing`) },
        can('ipd') && { icon: BedDouble, label: 'Admit patient', hint: `${beds.length - occupied.length} beds free`, onClick: () => nav(`${base}/ipd`) },
      ]} />
      <AskBar />
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
      <TodayTimings />
      <InsightsCard />
      <NotesCard />
      <ReminderCard />
      <PatientFinder />
      <TodayVisits />
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
      {qr && <RegisterQR onClose={() => setQr(false)} />}
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
  const { me, list, patient, can, base, tid, tenant, doctors, staff } = useTenant()
  // A small clinic's doctors share one login, so the queue covers all of them there.
  const shared = tenant.live && doctors().length > 1
  const nav = useNavigate()
  const [qr, setQr] = useState(false)
  const T = today()
  const mine = list('appointments').filter((a) => (shared ? true : a.doctorId === me.id))
  const todays = mine.filter((a) => a.date === T).sort((a, b) => a.time.localeCompare(b.time))
  const next = todays.find((a) => a.status !== 'completed' && a.status !== 'cancelled')
  const waitingVisit = list('visits').filter((v) => v.date === T && v.status === 'waiting').sort((a, b) => (a.time || '').localeCompare(b.time || ''))[0]
  const labs = list('reports').filter((r) => r.doctorId === me.id)
  const ipd = list('admissions').filter((a) => a.doctorId === me.id && a.status === 'admitted')
  const week = mine.filter((a) => a.date >= addDays(T, -6) && a.date <= T && a.status === 'completed').length
  const seenToday = todays.filter((a) => a.status === 'completed').length
  const [seenRange, setSeenRange] = useState('today')

  return (
    <>
      <Hero title={`${greet()}, ${callName(me, 'doctor')} 👋`} sub={`${me.dept} · ${fmtDate(T)}`} actions={[
        next ? { icon: Stethoscope, label: `Start: ${patient(next.patientId)?.name}`, hint: `${fmtTime(next.time)} · ${next.reason}`, onClick: () => nav(`${base}/consult/${next.id}`), main: true }
          : waitingVisit ? { icon: Stethoscope, label: `Start: ${patient(waitingVisit.patientId)?.name}`, hint: `Walk-in · ${waitingVisit.complaint || 'waiting'}`, onClick: () => nav(`${base}/consult/${sendToDoctor(tid, list, waitingVisit, me.id)}`), main: true }
          : { icon: Stethoscope, label: 'No one waiting', hint: 'Queue is clear', onClick: () => nav(`${base}/appointments`), main: true },
        { icon: CalendarDays, label: 'My appointments', hint: `${todays.length} today`, onClick: () => nav(`${base}/appointments`) },
        { icon: FlaskConical, label: 'Lab reports', hint: `${labs.filter((r) => r.status === 'ordered').length} in lab`, onClick: () => nav(`${base}/reports`) },
        { icon: UserPlus, label: 'Register patient', hint: 'Quick chat registration', onClick: () => nav(`${base}/register`) },
        { icon: Users, label: 'Seen', hint: seenRange === 'today' ? `${seenToday} today` : `${week} in 7 days`, onClick: () => nav(`${base}/appointments?view=list`),
          toggle: { value: seenRange, onChange: setSeenRange, options: [['today', 'Today'], ['week', 'Week']] } },
        { icon: CalendarDays, label: 'My patients today', hint: `${todays.length} booked · ${todays.filter((a) => a.status === 'completed').length} seen`, onClick: () => nav(`${base}/appointments?view=calendar`) },
      ]} />
      <AskBar />
      <div className="grid g4">
        <Stat label="My patients today" value={todays.length} sub={`${todays.filter((a) => a.status === 'completed').length} seen`} icon={CalendarDays} />
        <Stat label="Seen this week" value={week} sub="Completed consultations" icon={Users} />
        <Stat label="Reports to review" value={labs.filter((r) => r.status === 'completed' && r.date >= addDays(T, -3)).length} sub={`${labs.filter((r) => r.status === 'ordered').length} still in lab`} icon={FlaskConical} />
        {can('ipd') ? <Stat label="My admitted patients" value={ipd.length} sub="IPD and ICU" icon={BedDouble} /> : <Stat label="Upcoming bookings" value={mine.filter((a) => a.date > T && a.status === 'scheduled').length} sub="Next 7 days" icon={CalendarDays} />}
      </div>
      <DentalScanCard tenant={tenant} onSmile={() => nav(`${base}/smile`)} onXray={() => nav(`${base}/patients`)} />
      <InsightsCard doctorId={shared ? undefined : me.id} />
      <NotesCard />
      <TodayTimings doctorId={shared ? undefined : me.id} />
      <ReminderCard doctorId={shared ? undefined : me.id} />
      <PatientFinder />
      <TodayVisits />
      <Card title={shared ? "Today’s queue" : "My queue today"}>
        <Table
          rows={todays}
          empty="No patients booked with you today."
          cols={[
            { label: 'Time', render: (a) => <span className="tabular">{fmtTime(a.time)}</span> },
            { label: 'Patient', render: (a) => <><div className="cell-main">{patient(a.patientId)?.name}</div><div className="cell-sub">{a.reason}</div></> },
            ...(shared ? [{ label: 'Doctor', render: (a) => staff(a.doctorId)?.name }] : []),
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
      {qr && <RegisterQR onClose={() => setQr(false)} />}
    </>
  )
}
