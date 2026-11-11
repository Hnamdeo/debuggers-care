// Printable documents: prescription, lab report, invoice, payslip.
import { DocModal, SheetHead, useTenant } from './ui'
import { fmtDate, money, billTotal, billStatus, age, fmtMonth } from '../lib/utils'
import { db } from '../lib/store'
import { toast } from './ui'

function PatientMeta({ p, extra }) {
  return (
    <div className="meta">
      <div><span className="muted">Patient:</span> <strong>{p?.name}</strong></div>
      <div><span className="muted">UHID:</span> {p?.id}</div>
      <div><span className="muted">Age / Sex:</span> {p ? `${age(p.dob)} y / ${p.gender}` : '-'}</div>
      <div><span className="muted">Phone:</span> {p?.phone}</div>
      {extra}
    </div>
  )
}

export function PrescriptionDoc({ rx, onClose }) {
  const { tenant, patient, staff } = useTenant()
  const p = patient(rx.patientId)
  const d = staff(rx.doctorId)
  return (
    <DocModal title={`Prescription ${rx.id}`} onClose={onClose}>
      <div className="sheet">
        <SheetHead tenant={tenant} title={d?.name} sub={`${d?.qualification || ''} · ${d?.regNo || ''}`} />
        <PatientMeta p={p} extra={<><div><span className="muted">Date:</span> {fmtDate(rx.date)}</div><div><span className="muted">Allergies:</span> {p?.allergies || 'None known'}</div></>} />
        <p><span className="muted">Diagnosis:</span> <strong>{rx.diagnosis}</strong></p>
        <div className="rx">℞</div>
        <table>
          <thead><tr><th>#</th><th>Medicine</th><th>Dose</th><th>When</th><th className="num">Days</th></tr></thead>
          <tbody>
            {rx.items.map((it, i) => (
              <tr key={i}><td>{i + 1}</td><td><strong>{it.name}</strong></td><td>{it.dose}</td><td>{it.freq}</td><td className="num">{it.days}</td></tr>
            ))}
          </tbody>
        </table>
        {rx.notes && <p><span className="muted">Advice:</span> {rx.notes}</p>}
        <div className="sign"><div style={{ fontFamily: 'cursive', fontSize: 18 }}>{d?.name}</div><div className="muted small">Signature</div></div>
      </div>
    </DocModal>
  )
}

