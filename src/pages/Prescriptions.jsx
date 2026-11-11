import { useState } from 'react'
import { useTenant, PageHead, Card, Table, Pill, SearchBox, Tabs } from '../components/ui'
import { PrescriptionDoc } from '../components/docs'
import { fmtDate } from '../lib/utils'

export default function Prescriptions() {
  const { list, patient, staff, user, me, can } = useTenant()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('all')
  const [open, setOpen] = useState(null)
  const isDoc = user.role === 'doctor'
  let rows = list('prescriptions').filter((r) => !isDoc || r.doctorId === me.id)
  const pending = rows.filter((r) => !r.dispensed)
  if (tab === 'pending') rows = pending
  rows = rows
    .filter((r) => !q || `${patient(r.patientId)?.name} ${r.diagnosis} ${r.id}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

  return (
    <>
      <PageHead title={isDoc ? 'My prescriptions' : 'Prescriptions'} sub="Every prescription is saved to the patient’s record">
        <SearchBox value={q} onChange={setQ} placeholder="Patient, diagnosis or Rx no." />
      </PageHead>
      {can('pharmacy') && <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All' }, { id: 'pending', label: 'Not yet dispensed', count: pending.length }]} />}
      <Card>
        <Table
          rows={rows.slice(0, 150)}
          onRow={(r) => setOpen(r)}
          cols={[
            { label: 'Rx no.', render: (r) => <><div className="cell-main">{r.id}</div><div className="cell-sub">{fmtDate(r.date)}</div></> },
            { label: 'Patient', render: (r) => patient(r.patientId)?.name },
            ...(isDoc ? [] : [{ label: 'Doctor', render: (r) => staff(r.doctorId)?.name }]),
            { label: 'Diagnosis', key: 'diagnosis' },
            { label: 'Medicines', render: (r) => <span className="small">{r.items.map((i) => i.name).join(', ')}</span> },
            ...(can('pharmacy') ? [{ label: 'Pharmacy', render: (r) => <Pill status={r.dispensed ? 'dispensed' : 'pending'} /> }] : []),
          ]}
        />
      </Card>
      {open && <PrescriptionDoc rx={open} onClose={() => setOpen(null)} />}
    </>
  )
}
