import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble } from 'lucide-react'
import { useTenant, PageHead, Stat, Modal, Pill, Input, toast } from '../components/ui'
import { AdmitForm } from '../components/forms'
import { db } from '../lib/store'
import { fmtDate, money, today, daysBetween } from '../lib/utils'

export default function IPD() {
  const { list, patient, staff, user } = useTenant()
  const [admit, setAdmit] = useState(null)
  const [open, setOpen] = useState(null)
  const beds = list('beds')
  const active = list('admissions').filter((a) => a.status === 'admitted')
  const byBed = Object.fromEntries(active.map((a) => [a.bedId, a]))
  const wards = [...new Set(beds.map((b) => b.ward))]

  return (
    <>
      <PageHead title="IPD & ICU beds" sub="Live bed board. Click a free bed to admit, or an occupied bed to update or discharge.">
        <button className="btn primary" onClick={() => setAdmit({})}><BedDouble /> Admit patient</button>
      </PageHead>
      <div className="grid g4">
        {wards.map((w) => {
          const wb = beds.filter((b) => b.ward === w)
          const occ = wb.filter((b) => byBed[b.id]).length
          return <Stat key={w} label={w} value={`${occ} / ${wb.length}`} sub={`${wb.length - occ} free · ${money(wb[0].rate)} per day`} />
        })}
      </div>
      {wards.map((w) => (
        <section key={w} className="ward">
          <h2>{w}</h2>
          <div className="beds">
            {beds.filter((b) => b.ward === w).map((b) => {
              const a = byBed[b.id]
              if (!a) return (
                <button key={b.id} className="bed free" onClick={() => setAdmit({ bedId: b.id })}>
                  <span className="bn">{b.number}</span><span className="small">Free · click to admit</span>
                </button>
              )
              const p = patient(a.patientId)
              const crit = a.vitals?.spo2 && a.vitals.spo2 < 92
              return (
                <button key={b.id} className={`bed ${crit ? 'crit' : ''}`} onClick={() => setOpen(a)}>
                  <span className="bn">{b.number}<span className="muted">Day {daysBetween(a.admitDate, today()) + 1}</span></span>
                  <strong style={{ fontSize: 13 }}>{p?.name}</strong>
                  <span className="small muted" style={{ lineHeight: 1.3 }}>{a.reason}</span>
                  <span className="small muted">{staff(a.doctorId)?.name}</span>
                  {a.vitals?.spo2 && <span className="small tabular" style={{ color: crit ? 'var(--bad)' : 'var(--muted)' }}>SpO₂ {a.vitals.spo2}% · BP {a.vitals.bp}</span>}
                </button>
              )
            })}
          </div>
        </section>
      ))}
      {admit && <AdmitForm bedId={admit.bedId} onClose={() => setAdmit(null)} />}
      {open && <AdmissionModal adm={list('admissions').find((a) => a.id === open.id)} canDischarge={user.role !== 'patient'} onClose={() => setOpen(null)} />}
    </>
  )
}

function AdmissionModal({ adm, onClose }) {
  const { tid, list, patient, staff, base } = useTenant()
  const nav = useNavigate()
  const p = patient(adm.patientId)
  const bed = list('beds').find((b) => b.id === adm.bedId)
  const [v, setV] = useState({ bp: '', pulse: '', spo2: '', temp: '', ...adm.vitals })
  const [step, setStep] = useState('view')
  const days = Math.max(1, daysBetween(adm.admitDate, today()))
  const lines = [
    { desc: `${bed.ward} bed charges (${bed.number})`, qty: days, rate: bed.rate },
    { desc: 'Doctor visits', qty: days, rate: bed.ward === 'ICU' ? 1500 : 800 },
    { desc: 'Nursing care', qty: days, rate: bed.ward === 'ICU' ? 1200 : 600 },
  ]
  const total = lines.reduce((s, l) => s + l.qty * l.rate, 0)
  const saveVitals = () => {
    db.update(tid, 'admissions', adm.id, { vitals: { bp: v.bp, pulse: +v.pulse, spo2: +v.spo2, temp: v.temp } })
    toast('Vitals updated')
  }
  const discharge = () => {
    db.update(tid, 'admissions', adm.id, { status: 'discharged', dischargeDate: today() })
    const b = db.add(tid, 'bills', { patientId: p.id, date: today(), source: 'IPD', ref: adm.id, items: lines, discount: 0, paid: 0, mode: 'Card' })
    toast(`${p.name} discharged. Final bill ${b.id} for ${money(total)} raised.`)
    onClose()
  }
  return (
    <Modal title={`${bed.number} · ${p.name}`} onClose={onClose} footer={step === 'view' ? (
      <><button className="btn" onClick={() => nav(`${base}/patients/${p.id}`)}>Open patient record</button><button className="btn" onClick={saveVitals}>Save vitals</button><button className="btn primary" onClick={() => setStep('confirm')}>Discharge</button></>
    ) : (
      <><button className="btn" onClick={() => setStep('view')}>Back</button><button className="btn primary" onClick={discharge}>Discharge and raise bill</button></>
    )}>
      <dl className="kv">
        <dt>Admitted</dt><dd>{fmtDate(adm.admitDate)} · day {days}</dd>
        <dt>Reason</dt><dd>{adm.reason}</dd>
        <dt>Consultant</dt><dd>{staff(adm.doctorId)?.name} · {staff(adm.doctorId)?.dept}</dd>
        <dt>Allergies</dt><dd>{p.allergies || 'None known'}</dd>
      </dl>
      {step === 'view' ? (
        <>
          <h3>Vitals</h3>
          <div className="grid g4">
            <Input id="v-bp" label="BP (mmHg)" value={v.bp} onChange={(e) => setV({ ...v, bp: e.target.value })} />
            <Input id="v-pulse" label="Pulse (/min)" type="number" value={v.pulse} onChange={(e) => setV({ ...v, pulse: e.target.value })} />
            <Input id="v-spo2" label="SpO₂ (%)" type="number" value={v.spo2} onChange={(e) => setV({ ...v, spo2: e.target.value })} />
            <Input id="v-temp" label="Temp (°F)" value={v.temp} onChange={(e) => setV({ ...v, temp: e.target.value })} />
          </div>
        </>
      ) : (
        <div className="stack" style={{ gap: 6 }}>
          <h3>Final bill preview</h3>
          {lines.map((l) => <div key={l.desc} className="row between"><span>{l.desc} × {l.qty}</span><span className="tabular">{money(l.qty * l.rate)}</span></div>)}
          <div className="row between" style={{ fontWeight: 700 }}><span>Total</span><span className="tabular">{money(total)}</span></div>
          <span className="muted small">Pharmacy and lab charges are billed separately on their own invoices.</span>
        </div>
      )}
      <Pill status="admitted">Admitted</Pill>
    </Modal>
  )
}
