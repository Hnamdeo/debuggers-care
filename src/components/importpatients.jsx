// Bring patients over from another clinic software (HealthPlix, Practo and others export to
// Excel or CSV), a spreadsheet, or a typed register: choose the file (or paste the rows), check
// the preview, then add them in one go. Columns are found by their headings, whatever order
// they are in. Rows without a valid mobile, and patients already registered (same mobile and
// same first name), are left out. Family members who share one mobile are each kept.
import { useState } from 'react'
import { FileUp, Check, Download } from 'lucide-react'
import { Modal, useTenant, toast } from './ui'
import { db, server, offline } from '../lib/store'
import { today } from '../lib/utils'

// Each field lists its headings from most to least certain.
const FIELDS = [
  ['first', [/^first.?name$/i]],
  ['last', [/^(last|sur).?name$/i]],
  ['name', [/patient.?name|full.?name|^name$|^patient$/i, /^(?!.*(father|husband|guardian|doctor|dr\.?|referr|clinic|hospital|file)).*name/i]],
  ['phone', [/mobile|whats.?app|cell/i, /phone|contact.?(no|number)|^contact$/i]],
  ['age', [/^age\b|^age.?\(|age.?(years|yrs)/i]],
  ['gender', [/sex|gender/i]],
  ['dob', [/dob|d\.o\.b|birth/i]],
  ['email', [/e-?mail/i]],
  ['address', [/address/i, /village|city|area|locality|place|town|location/i]],
  ['opdNo', [/uhid|patient.?(id|no|number|code)|mrn|opd|reg(istration)?.?(no|number|id)|file.?no|^id$/i]],
  ['blood', [/blood/i]],
  ['allergies', [/allerg/i]],
  ['conditions', [/condition|chronic|medical.?history|past.?history|diagnos/i]],
  ['abha', [/abha/i]],
]

function splitLine(line) {
  const out = []
  let cur = '', q = false
  for (const ch of line) {
    if (ch === '"') q = !q
    else if ((ch === ',' || ch === '\t' || ch === ';') && !q) { out.push(cur.trim()); cur = '' }
    else cur += ch
  }
  out.push(cur.trim())
  return out
}
const textGrid = (text) => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map(splitLine)

// ---- Excel (.xlsx) without any extra library: an .xlsx file is a zip of XML files. ----
async function unzip(buf) {
  const v = new DataView(buf)
  const u8 = new Uint8Array(buf)
  let e = buf.byteLength - 22
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--
  if (e < 0) throw new Error('This does not look like an Excel file.')
  const n = v.getUint16(e + 10, true)
  let p = v.getUint32(e + 16, true)
  const files = {}
  const dec = new TextDecoder()
  for (let i = 0; i < n; i++) {
    const nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true)
    files[dec.decode(u8.subarray(p + 46, p + 46 + nl))] = { method: v.getUint16(p + 10, true), size: v.getUint32(p + 20, true), off: v.getUint32(p + 42, true) }
    p += 46 + nl + xl + cl
  }
  const read = async (name) => {
    const f = files[name]
    if (!f) return null
    const start = f.off + 30 + v.getUint16(f.off + 26, true) + v.getUint16(f.off + 28, true)
    const data = u8.subarray(start, start + f.size)
    if (f.method === 0) return dec.decode(data)
    return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()
  }
  return { names: Object.keys(files), read }
}

const xml = (s) => new DOMParser().parseFromString(s, 'application/xml')
const colNo = (ref) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1

export async function xlsxGrid(buf) {
  const z = await unzip(buf)
  const ss = await z.read('xl/sharedStrings.xml')
  const shared = ss ? [...xml(ss).getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join('')) : []
  // The first sheet in the workbook's own order.
  let sheet = 'xl/worksheets/sheet1.xml'
  try {
    const wb = xml(await z.read('xl/workbook.xml'))
    const rid = wb.getElementsByTagName('sheet')[0]?.getAttribute('r:id')
    const rels = xml(await z.read('xl/_rels/workbook.xml.rels'))
    const target = [...rels.getElementsByTagName('Relationship')].find((r) => r.getAttribute('Id') === rid)?.getAttribute('Target')
    if (target) sheet = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
  } catch {}
  const src = (await z.read(sheet)) || (await z.read(z.names.find((x) => /^xl\/worksheets\/[^/]+\.xml$/.test(x))))
  if (!src) throw new Error('No sheet found in this Excel file.')
  return [...xml(src).getElementsByTagName('row')].map((row) => {
    const out = []
    for (const c of row.getElementsByTagName('c')) {
      const t = c.getAttribute('t')
      const val = c.getElementsByTagName('v')[0]?.textContent ?? ''
      const v = t === 's' ? shared[+val] ?? '' : t === 'inlineStr' ? [...c.getElementsByTagName('t')].map((x) => x.textContent).join('') : val
      out[c.getAttribute('r') ? colNo(c.getAttribute('r')) : out.length] = String(v).trim()
    }
    return Array.from(out, (x) => x ?? '')
  }).filter((r) => r.some(Boolean))
}

