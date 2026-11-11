import { useState } from 'react'
import { useTenant, PageHead, Card, Table, Pill, Tabs, Modal, Input, Textarea, SearchBox, toast } from '../components/ui'
import { ReportDoc } from '../components/docs'
import { db } from '../lib/store'
import { LAB_CATALOG } from '../lib/seed'
import { fmtDate, today } from '../lib/utils'

export default function Reports() {
  const { list, patient, staff, user, me } = useTenant()
  const [tab, setTab] = useState('ordered')
  const [q, setQ] = useState('')
  const [view, setView] = useState(null)
  const [enter, setEnter] = useState(null)
  const isDoc = user.role === 'doctor'
  const all = list('reports').filter((r) => !isDoc || r.doctorId === me.id)
  const rows = all
    .filter((r) => r.status === tab)
    .filter((r) => !q || `${patient(r.patientId)?.name} ${r.test} ${r.id}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <PageHead title="Lab & reports" sub="Pathology, radiology and ECG reports, linked to each patient">
        <SearchBox value={q} onChange={setQ} placeholder="Patient or test" />
      </PageHead>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'ordered', label: 'Waiting for results', count: all.filter((r) => r.status === 'ordered').length },
        { id: 'completed', label: 'Completed', count: all.filter((r) => r.status === 'completed').length },
      ]} />
      <Card>
        <Table
          rows={rows.slice(0, 150)}
          onRow={(r) => (r.status === 'ordered' && !isDoc ? setEnter(r) : setView(r))}
          empty={tab === 'ordered' ? 'No tests waiting. All results are in.' : 'No completed reports yet.'}
          cols={[
            { label: 'Report', render: (r) => <><div className="cell-main">{r.test}</div><div className="cell-sub">{r.id} · {r.category}</div></> },
            { label: 'Patient', render: (r) => patient(r.patientId)?.name },
            { label: 'Referred by', render: (r) => staff(r.doctorId)?.name },
            { label: 'Ordered', render: (r) => fmtDate(r.date) },
            { label: 'Result', render: (r) => r.status === 'ordered' ? <Pill status="ordered">In lab</Pill> : r.results.some((x) => x.flag) ? <Pill status="red">Abnormal</Pill> : <Pill status="ok">Normal</Pill> },
            { label: '', render: (r) => r.status === 'ordered' && !isDoc ? <button className="btn sm primary">Enter results</button> : <button className="btn sm">View</button> },
          ]}
        />
      </Card>
      {view && <ReportDoc rep={view} onClose={() => setView(null)} />}
      {enter && <EnterResults rep={enter} onClose={() => setEnter(null)} />}
    </>
  )
}

function EnterResults({ rep, onClose }) {
  const { tid, patient } = useTenant()
  const params = LAB_CATALOG[rep.test]?.params || []
  const [vals, setVals] = useState(Object.fromEntries(params.map(([p]) => [p, ''])))
  const [findings, setFindings] = useState('')
  const save = () => {
    const results = params.map(([param, unit, lo, hi]) => {
      const v = parseFloat(vals[param])
      return { param, unit, range: `${lo} - ${hi}`, value: isNaN(v) ? '-' : v, flag: isNaN(v) ? '' : v > hi ? 'High' : v < lo ? 'Low' : '' }
    })
    db.update(tid, 'reports', rep.id, { status: 'completed', results, findings, completedDate: today() })
    toast(`${rep.test} report for ${patient(rep.patientId).name} is ready`)
    onClose()
  }
  return (
    <Modal title={`${rep.test} · ${patient(rep.patientId)?.name}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save and publish report</button></>}>
      {params.map(([p, unit, lo, hi]) => (
        <Input key={p} id={`er-${p}`} label={`${p} (${unit}) · normal ${lo} - ${hi}`} type="number" step="any" value={vals[p]} onChange={(e) => setVals({ ...vals, [p]: e.target.value })} />
      ))}
      <Textarea id="er-findings" label={params.length ? 'Remarks (optional)' : 'Findings'} value={findings} onChange={(e) => setFindings(e.target.value)} />
    </Modal>
  )
}
