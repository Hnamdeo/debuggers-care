// Practice analytics: how the clinic is doing over a chosen period, and a report to download.
import { useState } from 'react'
import { CalendarDays, FileHeart, UserPlus, IndianRupee, CheckCircle2, UserX, Download, Printer } from 'lucide-react'
import { useTenant, PageHead, Card, Stat } from '../components/ui'
import { AiReadingLine } from '../components/toothscan'
import { today, addDays, fmtDate, money, billTotal } from '../lib/utils'

const RANGES = [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['month', 'This month'], ['90', 'Last 3 months']]

function csv(rows) {
  return rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}
function download(name, text) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

// One bar per day; hover shows the day's numbers.
function DayBars({ days }) {
  const max = Math.max(1, ...days.map((d) => d.n))
  return (
    <div className="an-bars" role="img" aria-label="Appointments per day">
      {days.map((d) => (
        <div key={d.date} className="an-bar" tabIndex={0}>
          <span className="an-fill" style={{ height: `${(d.n / max) * 100}%` }} />
          <span className="an-tip"><b>{fmtDate(d.date)}</b>{d.n} appointments · {d.done} seen</span>
        </div>
      ))}
    </div>
  )
}

function HBars({ rows, fmt = (v) => v }) {
  const max = Math.max(1, ...rows.map((r) => r[1]))
  if (!rows.length) return <div className="muted small">Nothing in this period yet.</div>
  return (
    <div className="an-h">
      {rows.map(([label, v]) => (
        <div key={label} className="an-hrow">
          <span className="an-hl">{label}</span>
          <span className="an-ht"><i style={{ width: `${(v / max) * 100}%` }} /></span>
          <span className="an-hv tabular">{fmt(v)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { list, doctors, patient, staff, tenant } = useTenant()
  const [range, setRange] = useState('30')
  const T = today()
  const from = range === 'month' ? `${T.slice(0, 7)}-01` : addDays(T, -(+range - 1))
  const inR = (d) => d && d >= from && d <= T

  const appts = list('appointments').filter((a) => inR(a.date))
  const rx = list('prescriptions').filter((r) => inR(r.date))
  const bills = list('bills').filter((b) => inR(b.date))
  const newPts = list('patients').filter((p) => inR(p.regDate))
  const done = appts.filter((a) => a.status === 'completed')
  const noShow = appts.filter((a) => a.status === 'no-show')
  const collected = bills.reduce((s, b) => s + Math.min(b.paid || 0, billTotal(b)), 0)
  const billed = bills.reduce((s, b) => s + billTotal(b), 0)

  const days = []
  for (let d = from; d <= T; d = addDays(d, 1)) {
    const a = appts.filter((x) => x.date === d)
    days.push({ date: d, n: a.length, done: a.filter((x) => x.status === 'completed').length })
  }

  const apptById = Object.fromEntries(list('appointments').map((a) => [a.id, a]))
  const docRows = doctors().map((d) => {
    const mine = bills.filter((b) => apptById[b.ref]?.doctorId === d.id)
    return {
      d,
      seen: done.filter((a) => a.doctorId === d.id).length,
      rx: rx.filter((r) => r.doctorId === d.id).length,
      revenue: mine.reduce((s, b) => s + billTotal(b), 0),
    }
  }).sort((a, b) => b.seen - a.seen)

  const treat = {}
  bills.forEach((b) => b.items.forEach((i) => { if (!/^Consultation/i.test(i.desc)) treat[i.desc] = (treat[i.desc] || 0) + (i.qty || 1) * (i.rate || 0) }))
  const topTreat = Object.entries(treat).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const areas = {}
  newPts.concat(done.map((a) => patient(a.patientId)).filter(Boolean)).forEach((p) => {
    const k = (p.address || '').split(',').pop().trim()
    if (k) areas[k] = (areas[k] || 0) + 1
  })
  const topAreas = Object.entries(areas).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const label = RANGES.find((r) => r[0] === range)[1]
  const exportAppts = () => download(`appointments-${from}-to-${T}.csv`, csv([
    ['Date', 'Time', 'Patient', 'Mobile', 'Doctor', 'Reason', 'Status'],
    ...appts.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((a) => [a.date, a.time, patient(a.patientId)?.name, patient(a.patientId)?.phone, staff(a.doctorId)?.name, a.reason, a.status]),
  ]))
  const exportBills = () => download(`bills-${from}-to-${T}.csv`, csv([
    ['Invoice', 'Date', 'Patient', 'Items', 'Total', 'Paid', 'Mode'],
    ...bills.map((b) => [b.id, b.date, patient(b.patientId)?.name, b.items.map((i) => i.desc).join('; '), billTotal(b), Math.min(b.paid || 0, billTotal(b)), b.mode]),
  ]))

  return (
    <>
      <PageHead title="Practice analytics" sub={`${tenant.name} · ${fmtDate(from)} to ${fmtDate(T)}`}>
        <span className="seg" role="radiogroup" aria-label="Period">
          {RANGES.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={range === v} className={range === v ? 'on' : ''} onClick={() => setRange(v)}>{l}</button>)}
        </span>
      </PageHead>
      <AiReadingLine key={range} steps={['is collecting visits, bills and prescriptions', 'is arranging the numbers by day and treatment', 'is doing the analysis']}
        done="has arranged your practice numbers. Analysis ready" />
      <div className="grid g3">
        <Stat label="Appointments" value={appts.length} sub={`${done.length} seen · ${appts.filter((a) => a.status === 'scheduled').length} upcoming`} icon={CalendarDays} />
        <Stat label="Prescriptions written" value={rx.length} sub={label} icon={FileHeart} />
        <Stat label="New patients" value={newPts.length} sub={label} icon={UserPlus} />
        <Stat label="Collected" value={money(collected)} sub={`${money(billed - collected)} still due`} icon={IndianRupee} />
        <Stat label="Visits completed" value={done.length} sub={appts.length ? `${Math.round((done.length / appts.length) * 100)}% of bookings` : '–'} icon={CheckCircle2} />
        <Stat label="Didn’t come" value={noShow.length} sub={appts.length ? `${Math.round((noShow.length / appts.length) * 100)}% of bookings` : '–'} icon={UserX} />
      </div>
      <Card title="Appointments per day" actions={<span className="small muted">Hover a bar for the day</span>}>
        <DayBars days={days} />
        <div className="an-axis small muted"><span>{fmtDate(from)}</span><span>{fmtDate(T)}</span></div>
      </Card>
      <Card title="Doctor activity">
        <div className="an-docs">
          {docRows.map(({ d, seen, rx: n, revenue }) => (
            <div key={d.id} className="an-doc">
              <span className="avatar">{d.name.replace(/^Dr\.?\s*/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
              <div><strong>{d.name}</strong><div className="small muted">{d.dept || d.title || 'Doctor'}</div></div>
              <div className="an-dn"><b className="tabular">{seen}</b><span className="small muted">seen</span></div>
              <div className="an-dn"><b className="tabular">{n}</b><span className="small muted">Rx</span></div>
              <div className="an-dn"><b className="tabular">{money(revenue)}</b><span className="small muted">billed</span></div>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid g2">
        <Card title="Top treatments by billing"><HBars rows={topTreat} fmt={money} /></Card>
        <Card title="Where patients come from"><HBars rows={topAreas} /></Card>
      </div>
      <Card title="Download reports">
        <div className="row">
          <button className="btn" onClick={exportAppts}><Download /> Appointments ({appts.length})</button>
          <button className="btn" onClick={exportBills}><Download /> Bills ({bills.length})</button>
          <button className="btn ghost" onClick={() => window.print()}><Printer /> Print this page</button>
          <span className="small muted">Files open in Excel or Google Sheets.</span>
        </div>
      </Card>
    </>
  )
}
