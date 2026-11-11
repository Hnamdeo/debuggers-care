import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { QrCode, UserPlus, CalendarPlus, BedDouble, Receipt, Pencil, ArrowLeft, AlertTriangle } from 'lucide-react'
import { useTenant, PageHead, Card, Table, Pill, SearchBox, Avatar, Tabs, Stat } from '../components/ui'
import RegisterQR from '../components/RegisterQR'
import { PatientForm, BookAppointment, NewBill, AdmitForm } from '../components/forms'
import { PrescriptionDoc, ReportDoc, InvoiceDoc } from '../components/docs'
import { VideoPlayer, whatsappLink } from '../components/videos'
import { fmtDate, fmtTime, age, money, billTotal, billStatus } from '../lib/utils'

export default function Patients() {
  const { list, base } = useTenant()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [qr, setQr] = useState(false)
  const creating = params.get('new') === '1'
  const appts = list('appointments')
  const lastVisit = (pid) => appts.filter((a) => a.patientId === pid && a.status === 'completed').map((a) => a.date).sort().pop()
  const rows = list('patients')
    .filter((p) => !q || `${p.name} ${p.phone} ${p.id}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.regDate.localeCompare(a.regDate))

  return (
    <>
      <PageHead title="Patients" sub={`${list('patients').length} registered`}>
        <SearchBox value={q} onChange={setQ} placeholder="Name, mobile or UHID" />
        <button className="btn" onClick={() => setQr(true)}><QrCode /> QR / link for patients</button>
        <button className="btn primary" onClick={() => setParams({ new: '1' })}><UserPlus /> Register patient</button>
      </PageHead>
      <Card>
        <Table
          rows={rows}
          onRow={(p) => nav(`${base}/patients/${p.id}`)}
          empty="No patient matches that search."
          cols={[
            { label: 'Patient', render: (p) => <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar name={p.name} /><div><div className="cell-main">{p.name}</div><div className="cell-sub">{p.id}{p.selfRegistered ? ' · self-registered' : ''}</div></div></div> },
            { label: 'Age / Sex', render: (p) => `${age(p.dob)} y · ${p.gender}` },
            { label: 'Mobile', render: (p) => <span className="tabular">{p.phone}</span> },
            { label: 'Blood', key: 'blood' },
            { label: 'Last visit', render: (p) => fmtDate(lastVisit(p.id)) },
            { label: 'Registered', render: (p) => fmtDate(p.regDate) },
          ]}
        />
      </Card>
      {qr && <RegisterQR onClose={() => setQr(false)} />}
      {creating && <PatientForm onClose={() => setParams({})} onSaved={(p) => nav(`${base}/patients/${p.id}`)} />}
    </>
  )
}

export function PatientProfile() {
  const { id } = useParams()
  const { patient, user, can, base } = useTenant()
  const nav = useNavigate()
  const p = patient(id)
  const [modal, setModal] = useState(null)
  if (!p) return <div className="empty">Patient not found.</div>
  const staffView = user.role !== 'patient'
  return (
    <>
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => nav(`${base}/patients`)}><ArrowLeft /> Patients</button>
      <PatientHeader p={p}>
        <button className="btn" onClick={() => setModal('edit')}><Pencil /> Edit</button>
        <button className="btn primary" onClick={() => setModal('book')}><CalendarPlus /> Book</button>
        {can('ipd') && <button className="btn" onClick={() => setModal('admit')}><BedDouble /> Admit</button>}
        {user.role === 'admin' && <button className="btn" onClick={() => setModal('bill')}><Receipt /> New bill</button>}
      </PatientHeader>
      <PatientRecord p={p} canCollect={staffView && user.role === 'admin'} />
      {modal === 'edit' && <PatientForm initial={p} onClose={() => setModal(null)} />}
      {modal === 'book' && <BookAppointment patientId={p.id} onClose={() => setModal(null)} />}
      {modal === 'admit' && <AdmitForm patientId={p.id} onClose={() => setModal(null)} />}
      {modal === 'bill' && <NewBill patientId={p.id} onClose={() => setModal(null)} />}
    </>
  )
}

export function PatientHeader({ p, children }) {
  return (
    <div className="card pad">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 14, flexWrap: 'nowrap', minWidth: 0 }}>
          <Avatar name={p.name} lg />
          <div className="stack" style={{ gap: 6, minWidth: 0 }}>
            <div>
              <h1 style={{ fontSize: '1.35rem' }}>{p.name}</h1>
              <div className="muted small">UHID {p.id} · {age(p.dob)} years · {p.gender === 'F' ? 'Female' : p.gender === 'M' ? 'Male' : 'Other'} · Blood {p.blood}</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              {p.allergies && <span className="pill bad"><AlertTriangle size={11} /> Allergy: {p.allergies}</span>}
              {p.conditions && <span className="pill warn">{p.conditions}</span>}
              <span className="pill plain">{p.phone}</span>
            </div>
          </div>
        </div>
        {children && <div className="row">{children}</div>}
      </div>
    </div>
  )
}

// Full health record: used by staff (patient profile) and by the patient portal.
export function PatientRecord({ p, canCollect }) {
  const { list, staff, user } = useTenant()
  const [tab, setTab] = useState('overview')
  const [doc, setDoc] = useState(null)
  const [play, setPlay] = useState(null)
  const mine = (c) => list(c).filter((r) => r.patientId === p.id)
  const appts = mine('appointments').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  const rxs = mine('prescriptions').sort((a, b) => b.date.localeCompare(a.date))
  const reps = mine('reports').sort((a, b) => b.date.localeCompare(a.date))
  const bills = mine('bills').sort((a, b) => b.date.localeCompare(a.date))
  const adms = mine('admissions').sort((a, b) => b.admitDate.localeCompare(a.admitDate))
  const billed = bills.reduce((s, b) => s + billTotal(b), 0)
  const due = bills.reduce((s, b) => s + Math.max(0, billTotal(b) - b.paid), 0)
  const beds = list('beds')
  const vids = list('videos')
  const shared = mine('shares').sort((a, b) => b.date.localeCompare(a.date)).map((sh) => ({ ...sh, v: vids.find((v) => v.id === sh.videoId) })).filter((x) => x.v)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'appointments', label: 'Visits', count: appts.length },
    { id: 'prescriptions', label: 'Prescriptions', count: rxs.length },
    { id: 'reports', label: 'Reports', count: reps.length },
    { id: 'bills', label: 'Bills', count: bills.length },
    ...(adms.length ? [{ id: 'admissions', label: 'Admissions', count: adms.length }] : []),
    ...(shared.length ? [{ id: 'videos', label: 'Videos', count: shared.length }] : []),
  ]

  const rxCols = [
    { label: 'Date', render: (r) => fmtDate(r.date) },
    { label: 'Diagnosis', render: (r) => <span className="cell-main">{r.diagnosis}</span> },
    { label: 'Doctor', render: (r) => staff(r.doctorId)?.name },
    { label: 'Medicines', render: (r) => r.items.map((i) => i.name).join(', ') },
  ]
  const repCols = [
    { label: 'Date', render: (r) => fmtDate(r.date) },
    { label: 'Test', render: (r) => <span className="cell-main">{r.test}</span> },
    { label: 'Type', key: 'category' },
    { label: 'Status', render: (r) => <Pill status={r.status === 'completed' ? (r.results.some((x) => x.flag) ? 'red' : 'ok') : 'ordered'}>{r.status === 'completed' ? (r.results.some((x) => x.flag) ? 'Abnormal' : 'Ready') : 'In lab'}</Pill> },
  ]
  const billCols = [
    { label: 'Invoice', render: (b) => <><div className="cell-main">{b.id}</div><div className="cell-sub">{fmtDate(b.date)} · {b.source}</div></> },
    { label: 'Items', render: (b) => <span className="small">{b.items.map((i) => i.desc).join(', ')}</span> },
    { label: 'Amount', num: true, render: (b) => money(billTotal(b)) },
    { label: 'Status', render: (b) => <Pill status={billStatus(b)} /> },
  ]

  return (
    <>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'overview' && (
        <div className="stack">
          <div className="grid g4">
            <Stat label="Visits" value={appts.filter((a) => a.status === 'completed').length} sub={`Next: ${(() => { const n = appts.filter((a) => a.status === 'scheduled').pop(); return n ? `${fmtDate(n.date)}, ${fmtTime(n.time)}` : 'none booked' })()}`} />
            <Stat label="Prescriptions" value={rxs.length} sub={rxs[0] ? `Latest ${fmtDate(rxs[0].date)}` : 'None yet'} />
            <Stat label="Reports" value={reps.length} sub={`${reps.filter((r) => r.status === 'ordered').length} pending`} />
            <Stat label="Total billed" value={money(billed)} sub={due ? `${money(due)} due` : 'Fully paid'} />
          </div>
          <div className="grid g2">
            <Card title="Details">
              <dl className="kv">
                <dt>Mobile</dt><dd>{p.phone}</dd>
                <dt>Email</dt><dd>{p.email || '-'}</dd>
                <dt>Date of birth</dt><dd>{fmtDate(p.dob)}</dd>
                <dt>Address</dt><dd>{p.address || '-'}</dd>
                <dt>Emergency contact</dt><dd>{p.emergencyContact || '-'}</dd>
                <dt>Registered</dt><dd>{fmtDate(p.regDate)}</dd>
              </dl>
            </Card>
            <Card title="Recent activity">
              <div className="timeline">
                {[
                  ...appts.slice(0, 4).map((a) => ({ d: a.date, t: `${a.status === 'scheduled' ? 'Booked' : 'Visit'} with ${staff(a.doctorId)?.name}`, s: a.reason, k: a.id })),
                  ...reps.slice(0, 2).map((r) => ({ d: r.date, t: r.test, s: r.status === 'completed' ? 'Report ready' : 'Sample in lab', k: r.id })),
                  ...adms.slice(0, 2).map((a) => ({ d: a.admitDate, t: `Admitted · ${beds.find((b) => b.id === a.bedId)?.number}`, s: a.reason, k: a.id })),
                ].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 6).map((e) => (
                  <div key={e.k} className="tl-item"><span className="small muted tabular">{fmtDate(e.d)}</span><div><div style={{ fontWeight: 600 }}>{e.t}</div><div className="small muted">{e.s}</div></div></div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
      {tab === 'appointments' && (
        <Card><Table rows={appts} cols={[
          { label: 'Date', render: (a) => <><div className="cell-main">{fmtDate(a.date)}</div><div className="cell-sub">{fmtTime(a.time)}</div></> },
          { label: 'Doctor', render: (a) => staff(a.doctorId)?.name },
          { label: 'Reason', key: 'reason' },
          { label: 'Status', render: (a) => <Pill status={a.status} /> },
        ]} /></Card>
      )}
      {tab === 'prescriptions' && <Card><Table rows={rxs} cols={rxCols} onRow={(r) => setDoc({ k: 'rx', v: r })} /></Card>}
      {tab === 'reports' && <Card><Table rows={reps} cols={repCols} onRow={(r) => setDoc({ k: 'rep', v: r })} /></Card>}
      {tab === 'bills' && <Card><Table rows={bills} cols={billCols} onRow={(b) => setDoc({ k: 'bill', v: b })} /></Card>}
      {tab === 'admissions' && (
        <Card><Table rows={adms} cols={[
          { label: 'Admitted', render: (a) => fmtDate(a.admitDate) },
          { label: 'Bed', render: (a) => { const b = beds.find((x) => x.id === a.bedId); return `${b?.number} · ${b?.ward}` } },
          { label: 'Reason', key: 'reason' },
          { label: 'Consultant', render: (a) => staff(a.doctorId)?.name },
          { label: 'Status', render: (a) => <Pill status={a.status} /> },
        ]} /></Card>
      )}
      {tab === 'videos' && (
        <Card title="Videos from your doctor">
          {shared.map((x) => (
            <div key={x.id} className="vid-row">
              <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontWeight: 600 }}>{x.v.title}</div><div className="small muted">Shared by {staff(x.doctorId)?.name || 'your doctor'} on {fmtDate(x.date)}</div></div>
              <button className="btn sm primary" onClick={() => setPlay(x.v)}>Watch</button>
              {user.role !== 'patient' && <a className="btn sm" href={whatsappLink(p.phone, `Hello ${p.name.split(' ')[0]}, here is the video your doctor shared: ${x.v.title} ${x.v.url}`)} target="_blank" rel="noreferrer">Send on WhatsApp</a>}
            </div>
          ))}
        </Card>
      )}
      {play && <VideoPlayer video={play} onClose={() => setPlay(null)} />}
      {doc?.k === 'rx' && <PrescriptionDoc rx={doc.v} onClose={() => setDoc(null)} />}
      {doc?.k === 'rep' && <ReportDoc rep={doc.v} onClose={() => setDoc(null)} />}
      {doc?.k === 'bill' && <InvoiceDoc bill={list('bills').find((b) => b.id === doc.v.id)} canCollect={canCollect} onClose={() => setDoc(null)} />}
    </>
  )
}
