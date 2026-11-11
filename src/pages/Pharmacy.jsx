import { useState } from 'react'
import { ShoppingCart, PackagePlus, Trash2, Plus } from 'lucide-react'
import { useTenant, PageHead, Card, Table, Pill, Tabs, Modal, Input, Select, SearchBox, Stat, toast } from '../components/ui'
import { db } from '../lib/store'
import { fmtDate, money, today, daysBetween } from '../lib/utils'

const stockState = (m) => (m.stock <= m.reorder ? 'low' : daysBetween(today(), m.expiry) < 60 ? 'expiring' : 'ok')

export default function Pharmacy() {
  const { tid, list, patient, staff } = useTenant()
  const [tab, setTab] = useState('queue')
  const [q, setQ] = useState('')
  const [restock, setRestock] = useState(null)
  const [sale, setSale] = useState(false)
  const meds = list('medicines')
  const queue = list('prescriptions').filter((r) => !r.dispensed).sort((a, b) => b.date.localeCompare(a.date))
  const sales = list('sales').sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const todaySales = sales.filter((s) => s.date === today()).reduce((t, s) => t + s.items.reduce((x, i) => x + i.qty * i.price, 0), 0)
  const low = meds.filter((m) => stockState(m) === 'low')
  const exp = meds.filter((m) => stockState(m) === 'expiring')

  const dispense = (rx) => {
    const items = rx.items.filter((i) => i.medicineId).map((i) => {
      const m = meds.find((x) => x.id === i.medicineId)
      return { medicineId: m.id, name: m.name, qty: Math.min(i.qty, m.stock), price: m.mrp }
    }).filter((i) => i.qty > 0)
    items.forEach((i) => db.update(tid, 'medicines', i.medicineId, (m) => ({ stock: m.stock - i.qty })))
    const p = patient(rx.patientId)
    const total = items.reduce((s, i) => s + i.qty * i.price, 0)
    const bill = db.add(tid, 'bills', { patientId: p.id, date: today(), source: 'Pharmacy', ref: rx.id, items: items.map((i) => ({ desc: i.name, qty: i.qty, rate: i.price })), discount: 0, paid: total, mode: 'UPI' })
    db.add(tid, 'sales', { date: today(), patientId: p.id, customer: p.name, prescriptionId: rx.id, billId: bill.id, items })
    db.update(tid, 'prescriptions', rx.id, { dispensed: true })
    toast(`Dispensed ${items.length} items to ${p.name} · ${money(total)} collected`)
  }

  return (
    <>
      <PageHead title="Pharmacy" sub="Dispense prescriptions, sell over the counter, and keep stock in check">
        <button className="btn primary" onClick={() => setSale(true)}><ShoppingCart /> New counter sale</button>
      </PageHead>
      <div className="grid g4">
        <Stat label="Waiting to dispense" value={queue.length} sub="Prescriptions from doctors" />
        <Stat label="Sales today" value={money(todaySales)} sub={`${sales.filter((s) => s.date === today()).length} bills`} />
        <Stat label="Low stock" value={low.length} sub="At or below reorder level" />
        <Stat label="Expiring in 60 days" value={exp.length} sub="Move to the front or return" />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'queue', label: 'Dispense queue', count: queue.length },
        { id: 'stock', label: 'Stock', count: meds.length },
        { id: 'sales', label: 'Sales', count: sales.length },
      ]} />
      {tab === 'queue' && (
        <Card>
          <Table rows={queue} empty="Nothing to dispense. All prescriptions are done." cols={[
            { label: 'Rx', render: (r) => <><div className="cell-main">{r.id}</div><div className="cell-sub">{fmtDate(r.date)}</div></> },
            { label: 'Patient', render: (r) => <><div>{patient(r.patientId)?.name}</div><div className="cell-sub">{staff(r.doctorId)?.name}</div></> },
            { label: 'Medicines', render: (r) => <div className="small">{r.items.map((i) => {
              const m = meds.find((x) => x.id === i.medicineId)
              return <div key={i.name}>{i.name} × {i.qty} {m ? (m.stock < i.qty ? <span style={{ color: 'var(--bad)' }}>(only {m.stock} left)</span> : '') : <span className="muted">(not stocked)</span>}</div>
            })}</div> },
            { label: 'Amount', num: true, render: (r) => money(r.items.reduce((s, i) => { const m = meds.find((x) => x.id === i.medicineId); return s + (m ? Math.min(i.qty, m.stock) * m.mrp : 0) }, 0)) },
            { label: '', render: (r) => <button className="btn sm primary" onClick={() => dispense(r)}>Dispense & bill</button> },
          ]} />
        </Card>
      )}
      {tab === 'stock' && (
        <Card actions={<SearchBox value={q} onChange={setQ} placeholder="Medicine or generic" />} title="Stock">
          <Table rows={meds.filter((m) => !q || `${m.name} ${m.generic}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.stock - b.stock)} cols={[
            { label: 'Medicine', render: (m) => <><div className="cell-main">{m.name}</div><div className="cell-sub">{m.generic} · {m.form}</div></> },
            { label: 'Batch', render: (m) => <span className="tabular small">{m.batch}</span> },
            { label: 'Expiry', render: (m) => fmtDate(m.expiry) },
            { label: 'In stock', num: true, render: (m) => <strong className="tabular">{m.stock}</strong> },
            { label: 'MRP', num: true, render: (m) => `₹${m.mrp}` },
            { label: 'Status', render: (m) => <Pill status={stockState(m)}>{{ low: 'Reorder', expiring: 'Expiring soon', ok: 'OK' }[stockState(m)]}</Pill> },
            { label: '', render: (m) => <button className="btn sm" onClick={() => setRestock(m)}><PackagePlus /> Add stock</button> },
          ]} />
        </Card>
      )}
      {tab === 'sales' && (
        <Card>
          <Table rows={sales.slice(0, 120)} cols={[
            { label: 'Sale', render: (s) => <><div className="cell-main">{s.id}</div><div className="cell-sub">{fmtDate(s.date)}</div></> },
            { label: 'Customer', render: (s) => s.customer },
            { label: 'Against', render: (s) => s.prescriptionId || <span className="muted">Counter sale</span> },
            { label: 'Items', render: (s) => <span className="small">{s.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</span> },
            { label: 'Total', num: true, render: (s) => money(s.items.reduce((x, i) => x + i.qty * i.price, 0)) },
          ]} />
        </Card>
      )}
      {restock && <Restock med={restock} onClose={() => setRestock(null)} />}
      {sale && <CounterSale onClose={() => setSale(false)} />}
    </>
  )
}

function Restock({ med, onClose }) {
  const { tid } = useTenant()
  const [qty, setQty] = useState(200)
  const [batch, setBatch] = useState('B' + Math.floor(10000 + Math.random() * 89999))
  const save = () => {
    db.update(tid, 'medicines', med.id, (m) => ({ stock: m.stock + +qty, batch }))
    toast(`${qty} added to ${med.name}`)
    onClose()
  }
  return (
    <Modal title={`Add stock · ${med.name}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Add to stock</button></>}>
      <div className="grid g2">
        <Input id="rs-qty" label="Quantity received" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Input id="rs-batch" label="Batch no." value={batch} onChange={(e) => setBatch(e.target.value)} />
      </div>
      <span className="small muted">Now {med.stock} in stock. Purchase cost about {money(qty * med.cost)}.</span>
    </Modal>
  )
}

function CounterSale({ onClose }) {
  const { tid, list } = useTenant()
  const meds = list('medicines')
  const [customer, setCustomer] = useState('')
  const [items, setItems] = useState([{ medicineId: meds[0].id, qty: 1 }])
  const [mode, setMode] = useState('UPI')
  const lines = items.map((i) => ({ ...i, m: meds.find((x) => x.id === i.medicineId) }))
  const total = lines.reduce((s, l) => s + l.qty * l.m.mrp, 0)
  const save = () => {
    const sold = lines.filter((l) => l.qty > 0 && l.qty <= l.m.stock)
    if (!sold.length) return
    sold.forEach((l) => db.update(tid, 'medicines', l.m.id, (m) => ({ stock: m.stock - l.qty })))
    db.add(tid, 'sales', { date: today(), patientId: '', customer: customer || 'Walk-in customer', prescriptionId: '', items: sold.map((l) => ({ medicineId: l.m.id, name: l.m.name, qty: +l.qty, price: l.m.mrp })), mode })
    toast(`Sale saved · ${money(total)}`)
    onClose()
  }
  return (
    <Modal title="Counter sale" onClose={onClose} footer={<><span style={{ marginRight: 'auto' }}>Total <strong className="tabular">{money(total)}</strong></span><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save sale</button></>}>
      <div className="grid g2">
        <Input id="cs-cust" label="Customer name" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in customer" />
        <Select id="cs-mode" label="Payment" value={mode} onChange={(e) => setMode(e.target.value)} options={['UPI', 'Cash', 'Card']} />
      </div>
      {lines.map((l, i) => (
        <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
          <select className="input" value={l.medicineId} aria-label="Medicine" onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, medicineId: e.target.value } : x)))}>
            {meds.map((m) => <option key={m.id} value={m.id} disabled={!m.stock}>{m.name} · ₹{m.mrp} · {m.stock} left</option>)}
          </select>
          <input className="input" type="number" min="1" max={l.m.stock} style={{ width: 80 }} value={l.qty} aria-label="Quantity" onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, qty: +e.target.value } : x)))} />
          <button className="btn ghost sm" aria-label="Remove" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 /></button>
        </div>
      ))}
      <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setItems([...items, { medicineId: meds[1].id, qty: 1 }])}><Plus /> Add item</button>
    </Modal>
  )
}
