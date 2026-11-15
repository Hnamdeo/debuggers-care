// Treatment consent: pick a ready-made form (general, RCT, extraction, braces, implant…), the patient signs on the
// screen or tablet, and it is saved on their record. It can also be sent on WhatsApp for the patient to reply "I agree".
import { useEffect, useRef, useState } from 'react'
import { PenLine, MessageCircle, Eraser, ShieldCheck, Plus } from 'lucide-react'
import { useTenant, Modal, Input, Select, Textarea, DocModal, SheetHead, Card, Table, Pill, toast } from './ui'
import { db } from '../lib/store'
import { today, fmtDate, nowTime, fmtTime } from '../lib/utils'
import { whatsappLink } from './videos'
import { SITES } from '../lib/sites'

const BASE = 'The doctor has explained my problem, the treatment, other options and what happens if I do not take treatment. I have been able to ask questions and I understand the answers.'
export const CONSENT_FORMS = [
  ['General treatment', `${BASE} I agree to the examination, X-rays and treatment advised by the doctor, including local anaesthesia if needed. I understand that results can differ from person to person and no result is guaranteed.`],
  ['Root canal (RCT)', `${BASE} I agree to root canal treatment. I understand it needs more than one visit, the tooth may feel sore for a few days, an instrument can rarely break inside the canal, and the tooth may need a crown afterwards. In some cases the tooth may still need to be removed.`],
  ['Extraction', `${BASE} I agree to have the tooth removed. I understand there can be pain, swelling, bleeding, dry socket, numbness for some time, and that a missing tooth may need replacement later. I will follow the after-care advice.`],
  ['Braces / orthodontic', `${BASE} I agree to orthodontic treatment. I understand it takes many months, needs regular visits and good cleaning, the estimated time can change, and I must wear retainers afterwards or the teeth may move back.`],
  ['Implant', `${BASE} I agree to dental implant surgery. I understand it needs healing time, smoking and some illnesses lower success, there can be swelling or infection, and in rare cases the implant may not join the bone and may need to be redone.`],
  ['Teeth whitening', `${BASE} I agree to teeth whitening. I understand teeth can feel sensitive for a few days, fillings and crowns do not change colour, and the result fades over time.`],
  ['Child treatment (parent)', `${BASE} As the parent or guardian, I agree to the dental treatment advised for my child, including local anaesthesia if needed.`],
]

// Finger or mouse signature on a canvas, saved as a small PNG.
function SignPad({ onChange }) {
  const ref = useRef(null)
  const drawing = useRef(false)
  const dirty = useRef(false)
  useEffect(() => {
    const c = ref.current
    const r = c.getBoundingClientRect()
    c.width = r.width * 2; c.height = r.height * 2
    const x = c.getContext('2d')
    x.scale(2, 2); x.lineWidth = 2.2; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#0f1b2a'
  }, [])
  const pt = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  const down = (e) => { e.preventDefault(); ref.current.setPointerCapture(e.pointerId); drawing.current = true; const x = ref.current.getContext('2d'); x.beginPath(); x.moveTo(...pt(e)) }
  const move = (e) => { if (!drawing.current) return; const x = ref.current.getContext('2d'); x.lineTo(...pt(e)); x.stroke(); dirty.current = true }
  const up = () => { if (!drawing.current) return; drawing.current = false; if (dirty.current) onChange(ref.current.toDataURL('image/png')) }
  const clear = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); dirty.current = false; onChange('') }
  return (
    <div className="sign-pad">
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} aria-label="Sign here" />
      <span className="sign-hint">Sign here with a finger or the mouse</span>
      <button type="button" className="btn sm ghost" onClick={clear}><Eraser /> Clear</button>
    </div>
  )
}