export function ReportDoc({ rep, onClose }) {
  const { tenant, patient, staff } = useTenant()
  const p = patient(rep.patientId)
  return (
    <DocModal title={`${rep.test} · ${rep.id}`} onClose={onClose}>
      <div className="sheet">
        <SheetHead tenant={tenant} title={`${rep.category} report`} sub={rep.id} />
        <PatientMeta p={p} extra={<><div><span className="muted">Referred by:</span> {staff(rep.doctorId)?.name}</div><div><span className="muted">Reported:</span> {fmtDate(rep.completedDate || rep.date)}</div></>} />
        <h3 style={{ margin: '6px 0 10px' }}>{rep.test}</h3>
        {rep.status !== 'completed' ? (
          <p className="muted">Sample collected. Results are not ready yet.</p>
        ) : rep.results.length ? (
          <table>
            <thead><tr><th>Test</th><th className="num">Result</th><th>Unit</th><th>Normal range</th></tr></thead>
            <tbody>
              {rep.results.map((r) => (
                <tr key={r.param}><td>{r.param}</td><td className="num" style={{ fontWeight: r.flag ? 700 : 400, color: r.flag ? '#c7362f' : undefined }}>{r.value} {r.flag && `(${r.flag})`}</td><td>{r.unit}</td><td>{r.range}</td></tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {rep.findings && <p><span className="muted">Findings:</span> {rep.findings}</p>}
        <div className="sign"><div className="muted small">Verified by lab in-charge</div></div>
      </div>
    </DocModal>
  )
}

export function InvoiceDoc({ bill, onClose, canCollect }) {
  const { tenant, tid, patient } = useTenant()
  const p = patient(bill.patientId)
  const total = billTotal(bill)
  const sub = bill.items.reduce((s, i) => s + i.qty * i.rate, 0)
  const status = billStatus(bill)
  const collect = () => {
    db.update(tid, 'bills', bill.id, { paid: total })
    toast(`${money(total - bill.paid)} received for ${bill.id}`)
    onClose()
  }
  return (
    <DocModal title={`Invoice ${bill.id}`} onClose={onClose} extra={canCollect && status !== 'paid' && <button className="btn" onClick={collect}>Mark {money(total - bill.paid)} received</button>}>
      <div className="sheet">
        <SheetHead tenant={tenant} title="Tax invoice" sub={`${bill.id} · ${fmtDate(bill.date)}`} />
        <PatientMeta p={p} extra={<><div><span className="muted">Department:</span> {bill.source}</div>{tenant.gstin && <div><span className="muted">GSTIN:</span> {tenant.gstin}</div>}</>} />
        <table>
          <thead><tr><th>Description</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {bill.items.map((it, i) => (
              <tr key={i}><td>{it.desc}</td><td className="num">{it.qty}</td><td className="num">{money(it.rate)}</td><td className="num">{money(it.qty * it.rate)}</td></tr>
            ))}
            <tr><td colSpan={3} className="num muted">Subtotal</td><td className="num">{money(sub)}</td></tr>
            {bill.discount > 0 && <tr><td colSpan={3} className="num muted">Discount</td><td className="num">- {money(bill.discount)}</td></tr>}
            <tr className="tot"><td colSpan={3} className="num">Total</td><td className="num">{money(total)}</td></tr>
            <tr><td colSpan={3} className="num muted">Paid {bill.paid > 0 && `(${bill.mode})`}</td><td className="num">{money(Math.min(bill.paid, total))}</td></tr>
            <tr className="tot"><td colSpan={3} className="num">Balance</td><td className="num">{money(Math.max(0, total - bill.paid))}</td></tr>
          </tbody>
        </table>
        <p className="muted small">Healthcare services are exempt from GST. Medicines include GST in MRP.</p>
      </div>
    </DocModal>
  )
}

export function PayslipDoc({ slip, onClose }) {
  const { tenant, staff } = useTenant()
  const s = staff(slip.staffId)
  const row = (l, v) => <tr><td>{l}</td><td className="num">{money(v)}</td></tr>
  return (
    <DocModal title={`Payslip · ${s?.name}`} onClose={onClose}>
      <div className="sheet">
        <SheetHead tenant={tenant} title="Payslip" sub={fmtMonth(slip.month)} />
        <div className="meta">
          <div><span className="muted">Employee:</span> <strong>{s?.name}</strong></div>
          <div><span className="muted">Employee ID:</span> {s?.id}</div>
          <div><span className="muted">Department:</span> {s?.dept}</div>
          <div><span className="muted">Designation:</span> {s?.title}</div>
        </div>
        <div className="grid g2">
          <table><thead><tr><th>Earnings</th><th className="num">₹</th></tr></thead><tbody>{row('Basic', slip.basic)}{row('HRA', slip.hra)}{row('Allowances', slip.allowances)}<tr className="tot"><td>Gross</td><td className="num">{money(slip.gross)}</td></tr></tbody></table>
          <table><thead><tr><th>Deductions</th><th className="num">₹</th></tr></thead><tbody>{row('Provident fund', slip.pf)}{row('Professional tax', slip.pt)}{row('TDS', slip.tds)}<tr className="tot"><td>Total</td><td className="num">{money(slip.pf + slip.pt + slip.tds)}</td></tr></tbody></table>
        </div>
        <p style={{ fontSize: 16 }}><strong>Net pay: {money(slip.net)}</strong> <span className="muted small">{slip.status === 'paid' ? `Paid on ${fmtDate(slip.paidOn)}` : 'Processed, not yet paid'}</span></p>
      </div>
    </DocModal>
  )
}
