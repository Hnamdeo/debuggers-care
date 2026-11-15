// Treatment estimates: what the treatment will cost before it starts. Print or save as PDF, share on WhatsApp,
// mark that the patient agreed, and turn it into a bill when the work is done.
import { useState } from 'react'
import { Plus, Trash2, MessageCircle, Receipt, CheckCircle2, FileSpreadsheet } from 'lucide-react'
import { useTenant, Modal, Input, Textarea, DocModal, SheetHead, Card, Table, Pill, toast } from './ui'
import { db } from '../lib/store'
import { today, addDays, fmtDate, money, age } from '../lib/utils'
import { whatsappLink } from './videos'

export const estTotal = (e) => Math.max(0, e.items.reduce((s, i) => s + (+i.qty || 0) * (+i.rate || 0), 0) - (+e.discount || 0))

export function EstimateForm({ p, initial, onClose }) {
  const { tid, tenant } = useTenant()
  const [items, setItems] = useState(initial?.length ? initial : [{ desc: '', tooth: '', qty: 1, rate: 0 }])
  const [discount, setDiscount] = useState(0)
  const [note, setNote] = useState('Estimate is valid for 30 days. The final amount can change if the treatment changes.')
  const [open, setOpen] = useState(null)
  const total = Math.max(0, items.reduce((s, i) => s + i.qty * i.rate, 0) - discount)
  const upd = (i, k, v) => setItems(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  const save = () => {
    const rows = items.filter((i) => i.desc.trim()).map((i) => ({ ...i, qty: +i.qty || 1, rate: +i.rate || 0 }))
    if (!rows.length) return toast('Add at least one treatment')
    const e = db.add(tid, 'estimates', { patientId: p.id, date: today(), validTill: addDays(today(), 30), items: rows, discount: +discount || 0, note, status: 'given' })
    toast(`Estimate ${e.id} for ${money(estTotal(e))} saved`)
    setOpen(e)
  }
  if (open) return <EstimateDoc est={open} onClose={() => onClose(open)} />
  return (
    <Modal wide title={`Treatment estimate · ${p.name}`} onClose={() => onClose()} footer={<><span className="muted" style={{ marginRight: 'auto' }}>Total <strong className="tabular" style={{ color: 'var(--fg)', fontSize: 16 }}>{money(total)}</strong></span><button className="btn" onClick={() => onClose()}>Cancel</button><button className="btn primary" onClick={save}><FileSpreadsheet /> Save estimate</button></>}>
      <div className="stack" style={{ gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} className="est-line">
            <Input id={`es-d${i}`} label={i === 0 ? 'Treatment / service' : undefined} list="es-svc" value={it.desc} placeholder="e.g. RCT" onChange={(e) => {
              const svc = tenant.services.find((s) => s[0] === e.target.value)
              setItems(items.map((x, j) => (j === i ? { ...x, desc: e.target.value, rate: svc ? svc[1] : x.rate } : x)))
            }} />
            <Input id={`es-t${i}`} label={i === 0 ? 'Tooth' : undefined} value={it.tooth} placeholder="36" onChange={(e) => upd(i, 'tooth', e.target.value)} />
            <Input id={`es-q${i}`} label={i === 0 ? 'Units' : undefined} type="number" min="1" value={it.qty} onChange={(e) => upd(i, 'qty', e.target.value)} />
            <Input id={`es-r${i}`} label={i === 0 ? 'Price (₹)' : undefined} type="number" min="0" value={it.rate} onChange={(e) => upd(i, 'rate', e.target.value)} />
            <span className="tabular" style={{ paddingBottom: 8 }}>{money(it.qty * it.rate)}</span>
            <button className="btn ghost sm" aria-label="Remove line" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 /></button>
          </div>
        ))}
        <datalist id="es-svc">{tenant.services.map(([n]) => <option key={n} value={n} />)}</datalist>
        <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setItems([...items, { desc: '', tooth: '', qty: 1, rate: 0 }])}><Plus /> Add treatment</button>
      </div>
      <div className="grid g2">
        <Input id="es-disc" label="Discount (₹)" type="number" min="0" value={discount} onChange={(e) => setDiscount(+e.target.value || 0)} />
        <div />
      </div>
      <Textarea id="es-note" label="Note for the patient" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  )
}

