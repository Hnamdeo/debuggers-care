// AI Smile preview: show a patient how their smile could look after whitening, right on their own photo.
// The instant whitening preview runs on this device. Full AI smile design (shape, gaps, alignment,
// veneers) is the separate paid AI Smile add-on.
import { useEffect, useRef, useState } from 'react'
import { Sparkles, Camera, ImagePlus, Download, RotateCcw, MessageCircle, Wand2, MoveHorizontal } from 'lucide-react'
import { useTenant, PageHead, Card, toast } from '../components/ui'
import { salesWhatsApp } from '../lib/plans'

const MAX = 1200

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('That file is not a picture we can open.'))
    img.src = URL.createObjectURL(file)
  })
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

// Whiten tooth-coloured pixels inside the marked oval: lift brightness and take out the yellow,
// leaving lips and gums (red) and dark gaps alone. Edges fade out so it blends in.
function whiten(src, box, amount, shine) {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height)
  if (!box || box.w < 4 || box.h < 4) return out
  const d = out.data
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const rx = box.w / 2
  const ry = box.h / 2
  const k = amount / 100
  const lift = shine / 100
  const x0 = Math.max(0, Math.floor(box.x))
  const x1 = Math.min(src.width, Math.ceil(box.x + box.w))
  const y0 = Math.max(0, Math.floor(box.y))
  const y1 = Math.min(src.height, Math.ceil(box.y + box.h))
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
      if (e >= 1) continue
      const edge = 1 - smooth(0.7, 1, e)
      const i = (y * src.width + x) * 4
      const r = d[i], g = d[i + 1], b = d[i + 2]
      const Y = 0.299 * r + 0.587 * g + 0.114 * b
      const red = r - (g + b) / 2
      const tooth = smooth(70, 130, Y) * (1 - smooth(28, 55, red))
      const w = tooth * edge * k
      if (w <= 0.001) continue
      const T = Math.min(255, Y * (1 + 0.18 * lift) + 26 * lift)
      // Target: a clean, slightly cool white at the new brightness.
      const tr = T * 0.985, tg = T * 0.995, tb = Math.min(255, T * 1.02)
      d[i] = r + (tr - r) * w
      d[i + 1] = g + (tg - g) * w
      d[i + 2] = b + (tb - b) * w
    }
  }
  return out
}

