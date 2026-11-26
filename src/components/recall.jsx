import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, CalendarPlus, Check, BellRing } from 'lucide-react'
import { useTenant, Card, Table, toast } from './ui'
import { whatsappLink } from './videos'
import { BookAppointment } from './forms'
import { db } from '../lib/store'
import { SITES } from '../lib/sites'
import { today, addDays, fmtDate, daysBetween } from '../lib/utils'

// Check-up recall: patients whose last visit was 6 months (or a year) ago and who have nothing booked.
// One tap sends a Hindi + English WhatsApp invite; "Reminded" is saved on the patient so the front desk
// does not message the same person twice in a month. Repeat check-ups and cleanings are a large part of
// a dental clinic's income, so this list is worth a few minutes every morning.

const months = (d) => Math.max(1, Math.round(d / 30.4))

export function recallText(tenant, p, lastDate) {
  const site = SITES[tenant.slug]
  const clinic = site?.name || tenant.name
  const first = (p.name || '').split(' ')[0]
  const n = months(daysBetween(lastDate, today()))
  const dental = /dental/i.test(tenant.kind || '')
  const en = dental
    ? `Hello ${first}, it has been ${n} months since your last dental visit at ${clinic}. A check-up and cleaning every 6 months keeps teeth and gums healthy and catches small problems early.`
    : `Hello ${first}, it has been ${n} months since your last visit at ${clinic}. It is a good time for your routine check-up.`
  const hi = dental
    ? `नमस्ते ${first}, ${clinic} में आपकी पिछली जाँच को ${n} महीने हो गए हैं। हर 6 महीने में दाँतों की जाँच और सफ़ाई से दाँत और मसूड़े स्वस्थ रहते हैं।`
    : `नमस्ते ${first}, ${clinic} में आपकी पिछली जाँच को ${n} महीने हो गए हैं। अब रूटीन जाँच का सही समय है।`
  const tail = [site?.address ? `📍 ${site.address}` : '', site?.phone ? `📞 ${site.phone}` : '', 'Reply with a day and time that suits you. जो दिन और समय ठीक हो, जवाब में बताएँ।'].filter(Boolean).join('\n')
  return `${en}\n${hi}\n\n${tail}`
}

export function useRecall(every = 180) {
  const { list } = useTenant()
  const appts = list('appointments')
  const patients = list('patients')
  return useMemo(() => {
    const t = today()
    const last = {}
    const booked = new Set()
    appts.forEach((a) => {
      if (a.status === 'completed' && (!last[a.patientId] || a.date > last[a.patientId].date)) last[a.patientId] = a
      if (a.status === 'scheduled' && a.date >= t) booked.add(a.patientId)
    })
    return patients
      .filter((p) => last[p.id] && !booked.has(p.id) && daysBetween(last[p.id].date, t) >= every)
      .map((p) => ({ p, a: last[p.id], days: daysBetween(last[p.id].date, t), reminded: p.recallAt && p.recallAt >= addDays(t, -30) ? p.recallAt : null }))
      .sort((x, y) => (!!x.reminded - !!y.reminded) || y.days - x.days)
  }, [appts, patients, every])
}

export function RecallBoard() {
  const { tenant, tid, base, user } = useTenant()
  const nav = useNavigate()
  const [every, setEvery] = useState(180)
  const [book, setBook] = useState(null)
  const rows = useRecall(every)
  const open = rows.filter((r) => !r.reminded).length
  const sent = (p) => db.update(tid, 'patients', p.id, { recallAt: today() })

  return (
    <>
      <Card title={`Check-ups due · ${open} to invite${rows.length - open ? `, ${rows.length - open} reminded this month` : ''}`}
        actions={(
          <div className="seg" role="radiogroup" aria-label="Last visit more than">
            {[[180, '6 months'], [365, '1 year']].map(([v, l]) => <button key={v} role="radio" aria-checked={every === v} className={every === v ? 'on' : ''} onClick={() => setEvery(v)}>{l}+</button>)}
          </div>
        )}>
        <p className="small muted" style={{ margin: '0 16px 10px' }}>
          Patients whose last visit was {every === 180 ? '6 months' : 'a year'} or more ago and who have nothing booked. Send the invite, then book when they reply.
        </p>
        <Table
          rows={rows}
          empty="Nobody is due for a check-up. Patients appear here 6 months after their last visit."
          cols={[
            { label: 'Patient', render: ({ p }) => <><a href="#" className="cell-main" onClick={(e) => { e.preventDefault(); nav(`${base}/patients/${p.id}`) }}>{p.name}</a><div className="cell-sub">{p.id} · {p.phone || 'no mobile'}</div></> },
            { label: 'Last visit', render: ({ a, days }) => <><div>{fmtDate(a.date)}</div><div className="cell-sub">{months(days)} months ago</div></> },
            { label: 'Last treatment', render: ({ a }) => <span className="cell-sub" style={{ whiteSpace: 'normal' }}>{a.procedure || a.reason || 'Consultation'}</span> },
            { label: 'Status', render: ({ reminded }) => reminded ? <span className="pill ok"><Check size={12} /> Reminded {fmtDate(reminded)}</span> : <span className="pill warn">Due</span> },
            {
              label: '', render: ({ p, a }) => (
                <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                  {/^\d{10}$/.test(p.phone || '') && (
                    <a className="btn sm primary" href={whatsappLink(p.phone, recallText(tenant, p, a.date))} target="_blank" rel="noreferrer" onClick={() => { sent(p); toast(`Invite opened for ${p.name.split(' ')[0]}. Marked as reminded.`) }}>
                      <MessageCircle /> Invite
                    </a>
                  )}
                  <button className="btn sm" onClick={() => setBook(p.id)}><CalendarPlus /> Book</button>
                  {user.role !== 'patient' && <button className="btn sm ghost" title="Mark as reminded (called or messaged another way)" onClick={() => { sent(p); toast('Marked as reminded') }}><BellRing /></button>}
                </div>
              ),
            },
          ]}
        />
      </Card>
      {book && <BookAppointment patientId={book} onClose={() => setBook(null)} />}
    </>
  )
}
