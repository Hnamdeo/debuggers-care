// Bring patients over from a paper register or spreadsheet: choose a CSV file (or paste the rows),
// check the preview, then add them in one go. Rows without a valid mobile, and patients already
// registered with the same mobile, are left out.
import { useState } from 'react'
import { FileUp, Check } from 'lucide-react'
import { Modal, useTenant, toast } from './ui'
import { db } from '../lib/store'
import { today } from '../lib/utils'

const COLS = {
  name: /name/i, phone: /mobile|phone|contact/i, age: /age/i, gender: /sex|gender/i, address: /address|village|city|place/i, opdNo: /opd|reg/i,
}

function splitLine(line) {
  const out = []
  let cur = '', q = false
  for (const ch of line) {
    if (ch === '"') q = !q
    else if ((ch === ',' || ch === '\t') && !q) { out.push(cur.trim()); cur = '' }
    else cur += ch
  }
  out.push(cur.trim())
  return out
}

export function parseRows(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const head = splitLine(lines[0])
  const hasHead = head.some((h) => COLS.name.test(h))
  const idx = {}
  if (hasHead) Object.entries(COLS).forEach(([k, re]) => { idx[k] = head.findIndex((h) => re.test(h)) })
  else Object.assign(idx, { name: 0, phone: 1, age: 2, gender: 3, address: 4, opdNo: 5 })
  return (hasHead ? lines.slice(1) : lines).map((l) => {
    const c = splitLine(l)
    const get = (k) => (idx[k] >= 0 ? c[idx[k]] || '' : '')
    const phone = get('phone').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '')
    const g = get('gender').toUpperCase()[0] || ''
    return { name: get('name'), phone, ageYears: get('age').replace(/\D/g, ''), gender: ['M', 'F', 'O'].includes(g) ? g : '', address: get('address'), opdNo: get('opdNo') }
  })
}

export function ImportPatients({ onClose }) {
  const { tid, list } = useTenant()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const rows = parseRows(text)
  const have = new Set(list('patients').map((p) => (p.phone || '').replace(/\D/g, '').slice(-10)))
  const seen = new Set()
  const checked = rows.map((r) => {
    let why = ''
    if (!r.name) why = 'No name'
    else if (!/^[6-9]\d{9}$/.test(r.phone)) why = 'No valid mobile'
    else if (have.has(r.phone)) why = 'Already registered'
    else if (seen.has(r.phone)) why = 'Repeated in the list'
    seen.add(r.phone)
    return { ...r, why }
  })
  const ok = checked.filter((r) => !r.why)

  const pick = async (e) => {
    const f = e.target.files?.[0]
    if (f) setText(await f.text())
    e.target.value = ''
  }
  const add = async () => {
    setBusy(true)
    let n = 0
    try {
      for (const r of ok) {
        const rec = { name: r.name, phone: r.phone, gender: r.gender, address: r.address, opdNo: r.opdNo, regDate: today(), source: 'register import' }
        if (r.ageYears) { rec.dob = `${new Date().getFullYear() - +r.ageYears}-01-01`; rec.dobApprox = true }
        db.add(tid, 'patients', rec)
        n++
      }
      toast(`${n} patients added`)
      onClose()
    } catch (x) {
      toast(`${n} added, then stopped: ${x.message}`)
      setBusy(false)
    }
  }

  return (
    <Modal wide title="Import patients from a list" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn primary" disabled={!ok.length || busy} onClick={add}><Check /> {busy ? 'Adding…' : `Add ${ok.length} patient${ok.length === 1 ? '' : 's'}`}</button>
    </>}>
      <div className="row">
        <label className="btn"><FileUp /> Choose CSV file<input type="file" accept=".csv,.txt,text/csv" hidden onChange={pick} /></label>
        <span className="small muted">Or paste rows below: Name, Mobile, Age, Sex, Address, OPD no.</span>
      </div>
      <textarea className="input" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Name,Mobile,Age,Gender,Address,OPD No\nVimla Suryavanshi,7898164912,27,F,Rogda,25887/O'} aria-label="Patient rows" />
      {checked.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Mobile</th><th>Age / Sex</th><th>Address</th><th>OPD no.</th><th /></tr></thead>
            <tbody>
              {checked.map((r, i) => (
                <tr key={i} style={r.why ? { opacity: 0.5 } : undefined}>
                  <td className="cell-main">{r.name || '–'}</td><td className="tabular">{r.phone || '–'}</td>
                  <td>{r.ageYears || '–'} / {r.gender || '–'}</td><td>{r.address}</td><td>{r.opdNo}</td>
                  <td>{r.why ? <span className="pill bad">{r.why}</span> : <span className="pill ok">Will add</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