// Dates come as Excel day numbers, 12/03/1985, 1985-03-12 or 12 Mar 1985 (Indian day-first order).
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
export function parseDate(s) {
  s = String(s || '').trim()
  if (!s) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const ok = (y, m, d) => (y > 1900 && y <= new Date().getFullYear() && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : '')
  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 86400000)
    return ok(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
  }
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return ok(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/)
  if (m) return ok(+m[3] < 100 ? 1900 + +m[3] : +m[3], +m[2], +m[1])
  m = s.match(/^(\d{1,2})[-/ ]([a-z]{3})[a-z]*[-/ ,]+(\d{4})/i)
  if (m) return ok(+m[3], MON.indexOf(m[2].toLowerCase()) + 1, +m[1])
  return ''
}

// "B Positive", "b+ve", "O NEG" -> B+, O-
function bloodGroup(s) {
  const m = String(s || '').toUpperCase().replace(/\s+/g, '').match(/^(AB|A|B|O)(\+|-|POS|NEG|\(\+\)|\(-\))/)
  return m ? m[1] + (/[+P]/.test(m[2]) ? '+' : '-') : ''
}

function mapHeads(head) {
  const idx = {}
  const used = new Set()
  for (const [k, res] of FIELDS) {
    for (const re of res) {
      const i = head.findIndex((h, j) => !used.has(j) && re.test(String(h).trim()))
      if (i >= 0) { idx[k] = i; used.add(i); break }
    }
  }
  return idx
}

export function parseGrid(grid) {
  if (!grid.length) return []
  // Some exports start with a title or the clinic name: the heading row is the first one with a name column.
  let h = grid.slice(0, 10).findIndex((r) => { const m = mapHeads(r); return (m.name >= 0 || m.first >= 0) && Object.keys(m).length >= 2 })
  let idx
  if (h >= 0) idx = mapHeads(grid[h])
  else { h = -1; idx = { name: 0, phone: 1, age: 2, gender: 3, address: 4, opdNo: 5 } }
  return grid.slice(h + 1).map((c) => {
    const get = (k) => (idx[k] >= 0 ? String(c[idx[k]] ?? '').trim() : '')
    const name = get('name') || [get('first'), get('last')].filter(Boolean).join(' ')
    const phone = get('phone').split(/[,/]/)[0].replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '')
    const g = get('gender').toUpperCase()[0] || ''
    const dob = parseDate(get('dob'))
    return {
      name, phone, dob, ageYears: dob ? '' : get('age').replace(/\.\d+/, '').replace(/\D/g, '').slice(0, 3),
      gender: ['M', 'F', 'O'].includes(g) ? g : '', address: get('address'), opdNo: get('opdNo'),
      email: /\S+@\S+\.\S+/.test(get('email')) ? get('email') : '', blood: bloodGroup(get('blood')),
      allergies: get('allergies'), conditions: get('conditions'), abha: get('abha'),
    }
  })
}
export const parseRows = (text) => parseGrid(textGrid(text))

const key = (phone, name) => `${phone}|${String(name || '').trim().toLowerCase().split(/\s+/)[0]}`
const SAMPLE = 'Patient Name,Mobile,Age,Gender,Date of Birth,Email,Address,Patient ID,Blood Group,Allergies\nVimla Suryavanshi,7898164912,27,F,,,Rogda,25887/O,B+,\nRamesh Sahu,9826012345,,Male,14/08/1971,ramesh@example.com,Raipur,HP-1042,O+,Penicillin\n'

