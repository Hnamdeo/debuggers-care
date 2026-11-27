import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, CalendarPlus, Pill as Pills, Store, Truck, MessageCircle, FileText, ExternalLink } from 'lucide-react'
import { useTenant, PageHead, Card, Table, Pill, Modal, Textarea, Input, toast } from '../components/ui'
import { InstallStrip } from '../components/install'
import { PrescriptionDoc } from '../components/docs'
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
      <InstallStrip />
      <PatientHeader p={me}>
        <button className="btn primary" onClick={() => nav(`${base}/book`)}><CalendarPlus /> Book appointment</button>
        <button className="btn" onClick={() => nav(`${base}/my-medicines`)}><Pills /> My medicines</button>
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
          { label: '', render: (a) => a.room && a.status === 'scheduled' && a.date >= today() ? <a className="btn sm primary" href={a.room} target="_blank" rel="noopener noreferrer"><Video /> Join video call</a> : a.status === 'scheduled' && a.date >= today() && <button className="btn sm ghost danger" onClick={() => { db.update(tid, 'appointments', a.id, { status: 'cancelled' }); toast('Appointment cancelled') }}>Cancel</button> },
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

// ---------- My medicines: every prescription, and where to get the medicines ----------
// Clinics with their own pharmacy get the order on their Pharmacy screen (pickup or home delivery).
// Every patient can also open each medicine on Tata 1mg or Netmeds, or send the list to a local chemist.
export const ORDER_STEPS = { pickup: ['new', 'ready', 'done'], delivery: ['new', 'ready', 'out', 'done'] }
export const ORDER_TEXT = { new: 'Order received', ready: 'Packed', out: 'Out for delivery', done: 'Delivered', cancelled: 'Cancelled' }
export const orderText = (o, st = o.status) => (st === 'ready' && o.mode === 'pickup' ? 'Ready to collect' : st === 'done' && o.mode === 'pickup' ? 'Collected' : ORDER_TEXT[st])
const ONLINE = [
  ['Tata 1mg', (q) => `https://www.1mg.com/search/all?name=${encodeURIComponent(q)}`],
  ['Netmeds', (q) => `https://www.netmeds.com/catalogsearch/result/${encodeURIComponent(q)}/all`],
]

export function OrderSteps({ o }) {
  if (o.status === 'cancelled') return <div className="order-steps"><span>Cancelled{o.note ? ` · ${o.note}` : ''}</span></div>
  const steps = ORDER_STEPS[o.mode] || ORDER_STEPS.pickup
  const at = steps.indexOf(o.status)
  return <div className="order-steps">{steps.map((st, i) => <span key={st} className={i <= at ? 'done' : ''}>{orderText(o, st)}</span>)}</div>
}

