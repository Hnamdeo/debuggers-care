import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useTenant, PageHead, Card, Table, Avatar, Modal, Input, Select, Tabs, toast } from '../components/ui'
import { db } from '../lib/store'
import { PLANS } from '../lib/plans'
import { fmtDate, money, today } from '../lib/utils'

const ROLES = { doctor: 'Doctor', nurse: 'Nurse', pharmacist: 'Pharmacist', lab: 'Lab technician', receptionist: 'Receptionist', admin: 'Admin' }

export default function Staff() {
  const { list, tenant } = useTenant()
  const [tab, setTab] = useState('all')
  const [add, setAdd] = useState(false)
  const staff = list('staff')
  const rows = staff.filter((s) => tab === 'all' || s.role === tab)
  const docCount = staff.filter((s) => s.role === 'doctor').length
  const max = PLANS[tenant.plan].maxDoctors
  return (
    <>
      <PageHead title="Staff" sub={`${staff.length} people · ${docCount} doctors${max !== Infinity ? ` (plan allows ${max})` : ''}`}>
        <button className="btn primary" onClick={() => setAdd(true)}><UserPlus /> Add staff</button>
      </PageHead>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'Everyone', count: staff.length }, ...Object.entries(ROLES).filter(([r]) => staff.some((s) => s.role === r)).map(([id, label]) => ({ id, label, count: staff.filter((s) => s.role === id).length }))]} />
      <Card>
        <Table rows={rows} cols={[
          { label: 'Name', render: (s) => <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar name={s.name} /><div><div className="cell-main">{s.name}</div><div className="cell-sub">{s.id} · {s.email}</div></div></div> },
          { label: 'Role', render: (s) => ROLES[s.role] },
          { label: 'Department', render: (s) => <><div>{s.dept}</div>{s.qualification && <div className="cell-sub">{s.qualification}</div>}</> },
          { label: 'Fee', num: true, render: (s) => (s.fee ? money(s.fee) : '-') },
          { label: 'Monthly basic', num: true, render: (s) => money(s.salary) },
          { label: 'Joined', render: (s) => fmtDate(s.joinDate) },
        ]} />
      </Card>
      {add && <AddStaff onClose={() => setAdd(false)} atLimit={docCount >= max} />}
    </>
  )
}

function AddStaff({ onClose, atLimit }) {
  const { tid, tenant } = useTenant()
  const [f, setF] = useState({ name: '', role: 'nurse', dept: '', qualification: '', phone: '', email: '', salary: 30000, fee: 600 })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const blocked = f.role === 'doctor' && atLimit
  const save = () => {
    if (!f.name.trim() || blocked) return
    const s = db.add(tid, 'staff', { ...f, salary: +f.salary, fee: f.role === 'doctor' ? +f.fee : undefined, title: f.dept, joinDate: today(), gender: 'F' })
    if (f.role === 'doctor') db.add(tid, 'users', { role: 'doctor', refId: s.id, email: f.email || `${s.id.toLowerCase()}@${tenant.email.split('@')[1]}`, password: 'demo123' })
    toast(`${s.name} added`)
    onClose()
  }
  return (
    <Modal title="Add staff member" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={blocked} onClick={save}>Add</button></>}>
      <div className="grid g2">
        <Input id="st-name" label="Full name" value={f.name} onChange={set('name')} />
        <Select id="st-role" label="Role" value={f.role} onChange={set('role')} options={Object.entries(ROLES).map(([value, label]) => ({ value, label }))} />
        <Input id="st-dept" label="Department" value={f.dept} onChange={set('dept')} placeholder="e.g. ICU" />
        <Input id="st-qual" label="Qualification" value={f.qualification} onChange={set('qualification')} />
        <Input id="st-phone" label="Mobile" value={f.phone} onChange={set('phone')} />
        <Input id="st-email" label="Work email" value={f.email} onChange={set('email')} />
        <Input id="st-sal" label="Monthly basic (₹)" type="number" value={f.salary} onChange={set('salary')} />
        {f.role === 'doctor' && <Input id="st-fee" label="Consultation fee (₹)" type="number" value={f.fee} onChange={set('fee')} />}
      </div>
      {blocked && <div className="small" style={{ color: 'var(--warn)' }}>The {PLANS[tenant.plan].name} plan includes up to {PLANS[tenant.plan].maxDoctors} doctors. Upgrade in Plan & settings to add more.</div>}
    </Modal>
  )
}
