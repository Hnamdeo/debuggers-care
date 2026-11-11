import { useState } from 'react'
import { Play, CheckCheck } from 'lucide-react'
import { useTenant, PageHead, Card, Table, Pill, Stat, Select, toast } from '../components/ui'
import { PayslipDoc } from '../components/docs'
import { db } from '../lib/store'
import { money, fmtMonth, payslip, today } from '../lib/utils'

export default function Payroll() {
  const { tid, list, staff } = useTenant()
  const all = list('payroll')
  const thisMonth = today().slice(0, 7)
  const months = [...new Set([thisMonth, ...all.map((p) => p.month)])].sort().reverse()
  const [month, setMonth] = useState(thisMonth)
  const [slip, setSlip] = useState(null)
  const rows = all.filter((p) => p.month === month)
  const people = list('staff').filter((s) => s.salary > 0)
  const run = () => {
    people.forEach((s) => {
      if (rows.some((r) => r.staffId === s.id)) return
      db.add(tid, 'payroll', { month, staffId: s.id, ...payslip(s.salary, s.role === 'doctor' ? 5000 : 1500), status: 'processed' })
    })
    toast(`Payroll for ${fmtMonth(month)} processed for ${people.length} staff`)
  }
  const payAll = () => {
    rows.filter((r) => r.status !== 'paid').forEach((r) => db.update(tid, 'payroll', r.id, { status: 'paid', paidOn: today() }))
    toast('Salaries marked as paid')
  }
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0)

  return (
    <>
      <PageHead title="Payroll" sub="Monthly salaries with HRA, PF, professional tax and TDS">
        <Select id="pr-month" value={month} onChange={(e) => setMonth(e.target.value)} options={months.map((m) => ({ value: m, label: fmtMonth(m) }))} style={{ width: 150 }} />
        {rows.length < people.length && <button className="btn primary" onClick={run}><Play /> Run payroll for {fmtMonth(month)}</button>}
        {rows.length > 0 && rows.some((r) => r.status !== 'paid') && <button className="btn" onClick={payAll}><CheckCheck /> Mark all paid</button>}
      </PageHead>
      <div className="grid g4">
        <Stat label="Staff on payroll" value={rows.length || people.length} sub={rows.length ? fmtMonth(month) : 'Not processed yet'} />
        <Stat label="Gross" value={money(sum('gross'))} />
        <Stat label="Deductions" value={money(sum('pf') + sum('pt') + sum('tds'))} sub={`PF ${money(sum('pf'))} · TDS ${money(sum('tds'))}`} />
        <Stat label="Net payout" value={money(sum('net'))} />
      </div>
      <Card>
        <Table rows={rows} onRow={(r) => setSlip(r)} empty={`Payroll for ${fmtMonth(month)} has not been run yet. Click Run payroll to calculate it for every staff member.`} cols={[
          { label: 'Employee', render: (r) => <><div className="cell-main">{staff(r.staffId)?.name}</div><div className="cell-sub">{staff(r.staffId)?.title}</div></> },
          { label: 'Basic', num: true, render: (r) => money(r.basic) },
          { label: 'HRA', num: true, render: (r) => money(r.hra) },
          { label: 'Gross', num: true, render: (r) => money(r.gross) },
          { label: 'Deductions', num: true, render: (r) => money(r.pf + r.pt + r.tds) },
          { label: 'Net pay', num: true, render: (r) => <strong>{money(r.net)}</strong> },
          { label: 'Status', render: (r) => <Pill status={r.status} /> },
        ]} />
      </Card>
      {slip && <PayslipDoc slip={all.find((p) => p.id === slip.id)} onClose={() => setSlip(null)} />}
    </>
  )
}
