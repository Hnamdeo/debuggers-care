import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { useTenant, PageHead, Card, Table, Pill, Tabs, SearchBox, Stat } from '../components/ui'
import { NewBill } from '../components/forms'
import { InvoiceDoc } from '../components/docs'
import { fmtDate, money, billTotal, billStatus, today } from '../lib/utils'

export default function Billing() {
  const { list, patient } = useTenant()
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const [creating, setCreating] = useState(false)
  const bills = list('bills')
  const month = today().slice(0, 7)
  const monthBills = bills.filter((b) => b.date.startsWith(month))
  const bySource = ['OPD', 'Pharmacy', 'IPD'].map((s) => [s, monthBills.filter((b) => b.source === s).reduce((t, b) => t + billTotal(b), 0)]).filter(([, v]) => v)
  const rows = bills
    .filter((b) => tab === 'all' || billStatus(b) !== 'paid')
    .filter((b) => !q || `${b.id} ${patient(b.patientId)?.name}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const due = bills.filter((b) => billStatus(b) !== 'paid')

  return (
    <>
      <PageHead title="Billing" sub="OPD, procedures, lab, pharmacy and IPD invoices in one ledger">
        <SearchBox value={q} onChange={setQ} placeholder="Invoice or patient" />
        <button className="btn primary" onClick={() => setCreating(true)}><Receipt /> New bill</button>
      </PageHead>
      <div className="grid g4">
        <Stat label="Billed today" value={money(bills.filter((b) => b.date === today()).reduce((s, b) => s + billTotal(b), 0))} sub={`${bills.filter((b) => b.date === today()).length} invoices`} />
        <Stat label="Billed this month" value={money(monthBills.reduce((s, b) => s + billTotal(b), 0))} sub={bySource.map(([s, v]) => `${s} ${money(v)}`).join(' · ')} />
        <Stat label="Collected this month" value={money(monthBills.reduce((s, b) => s + Math.min(b.paid, billTotal(b)), 0))} />
        <Stat label="Outstanding" value={money(due.reduce((s, b) => s + billTotal(b) - b.paid, 0))} sub={`${due.length} invoices`} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All invoices', count: bills.length }, { id: 'due', label: 'Unpaid', count: due.length }]} />
      <Card>
        <Table rows={rows.slice(0, 150)} onRow={(b) => setOpen(b.id)} cols={[
          { label: 'Invoice', render: (b) => <><div className="cell-main">{b.id}</div><div className="cell-sub">{fmtDate(b.date)}</div></> },
          { label: 'Patient', render: (b) => patient(b.patientId)?.name },
          { label: 'Type', render: (b) => <span className="pill plain">{b.source}</span> },
          { label: 'Items', render: (b) => <span className="small">{b.items.map((i) => i.desc).join(', ')}</span> },
          { label: 'Amount', num: true, render: (b) => money(billTotal(b)) },
          { label: 'Status', render: (b) => <Pill status={billStatus(b)} /> },
        ]} />
      </Card>
      {open && <InvoiceDoc bill={bills.find((b) => b.id === open)} canCollect onClose={() => setOpen(null)} />}
      {creating && <NewBill onClose={(b) => { setCreating(false); if (b) setOpen(b.id) }} />}
    </>
  )
}