export default function Smile() {
  const { tenant } = useTenant()
  const pick = useRef(null)
  const cam = useRef(null)
  const canvas = useRef(null)
  const base = useRef(null)
  const [img, setImg] = useState(null)
  const [box, setBox] = useState(null)
  const [drag, setDrag] = useState(null)
  const [amount, setAmount] = useState(70)
  const [shine, setShine] = useState(55)
  const [split, setSplit] = useState(50)
  const [err, setErr] = useState('')

  const choose = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const im = await loadImage(f)
      const s = Math.min(1, MAX / Math.max(im.width, im.height))
      const c = document.createElement('canvas')
      c.width = Math.round(im.width * s)
      c.height = Math.round(im.height * s)
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height)
      base.current = c.getContext('2d').getImageData(0, 0, c.width, c.height)
      setImg({ w: c.width, h: c.height, url: c.toDataURL('image/jpeg', 0.92) })
      // A first guess: the smile is usually in the lower-middle of a face photo.
      setBox({ x: c.width * 0.3, y: c.height * 0.55, w: c.width * 0.4, h: c.height * 0.16 })
      setErr('')
    } catch (x) { setErr(x.message) }
  }

  useEffect(() => {
    if (!img || !canvas.current || !base.current) return
    const c = canvas.current
    c.width = img.w
    c.height = img.h
    const ctx = c.getContext('2d')
    const after = whiten(base.current, box, amount, shine)
    const cut = Math.round((split / 100) * img.w)
    ctx.putImageData(base.current, 0, 0)
    ctx.putImageData(after, 0, 0, cut, 0, img.w - cut, img.h)
  }, [img, box, amount, shine, split])

  const pos = (e) => {
    const r = canvas.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * img.w, y: ((e.clientY - r.top) / r.height) * img.h }
  }
  const down = (e) => { if (!img) return; e.currentTarget.setPointerCapture?.(e.pointerId); const p = pos(e); setDrag(p); setBox({ x: p.x, y: p.y, w: 0, h: 0 }) }
  const move = (e) => {
    if (!drag) return
    const p = pos(e)
    setBox({ x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) })
  }
  const up = () => setDrag(null)

  const download = () => {
    const c = document.createElement('canvas')
    c.width = img.w * 2
    c.height = img.h
    const ctx = c.getContext('2d')
    ctx.putImageData(base.current, 0, 0)
    ctx.putImageData(whiten(base.current, box, amount, shine), img.w, 0)
    ctx.font = `bold ${Math.max(16, img.w / 28)}px sans-serif`
    ctx.fillStyle = 'rgba(0,0,0,.55)'
    ctx.fillRect(0, 0, c.width, Math.max(30, img.w / 18))
    ctx.fillStyle = '#fff'
    ctx.fillText('Before', 14, Math.max(22, img.w / 24))
    ctx.fillText('After (preview)', img.w + 14, Math.max(22, img.w / 24))
    const a = document.createElement('a')
    a.href = c.toDataURL('image/jpeg', 0.92)
    a.download = 'smile-preview.jpg'
    a.click()
    toast('Before and after picture saved')
  }

  const pct = box && img ? { left: `${(box.x / img.w) * 100}%`, top: `${(box.y / img.h) * 100}%`, width: `${(box.w / img.w) * 100}%`, height: `${(box.h / img.h) * 100}%` } : null

  return (
    <>
      <PageHead title={<span className="row" style={{ gap: 10 }}><span className="smile-badge"><Sparkles /></span> AI Smile preview</span>} sub="Show patients their brighter smile before treatment, on their own photo.">
        <button className="btn" onClick={() => cam.current?.click()}><Camera /> Take photo</button>
        <button className="btn primary" onClick={() => pick.current?.click()}><ImagePlus /> Choose photo</button>
      </PageHead>
      <input ref={pick} type="file" accept="image/*" hidden onChange={choose} />
      <input ref={cam} type="file" accept="image/*" capture="user" hidden onChange={choose} />
      {err && <div style={{ color: 'var(--bad)' }}>{err}</div>}
      <div className="grid smile-grid">
        <Card title={img ? 'Before · After' : 'Patient’s smile photo'} className="smile-stage-card">
          {img ? (
            <div className="smile-stage">
              <div className="smile-canvas-wrap" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
                <canvas ref={canvas} aria-label="Smile preview" />
                {pct && box.w > 2 && <span className="smile-box" style={pct} />}
                <span className="smile-split" style={{ left: `${split}%` }}><MoveHorizontal /></span>
                <span className="smile-tag l">Before</span>
                <span className="smile-tag r">After</span>
              </div>
              <label className="field"><span>Slide to compare</span>
                <input type="range" min="0" max="100" value={split} onChange={(e) => setSplit(+e.target.value)} />
              </label>
            </div>
          ) : (
            <button className="smile-empty" onClick={() => pick.current?.click()}>
              <span className="smile-orb"><Sparkles /></span>
              <strong>Add a smiling photo of the patient</strong>
              <span className="small muted">A clear, front-facing photo with teeth showing works best. It stays on this device.</span>
            </button>
          )}
        </Card>
        <div className="stack">
          <Card title="Adjust">
            <div className="stack">
              <div className="small muted">1. Drag over the teeth on the photo to mark them.<br />2. Set the shade and compare.</div>
              <label className="field"><span>Whitening · {amount}%</span>
                <input type="range" min="0" max="100" value={amount} onChange={(e) => setAmount(+e.target.value)} disabled={!img} />
              </label>
              <label className="field"><span>Brightness · {shine}%</span>
                <input type="range" min="0" max="100" value={shine} onChange={(e) => setShine(+e.target.value)} disabled={!img} />
              </label>
              <div className="row" style={{ gap: 6 }}>
                {[['Natural', 45, 35], ['Bright', 70, 55], ['Hollywood', 95, 85]].map(([l, a, s]) => (
                  <button key={l} className={`btn sm ${amount === a && shine === s ? 'primary' : ''}`} disabled={!img} onClick={() => { setAmount(a); setShine(s) }}>{l}</button>
                ))}
              </div>
              <div className="row">
                <button className="btn" disabled={!img} onClick={download}><Download /> Save before / after</button>
                <button className="btn ghost" disabled={!img} onClick={() => { setAmount(70); setShine(55); setSplit(50) }}><RotateCcw /> Reset</button>
              </div>
            </div>
          </Card>
          <Card className="smile-addon">
            <div className="stack" style={{ gap: 10 }}>
              <span className="row" style={{ gap: 8 }}><Wand2 size={18} /><strong>Full AI smile design</strong><span className="pill info">Add-on</span></span>
              <span className="small">Straighter teeth, closed gaps, new shape for veneers and crowns, made by AI from the patient’s photo. Available as a monthly add-on for {tenant.name}.</span>
              <a className="btn primary" href={salesWhatsApp(`Hi Debuggers Space, ${tenant.name} would like the AI Smile design add-on.`)} target="_blank" rel="noopener noreferrer"><MessageCircle /> Ask to switch it on</a>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