export function ImportPatients({ onClose }) {
  const { tid, list } = useTenant()
  const [grid, setGrid] = useState(null)
  const [text, setText] = useState('')
  const [file, setFile] = useState('')
  const [busy, setBusy] = useState('')
  const rows = grid ? parseGrid(grid) : parseRows(text)
  const have = new Set(list('patients').map((p) => key((p.phone || '').replace(/\D/g, '').slice(-10), p.name)))
  const seen = new Set()
  const checked = rows.map((r) => {
    let why = ''
    const k = key(r.phone, r.name)
    if (!r.name) why = 'No name'
    else if (!/^[6-9]\d{9}$/.test(r.phone)) why = 'No valid mobile'
    else if (have.has(k)) why = 'Already registered'
    else if (seen.has(k)) why = 'Repeated in the list'
    seen.add(k)
    return { ...r, why }
  })
  const ok = checked.filter((r) => !r.why)

  const pick = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      if (/\.xls$/i.test(f.name)) throw new Error('This is an old Excel file (.xls). Open it in Excel and save it as .xlsx or CSV, then choose it again.')
      if (/\.xlsx$/i.test(f.name) || f.type.includes('spreadsheetml')) { setGrid(await xlsxGrid(await f.arrayBuffer())); setText('') }
      else { setGrid(null); setText(await f.text()) }
      setFile(f.name)
    } catch (x) {
      toast(x.message || 'Could not read this file.')
    }
  }
  const sample = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([SAMPLE], { type: 'text/csv' }))
    a.download = 'patients-sample.csv'
    a.click()
  }
  const add = async () => {
    const recs = ok.map((r) => {
      const rec = { name: r.name, phone: r.phone, gender: r.gender, address: r.address, opdNo: r.opdNo, regDate: today(), source: file ? `import: ${file}` : 'register import' }
      for (const k of ['email', 'blood', 'allergies', 'conditions', 'abha']) if (r[k]) rec[k] = r[k]
      if (r.dob) rec.dob = r.dob
      else if (r.ageYears) { rec.dob = `${new Date().getFullYear() - +r.ageYears}-01-01`; rec.dobApprox = true }
      return rec
    })
    setBusy(`Adding 0 of ${recs.length}…`)
    let n = 0
    try {
      const o = offline.info(tid)
      if (db.onServer(tid) && !o.offline && !o.pending) {
        await server.addMany(tid, 'patients', recs, (k) => { n = k; setBusy(`Adding ${k} of ${recs.length}…`) })
      } else {
        for (const rec of recs) { db.add(tid, 'patients', rec); n++ }
      }
      toast(`${n} patients added`)
      onClose()
    } catch (x) {
      toast(`${n} added, then stopped: ${x.message}`)
      setBusy('')
    }
  }

  const SHOW = 200
  return (
    <Modal wide title="Import patients" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn primary" disabled={!ok.length || !!busy} onClick={add}><Check /> {busy || `Add ${ok.length} patient${ok.length === 1 ? '' : 's'}`}</button>
    </>}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Moving from HealthPlix, Practo or another software? Export your patient list to Excel or CSV there, then choose the file here. Columns are matched by their headings (name, mobile, age or date of birth, sex, address, patient ID, email, blood group, allergies).
      </p>
      <div className="row">
        <label className="btn"><FileUp /> Choose Excel or CSV file<input type="file" accept=".xlsx,.xls,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={pick} /></label>
        <button className="btn ghost" onClick={sample}><Download /> Sample file</button>
        {file && <span className="small"><strong>{file}</strong> · {rows.length} rows</span>}
      </div>
      {!grid && <>
        <span className="small muted">Or paste rows below: Name, Mobile, Age, Sex, Address, OPD no.</span>
        <textarea className="input" rows={5} value={text} onChange={(e) => { setText(e.target.value); setFile('') }} placeholder={'Name,Mobile,Age,Gender,Address,OPD No\nVimla Suryavanshi,7898164912,27,F,Rogda,25887/O'} aria-label="Patient rows" />
      </>}
      {grid && <button className="btn ghost sm" onClick={() => { setGrid(null); setFile('') }}>Clear file</button>}
      {checked.length > 0 && (
        <>
          <p className="small"><strong>{ok.length}</strong> will be added · {checked.length - ok.length} left out{checked.length > SHOW ? ` · showing the first ${SHOW} rows` : ''}</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Mobile</th><th>Age / DOB / Sex</th><th>Address</th><th>Patient ID</th><th /></tr></thead>
              <tbody>
                {checked.slice(0, SHOW).map((r, i) => (
                  <tr key={i} style={r.why ? { opacity: 0.5 } : undefined}>
                    <td className="cell-main">{r.name || '–'}{r.email && <div className="cell-sub">{r.email}</div>}</td><td className="tabular">{r.phone || '–'}</td>
                    <td>{r.dob || r.ageYears || '–'} / {r.gender || '–'}{r.blood && ` · ${r.blood}`}</td><td>{r.address}</td><td>{r.opdNo}</td>
                    <td>{r.why ? <span className="pill bad">{r.why}</span> : <span className="pill ok">Will add</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  )
}