export function estimateText(tenant, p, e) {
  return [
    `*${tenant.name}*`,
    `Treatment estimate for ${p.name} · ${fmtDate(e.date)}`,
    '',
    ...e.items.map((i, n) => `${n + 1}. ${i.desc}${i.tooth ? ` (tooth ${i.tooth})` : ''}${+i.qty > 1 ? ` × ${i.qty}` : ''}: ${money(i.qty * i.rate)}`),
    +e.discount ? `Discount: -${money(e.discount)}` : '',
    `*Total: ${money(estTotal(e))}*`,
    '',
    e.note || '',
    `Questions? Call us on ${tenant.phone}.`,
  ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n')
}

export function EstimateDoc({ est, onClose }) {
  const { tid, tenant, patient, list, user } = useTenant()
  const e = list('estimates').find((x) => x.id === est.id) || est
  const p = patient(e.patientId)
  const staffView = user.role !== 'patient'
  const sub = e.items.reduce((s, i) => s + i.qty * i.rate, 0)
  const accept = () => { db.update(tid, 'estimates', e.id, { status: 'accepted', acceptedAt: today() }); toast(`${p.name} agreed to estimate ${e.id}`) }
  const toBill = () => {
    const b = db.add(tid, 'bills', { patientId: e.patientId, date: today(), source: 'OPD', items: e.items.map((i) => ({ desc: `${i.desc}${i.tooth ? ` (tooth ${i.tooth})` : ''}`, qty: +i.qty, rate: +i.rate })), discount: +e.discount || 0, paid: 0, mode: 'UPI', estimateId: e.id })
    db.update(tid, 'estimates', e.id, { status: 'billed', billId: b.id })
    toast(`Bill ${b.id} made from estimate ${e.id}. Collect payment at the front desk.`)
    onClose()
  }
  return (
    <DocModal title={`Estimate ${e.id}`} onClose={onClose} extra={staffView && <>
      {p?.phone && <a className="btn" href={whatsappLink(p.phone.replace(/\D/g, '').slice(-10), estimateText(tenant, p, e))} target="_blank" rel="noopener noreferrer" onClick={() => db.update(tid, 'estimates', e.id, { sentAt: new Date().toISOString() })}><MessageCircle /> {e.sentAt ? 'Send again' : 'Send on WhatsApp'}</a>}
      {e.status === 'given' && <button className="btn" onClick={accept}><CheckCircle2 /> Patient agreed</button>}
      {e.status !== 'billed' && <button className="btn" onClick={toBill}><Receipt /> Make bill</button>}
    </>}>
      <div className="sheet">
        <SheetHead tenant={tenant} title="Treatment estimate" sub={`${e.id} · ${fmtDate(e.date)}`} />
        <div className="meta">
          <div><span className="muted">Patient:</span> <strong>{p?.name}</strong></div>
          <div><span className="muted">UHID:</span> {p?.id}</div>
          <div><span className="muted">Age / Sex:</span> {p ? `${p.dob ? `${age(p.dob)} y` : '–'} / ${p.gender || '–'}` : '-'}</div>
          <div><span className="muted">Valid till:</span> {fmtDate(e.validTill)}</div>
        </div>
        <table>
          <thead><tr><th>Treatment</th><th>Tooth</th><th className="num">Units</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {e.items.map((it, i) => <tr key={i}><td>{it.desc}</td><td>{it.tooth || '–'}</td><td className="num">{it.qty}</td><td className="num">{money(it.rate)}</td><td className="num">{money(it.qty * it.rate)}</td></tr>)}
            {+e.discount > 0 && <><tr><td colSpan={4} className="num muted">Subtotal</td><td className="num">{money(sub)}</td></tr><tr><td colSpan={4} className="num muted">Discount</td><td className="num">- {money(e.discount)}</td></tr></>}
            <tr className="tot"><td colSpan={4} className="num">Estimated total</td><td className="num">{money(estTotal(e))}</td></tr>
          </tbody>
        </table>
        {e.note && <p className="small">{e.note}</p>}
        <div className="sign-row"><span>Patient’s signature</span><span>Doctor’s signature</span></div>
      </div>
    </DocModal>
  )
}

const EST_STATUS = { given: ['Given', 'scheduled'], accepted: ['Agreed', 'ok'], billed: ['Billed', 'completed'] }
export function EstimatesTab({ p }) {
  const { list, user } = useTenant()
  const [form, setForm] = useState(false)
  const [doc, setDoc] = useState(null)
  const rows = list('estimates').filter((e) => e.patientId === p.id).sort((a, b) => b.id.localeCompare(a.id))
  return (
    <Card title={<h2>Treatment estimates</h2>} actions={user.role !== 'patient' && <button className="btn sm primary" onClick={() => setForm(true)}><Plus /> New estimate</button>}>
      <Table rows={rows} empty="No estimates yet. Make one before starting a long treatment so the patient knows the cost." onRow={setDoc} cols={[
        { label: 'Estimate', render: (e) => <><div className="cell-main">{e.id}</div><div className="cell-sub">{fmtDate(e.date)}</div></> },
        { label: 'Treatments', render: (e) => <span className="small">{e.items.map((i) => `${i.desc}${i.tooth ? ` ${i.tooth}` : ''}`).join(', ')}</span> },
        { label: 'Total', num: true, render: (e) => money(estTotal(e)) },
        { label: 'Status', render: (e) => <Pill status={EST_STATUS[e.status]?.[1] || 'scheduled'}>{EST_STATUS[e.status]?.[0] || e.status}</Pill> },
      ]} />
      {form && <EstimateForm p={p} onClose={() => setForm(false)} />}
      {doc && <EstimateDoc est={doc} onClose={() => setDoc(null)} />}
    </Card>
  )
}
