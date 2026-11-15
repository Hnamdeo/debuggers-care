// Sticky notes: quick reminders a doctor (or the front desk) jots down and keeps in view.
// A note is private to whoever wrote it, unless it is shared with the whole clinic team.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { StickyNote, Plus, Pin, PinOff, Trash2, Check, Users, X, Undo2 } from 'lucide-react'
import { db } from '../lib/store'
import { useTenant, toast } from './ui'
import { fmtDate, today } from '../lib/utils'

export const NOTE_COLORS = ['sun', 'mint', 'sky', 'rose', 'lilac']

export function useNotes() {
  const { list, user } = useTenant()
  return list('notes')
    .filter((n) => !n.deleted && (n.ownerId === user.id || n.forAll))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.done ? 1 : 0) - (b.done ? 1 : 0) || (b.at || '').localeCompare(a.at || ''))
}

function NoteComposer({ onDone, autoFocus }) {
  const { tid, user } = useTenant()
  const [text, setText] = useState('')
  const [color, setColor] = useState('sun')
  const [forAll, setForAll] = useState(false)
  const save = () => {
    if (!text.trim()) return
    db.add(tid, 'notes', { text: text.trim(), color, forAll, ownerId: user.id, by: user.name || '', at: new Date().toISOString(), date: today(), pinned: false, done: false })
    setText('')
    onDone?.()
  }
  return (
    <div className={`note note-new c-${color}`}>
      <textarea
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save() }}
        placeholder="Write a note… e.g. Call Mr. Sharma about crown fitting"
        rows={3}
        aria-label="New note"
      />
      <div className="note-bar">
        <span className="note-colors" role="radiogroup" aria-label="Note colour">
          {NOTE_COLORS.map((c) => <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} className={`dot c-${c} ${color === c ? 'on' : ''}`} onClick={() => setColor(c)} />)}
        </span>
        <label className="note-share" title="Everyone at the clinic sees it">
          <input type="checkbox" checked={forAll} onChange={(e) => setForAll(e.target.checked)} /> <Users size={13} /> Team
        </label>
        <button className="btn sm primary" disabled={!text.trim()} onClick={save}><Plus /> Stick it</button>
      </div>
    </div>
  )
}

function Note({ n, i }) {
  const { tid, user } = useTenant()
  const mine = n.ownerId === user.id
  const [edit, setEdit] = useState(false)
  const [text, setText] = useState(n.text)
  const upd = (patch) => db.update(tid, 'notes', n.id, patch)
  const remove = () => {
    upd({ deleted: true })
    toast('Note removed')
  }
  return (
    <div className={`note c-${n.color || 'sun'} ${n.done ? 'done' : ''} ${n.pinned ? 'pinned' : ''}`} style={{ '--tilt': `${((i * 37) % 5) - 2}deg`, animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
      {n.pinned && <span className="note-pin" aria-hidden="true" />}
      {edit ? (
        <textarea autoFocus value={text} rows={3} onChange={(e) => setText(e.target.value)} onBlur={() => { setEdit(false); if (text.trim() && text !== n.text) upd({ text: text.trim() }) }} aria-label="Edit note" />
      ) : (
        <p onDoubleClick={() => mine && setEdit(true)} title={mine ? 'Double-click to edit' : undefined}>{n.text}</p>
      )}
      <div className="note-meta small">
        <span>{n.forAll ? <><Users size={12} /> {mine ? 'Team' : n.by || 'Team'}</> : 'Only me'} · {fmtDate(n.date || (n.at || '').slice(0, 10))}</span>
        <span className="note-acts">
          <button className="ic" onClick={() => upd({ done: !n.done })} aria-label={n.done ? 'Mark not done' : 'Mark done'} title={n.done ? 'Not done' : 'Done'}>{n.done ? <Undo2 /> : <Check />}</button>
          <button className="ic" onClick={() => upd({ pinned: !n.pinned })} aria-label={n.pinned ? 'Unpin' : 'Pin'} title={n.pinned ? 'Unpin' : 'Pin to top'}>{n.pinned ? <PinOff /> : <Pin />}</button>
          {mine && <button className="ic" onClick={remove} aria-label="Delete note" title="Delete"><Trash2 /></button>}
        </span>
      </div>
    </div>
  )
}

export function NotesBoard({ limit }) {
  const notes = useNotes()
  const shown = limit ? notes.slice(0, limit) : notes
  return (
    <div className="notes-board">
      <NoteComposer />
      {shown.map((n, i) => <Note key={n.id} n={n} i={i} />)}
    </div>
  )
}

// Dashboard section.
export function NotesCard() {
  const notes = useNotes()
  const open = notes.filter((n) => !n.done).length
  return (
    <section className="card notes-card">
      <div className="card-head">
        <h2 className="row" style={{ gap: 8 }}><StickyNote size={18} className="notes-ic" /> My sticky notes</h2>
        <span className="small muted">{open ? `${open} to remember` : 'All clear'}</span>
      </div>
      <div className="card-body"><NotesBoard limit={11} /></div>
    </section>
  )
}

// Floating button on every staff screen: notes are one tap away, even mid-consultation.
export function NotesFab() {
  const notes = useNotes()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const count = notes.filter((n) => !n.done).length
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])
  return (
    <>
      <button className="notes-fab" onClick={() => setOpen(true)} aria-label={`Sticky notes${count ? `, ${count} open` : ''}`} title="Sticky notes">
        <StickyNote />
        {count > 0 && <span className="notes-fab-n">{count}</span>}
      </button>
      {open && createPortal(
        <div className="drawer-scrim" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <aside className="notes-drawer" ref={ref} role="dialog" aria-modal="true" aria-label="Sticky notes">
            <div className="row between" style={{ marginBottom: 12 }}>
              <h2 className="row" style={{ gap: 8 }}><StickyNote size={18} className="notes-ic" /> Sticky notes</h2>
              <button className="btn ghost sm" onClick={() => setOpen(false)} aria-label="Close"><X /></button>
            </div>
            <NotesBoard />
          </aside>
        </div>,
        document.getElementById('tenant-root') || document.body,
      )}
    </>
  )
}