export function PatientMedicines() {
  const { me, list, staff, tenant, can } = useTenant()
  const [order, setOrder] = useState(null)
  const [doc, setDoc] = useState(null)
  const own = can('pharmacy')
  const online = tenant.onlinePharmacy !== false
  const rxs = list('prescriptions').filter((r) => r.patientId === me.id && r.items?.length).sort((a, b) => b.date.localeCompare(a.date))
  const orders = list('medorders').filter((o) => o.patientId === me.id).sort((a, b) => b.id.localeCompare(a.id))
  const openFor = (rx) => orders.find((o) => o.prescriptionId === rx.id && o.status !== 'cancelled')
  const share = (rx) => `Medicines prescribed by ${staff(rx.doctorId)?.name || 'my doctor'} on ${fmtDate(rx.date)} (${rx.id}):\n` + rx.items.map((i, n) => `${n + 1}. ${i.name}${i.qty ? ` × ${i.qty}` : ''}${i.dose ? ` (${i.dose})` : ''}`).join('\n')

  return (
    <>
      <PageHead title="My medicines" sub={own ? `Every prescription from ${tenant.short || tenant.name}. Order from the clinic pharmacy, or buy online.` : 'Every prescription from your doctor, and quick ways to buy the medicines.'} />
      {orders.some((o) => !['done', 'cancelled'].includes(o.status)) && (
        <Card title="My orders">
          <Table rows={orders.filter((o) => !['done', 'cancelled'].includes(o.status))} cols={[
            { label: 'Order', render: (o) => <><div className="cell-main">{o.id}</div><div className="cell-sub">{fmtDate(o.date)} · {o.mode === 'delivery' ? 'Home delivery' : 'Pick up at clinic'}</div></> },
            { label: 'Medicines', render: (o) => <span className="small">{o.items.map((i) => i.name).join(', ')}</span> },
            { label: 'Status', render: (o) => <OrderSteps o={o} /> },
          ]} />
        </Card>
      )}
      {!rxs.length && <Card pad><div className="muted">No prescriptions yet. They appear here as soon as your doctor writes one.</div></Card>}
      {rxs.map((rx, n) => {
        const o = openFor(rx)
        const doc_ = staff(rx.doctorId)
        return (
          <Card key={rx.id} title={`${fmtDate(rx.date)} · ${rx.diagnosis || 'Prescription'}`} actions={<button className="btn sm ghost" onClick={() => setDoc(rx)}><FileText /> View prescription</button>}>
            <div style={{ padding: '0 16px 16px' }}>
              <div className="small muted" style={{ marginBottom: 10 }}>{doc_?.name}{doc_?.dept ? ` · ${doc_.dept}` : ''} · {rx.id}</div>
              <div className="rx-meds">
                {rx.items.map((i, k) => (
                  <div className="rx-med" key={k}>
                    <Pills size={18} style={{ color: 'var(--brand)', marginTop: 2 }} />
                    <div>
                      <b>{i.name}</b>{i.qty ? <span className="muted"> × {i.qty}</span> : null}
                      <div className="small muted">{[i.dose, i.freq, i.days ? `${i.days} days` : ''].filter(Boolean).join(' · ')}</div>
                    </div>
                    {online && (
                      <div className="rx-buy">
                        {ONLINE.map(([label, url]) => <a key={label} className="btn sm ghost" href={url(i.name)} target="_blank" rel="noreferrer">{label} <ExternalLink size={12} /></a>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {(n < 3 || o) && (
                <div className="get-meds">
                  <h4>Get these medicines</h4>
                  {own && (o ? (
                    <div className="stack" style={{ gap: 6 }}>
                      <span className="small">Order {o.id} · {o.mode === 'delivery' ? `home delivery to ${o.address}` : 'pick up at the clinic pharmacy'}</span>
                      <OrderSteps o={o} />
                    </div>
                  ) : rx.dispensed ? (
                    <span className="small muted">Already given by the clinic pharmacy. Need a refill? Order again below.</span>
                  ) : null)}
                  <div className="row">
                    {own && !o && <button className="btn primary sm" onClick={() => setOrder(rx)}><Store /> Order from {tenant.short || 'clinic'} pharmacy</button>}
                    <a className="btn sm" href={`https://wa.me/?text=${encodeURIComponent(share(rx))}`} target="_blank" rel="noreferrer"><MessageCircle /> Send list to my chemist</a>
                  </div>
                  {online && <span className="small muted">Tata 1mg and Netmeds open on their own app or website with home delivery; you order and pay there. They may ask for this prescription: tap View prescription, then save or print it.</span>}
                </div>
              )}
            </div>
          </Card>
        )
      })}
      {order && <OrderMeds rx={order} onClose={() => setOrder(null)} />}
      {doc && <PrescriptionDoc rx={doc} onClose={() => setDoc(null)} />}
    </>
  )
}

function OrderMeds({ rx, onClose }) {
  const { tid, me, tenant } = useTenant()
  const [mode, setMode] = useState('pickup')
  const [address, setAddress] = useState(me.address || '')
  const [phone, setPhone] = useState(me.phone || '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (mode === 'delivery' && address.trim().length < 8) return toast('Type the full address for delivery')
    if (!/^\d{10}$/.test(phone)) return toast('Type a 10-digit mobile number so the pharmacy can call you')
    setBusy(true)
    try {
      await db.add(tid, 'medorders', { patientId: me.id, prescriptionId: rx.id, date: today(), mode, address: mode === 'delivery' ? address.trim() : '', phone, note: note.trim(), status: 'new', items: rx.items.map((i) => ({ medicineId: i.medicineId || '', name: i.name, qty: i.qty || 1 })) })
      toast(mode === 'delivery' ? 'Order sent. The pharmacy will call you before delivery.' : 'Order sent. We will tell you when it is ready to collect.')
      onClose()
    } catch (e) {
      toast(e.message || 'Could not send the order. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={`Order medicines · ${tenant.short || tenant.name} pharmacy`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Sending…' : 'Send order'}</button></>}>
      <div className="small">{rx.items.map((i) => `${i.name}${i.qty ? ` × ${i.qty}` : ''}`).join(', ')}</div>
      <div className="seg" role="radiogroup" aria-label="How do you want the medicines?">
        <button type="button" role="radio" aria-checked={mode === 'pickup'} className={mode === 'pickup' ? 'on' : ''} onClick={() => setMode('pickup')}><Store size={14} /> Pick up at clinic</button>
        <button type="button" role="radio" aria-checked={mode === 'delivery'} className={mode === 'delivery' ? 'on' : ''} onClick={() => setMode('delivery')}><Truck size={14} /> Home delivery</button>
      </div>
      {mode === 'delivery' && <Textarea id="mo-addr" label="Delivery address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House no., street, area, city, PIN code" />}
      <Input id="mo-phone" label="Mobile number" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(-10))} />
      <Input id="mo-note" label="Note for the pharmacy (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. call before coming, only half the quantity" />
      <span className="small muted">You pay at the pharmacy when you collect, or on delivery. The pharmacist checks the prescription and may call you.</span>
    </Modal>
  )
}
