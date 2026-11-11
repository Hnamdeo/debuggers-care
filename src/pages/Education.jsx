import { useState } from 'react'
import { PlayCircle, Plus } from 'lucide-react'
import { useTenant, PageHead, Modal, Input, SearchBox, toast } from '../components/ui'
import { VideoPlayer, youtubeId } from '../components/videos'
import { db } from '../lib/store'
import { today } from '../lib/utils'

export default function Education() {
  const { list } = useTenant()
  const [q, setQ] = useState('')
  const [spec, setSpec] = useState('All')
  const [play, setPlay] = useState(null)
  const [adding, setAdding] = useState(false)
  const videos = list('videos')
  const specs = ['All', ...new Set(videos.map((v) => v.speciality))]
  const shares = list('shares')
  const rows = videos
    .filter((v) => spec === 'All' || v.speciality === spec)
    .filter((v) => !q || `${v.title} ${v.procedure}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHead title="Patient education" sub="Short videos doctors show during consultation and share to the patient’s record">
        <SearchBox value={q} onChange={setQ} placeholder="Treatment or topic" />
        <button className="btn primary" onClick={() => setAdding(true)}><Plus /> Add video</button>
      </PageHead>
      <div className="row" style={{ gap: 6 }}>
        {specs.map((s) => <button key={s} className={`btn sm ${spec === s ? 'primary' : ''}`} onClick={() => setSpec(s)}>{s}</button>)}
      </div>
      <div className="video-grid">
        {rows.map((v) => {
          const id = youtubeId(v.url)
          const n = shares.filter((s) => s.videoId === v.id).length
          return (
            <button key={v.id} className="video-card" onClick={() => setPlay(v)}>
              <div className="thumb" style={id ? { backgroundImage: `url(https://i.ytimg.com/vi/${id}/mqdefault.jpg)` } : undefined}>
                <PlayCircle size={34} />
                <span className="dur">{v.minutes} min</span>
              </div>
              <div className="stack" style={{ gap: 2, padding: '10px 12px' }}>
                <strong style={{ lineHeight: 1.3 }}>{v.title}</strong>
                <span className="small muted">{v.speciality} · {v.procedure}</span>
                <span className="small faint">{n ? `Shared with ${n} ${n === 1 ? 'patient' : 'patients'}` : 'Not shared yet'}</span>
              </div>
            </button>
          )
        })}
      </div>
      {!rows.length && <div className="empty">No videos match. Add one with “Add video”.</div>}
      {play && <VideoPlayer video={play} onClose={() => setPlay(null)} />}
      {adding && <AddVideo onClose={() => setAdding(false)} specs={specs.filter((s) => s !== 'All')} />}
    </>
  )
}

function AddVideo({ onClose, specs }) {
  const { tid } = useTenant()
  const [f, setF] = useState({ title: '', procedure: '', speciality: specs[0] || 'General Medicine', url: '', minutes: 3 })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const ok = f.title.trim() && /^https?:\/\//.test(f.url)
  const save = () => {
    if (!ok) return
    db.add(tid, 'videos', { ...f, minutes: +f.minutes || 3, source: youtubeId(f.url) ? 'YouTube' : 'Link', addedOn: today() })
    toast('Video added to the library')
    onClose()
  }
  return (
    <Modal title="Add video" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!ok} onClick={save}>Add to library</button></>}>
      <Input id="vd-title" label="Title patients will see" value={f.title} onChange={set('title')} placeholder="e.g. Root canal treatment, step by step" />
      <Input id="vd-url" label="YouTube or video link" value={f.url} onChange={set('url')} placeholder="https://youtu.be/..." />
      <div className="grid g3">
        <Input id="vd-proc" label="Treatment" value={f.procedure} onChange={set('procedure')} />
        <Input id="vd-spec" label="Speciality" list="vd-specs" value={f.speciality} onChange={set('speciality')} />
        <Input id="vd-min" label="Length (min)" type="number" min="1" value={f.minutes} onChange={set('minutes')} />
      </div>
      <datalist id="vd-specs">{specs.map((s) => <option key={s} value={s} />)}</datalist>
      <span className="small muted">Tip: Debuggers Space can make branded AI explainer videos in the doctor’s own voice and add them here.</span>
    </Modal>
  )
}