export function ConsentForm({ p, onClose }) {
  const { tid, tenant, user, me } = useTenant()
  const hindi = SITES[tenant.slug]?.rxPad?.consent || SITES[tenant.slug]?.pad?.consent
  const forms = [...CONSENT_FORMS, ...(hindi ? [['सामान्य सहमति (हिंदी)', hindi]] : [])]
  const [kind, setKind] = useState(0)
  const [text, setText] = useState(forms[0][1])
  const [tooth, setTooth] = useState('')
  const [signer, setSigner] = useState(p.name)
  const [rel, setRel] = useState('Self')
  const [sign, setSign] = useState('')
  const pick = (i) => { setKind(i); setText(forms[i][1]); if (/child|parent/i.test(forms[i][0])) setRel('Parent') }
  const base = () => ({ patientId: p.id, date: today(), time: nowTime(), title: forms[kind][0], tooth, text, signer, relation: rel, doctorId: user.role === 'doctor' ? me?.id : undefined })
  const save = () => {
    if (!sign) return toast('Ask the patient to sign in the box first')
    const c = db.add(tid, 'consents', { ...base(), status: 'signed', via: 'screen', signature: sign })
    toast(`Consent ${c.id} signed by ${signer} and saved`)
    onClose(c)
  }
  const waText = `*${tenant.name}*\nConsent for ${forms[kind][0]}${tooth ? ` (tooth ${tooth})` : ''}\nPatient: ${p.name}\n\n${text}\n\nPlease reply *I AGREE* to give your consent.`
  const send = () => {
    db.add(tid, 'consents', { ...base(), status: 'sent', via: 'whatsapp' })
    toast('Consent sent on WhatsApp. Mark it agreed when the patient replies.')
    onClose()
  }
  return (
    <Modal wide title={`Consent form · ${p.name}`} onClose={() => onClose()} footer={<>
      {p.phone && <a className="btn" href={whatsappLink(p.phone.replace(/\D/g, '').slice(-10), waText)} target="_blank" rel="noopener noreferrer" onClick={send}><MessageCircle /> Send on WhatsApp</a>}
      <button className="btn primary" onClick={save} disabled={!sign}><PenLine /> Save signed consent</button>
    </>}>
      <div className="dc-chips">{forms.map(([t], i) => <button key={t} type="button" className={`qchip ${kind === i ? 'on' : ''}`} onClick={() => pick(i)}>{t}</button>)}</div>
      <Textarea id="cn-text" label="Consent text (you can edit it)" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="grid g3">
        <Input id="cn-tooth" label="Tooth / area (optional)" value={tooth} onChange={(e) => setTooth(e.target.value)} placeholder="e.g. 36" />
        <Input id="cn-signer" label="Signed by" value={signer} onChange={(e) => setSigner(e.target.value)} />
        <Select id="cn-rel" label="Relation with patient" value={rel} onChange={(e) => setRel(e.target.value)} options={['Self', 'Parent', 'Guardian', 'Spouse', 'Son / daughter', 'Other']} />
      </div>
      <SignPad onChange={setSign} />
    </Modal>
  )
}

export function ConsentDoc({ c, onClose }) {
  const { tid, tenant, patient, staff, user } = useTenant()
  const p = patient(c.patientId)
  const agree = () => { db.update(tid, 'consents', c.id, { status: 'agreed', agreedAt: today() }); toast(`${p?.name} agreed on WhatsApp. Saved.`); onClose() }
  return (
    <DocModal title={`Consent ${c.id}`} onClose={onClose} extra={user.role !== 'patient' && c.status === 'sent' && <button className="btn" onClick={agree}><ShieldCheck /> Patient replied I AGREE</button>}>
      <div className="sheet">
        <SheetHead tenant={tenant} title="Consent form" sub={`${c.id} · ${fmtDate(c.date)}${c.time ? ` · ${fmtTime(c.time)}` : ''}`} />
        <div className="meta">
          <div><span className="muted">Patient:</span> <strong>{p?.name}</strong></div>
          <div><span className="muted">UHID:</span> {p?.id}</div>
          <div><span className="muted">Treatment:</span> {c.title}{c.tooth ? ` · tooth ${c.tooth}` : ''}</div>
          {c.doctorId && <div><span className="muted">Doctor:</span> {staff(c.doctorId)?.name}</div>}
        </div>
        <p style={{ lineHeight: 1.6 }}>{c.text}</p>
        <div className="consent-sign">
          {c.signature ? <img src={c.signature} alt={`Signature of ${c.signer}`} /> : <div className="small muted">{c.status === 'agreed' ? `Agreed on WhatsApp on ${fmtDate(c.agreedAt)}` : 'Sent on WhatsApp, waiting for reply'}</div>}
          <div><b>{c.signer}</b> ({c.relation})</div>
        </div>
      </div>
    </DocModal>
  )
}

const C_STATUS = { signed: ['Signed', 'ok'], agreed: ['Agreed on WhatsApp', 'ok'], sent: ['Waiting for reply', 'warn'] }
export function ConsentTab({ p }) {
  const { list, user } = useTenant()
  const [form, setForm] = useState(false)
  const [doc, setDoc] = useState(null)
  const rows = list('consents').filter((c) => c.patientId === p.id).sort((a, b) => b.id.localeCompare(a.id))
  return (
    <Card title={<h2>Consent forms</h2>} actions={user.role !== 'patient' && <button className="btn sm primary" onClick={() => setForm(true)}><Plus /> New consent</button>}>
      <Table rows={rows} empty="No consent forms yet. Take one before RCT, extraction, implants or braces." onRow={setDoc} cols={[
        { label: 'Consent', render: (c) => <><div className="cell-main">{c.title}{c.tooth ? ` · ${c.tooth}` : ''}</div><div className="cell-sub">{c.id} · {fmtDate(c.date)}</div></> },
        { label: 'Signed by', render: (c) => `${c.signer} (${c.relation})` },
        { label: 'Status', render: (c) => <Pill tone={C_STATUS[c.status]?.[1]}>{C_STATUS[c.status]?.[0] || c.status}</Pill> },
      ]} />
      {form && <ConsentForm p={p} onClose={() => setForm(false)} />}
      {doc && <ConsentDoc c={doc} onClose={() => setDoc(null)} />}
    </Card>
  )
}
