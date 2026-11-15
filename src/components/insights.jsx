// Smart insights: the clinic's own records read back as a few plain, useful nudges.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, UserX, BellRing, Clock, ClipboardList, CalendarClock, TrendingUp } from 'lucide-react'
import { useTenant } from './ui'
import { BookAppointment } from './forms'
import { RemindModal } from './reminders'
import { today, addDays, fmtDate } from '../lib/utils'

const hourText = (h) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`

export function InsightsCard({ doctorId }) {
  const { list, patient, base } = useTenant()
  const nav = useNavigate()
  const [book, setBook] = useState(null)
  const [remind, setRemind] = useState(false)
  const T = today()
  const appts = list('appointments').filter((a) => !doctorId || a.doctorId === doctorId)
  const live = (a) => !['cancelled', 'no-show'].includes(a.status)

  // 1. Follow-ups that slipped: the prescription asked for a next visit, nothing is booked since.
  const latestRx = {}
  list('prescriptions').filter((r) => !doctorId || r.doctorId === doctorId).forEach((r) => {
    if (!latestRx[r.patientId] || r.date > latestRx[r.patientId].date) latestRx[r.patientId] = r
  })
  const missed = Object.values(latestRx)
    .filter((r) => r.nextVisit && r.nextVisit < T && r.nextVisit >= addDays(T, -60))
    .filter((r) => !appts.some((a) => a.patientId === r.patientId && a.date > r.date && live(a)))
    .sort((a, b) => b.nextVisit.localeCompare(a.nextVisit))

  // 2. Tomorrow's patients not reminded yet.
  const tomorrow = appts.filter((a) => a.date === addDays(T, 1) && a.status === 'scheduled')
  const unreminded = tomorrow.filter((a) => !a.remindedAt)

  // 3. Treatment plans with no next appointment.
  const planned = list('patients').filter((p) => p.plan && p.planOn && p.planOn >= addDays(T, -90) && !appts.some((a) => a.patientId === p.id && a.date >= T && live(a)))

  // 4. Busiest hour over the last 30 days.
  const byHour = {}
  appts.filter((a) => a.date >= addDays(T, -30) && a.date <= T && a.time).forEach((a) => { const h = +a.time.slice(0, 2); byHour[h] = (byHour[h] || 0) + 1 })
  const peak = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0]

  // 5. Missed appointments this month, and the week's trend.
  const month = T.slice(0, 7)
  const noShow = appts.filter((a) => a.status === 'no-show' && a.date.startsWith(month)).length
  const week = appts.filter((a) => a.date > addDays(T, -7) && a.date <= T && a.status === 'completed').length
  const prev = appts.filter((a) => a.date > addDays(T, -14) && a.date <= addDays(T, -7) && a.status === 'completed').length

  const items = [
    missed.length > 0 && {
      icon: UserX, tone: 'bad', title: `${missed.length} follow-up${missed.length > 1 ? 's' : ''} missed`,
      text: missed.slice(0, 3).map((r) => `${patient(r.patientId)?.name} (due ${fmtDate(r.nextVisit)})`).join(', ') + (missed.length > 3 ? ` and ${missed.length - 3} more` : ''),
      act: 'Book next', on: () => setBook(missed[0].patientId),
    },
    unreminded.length > 0 && {
      icon: BellRing, tone: 'warn', title: `${unreminded.length} of tomorrow’s patients not reminded`,
      text: 'A reminder today cuts down missed visits.', act: 'Remind now', on: () => setRemind(true),
    },
    planned.length > 0 && {
      icon: ClipboardList, tone: 'info', title: `${planned.length} treatment plan${planned.length > 1 ? 's' : ''} without a next visit`,
      text: planned.slice(0, 3).map((p) => p.name).join(', '), act: 'Book', on: () => setBook(planned[0].id),
    },
    peak && {
      icon: Clock, tone: 'info', title: `Busiest time: ${hourText(+peak[0])} – ${hourText(+peak[0] + 1)}`,
      text: `${peak[1]} patients came in that hour over the last 30 days. Keep the front desk ready then.`,
    },
    {
      icon: TrendingUp, tone: week >= prev ? 'ok' : 'warn', title: `${week} consultations this week`,
      text: prev ? (week === prev ? 'Same as last week.' : `${week > prev ? 'Up' : 'Down'} from ${prev} last week.`) : 'Keep going, the trend shows from next week.',
    },
    noShow > 0 && {
      icon: CalendarClock, tone: 'warn', title: `${noShow} patient${noShow > 1 ? 's' : ''} didn’t come this month`,
      text: 'Turn on automatic WhatsApp reminders in Settings to bring this down.', act: 'Appointments', on: () => nav(`${base}/appointments`),
    },
  ].filter(Boolean).slice(0, 4)

  return (
    <section className="card insights">
      <div className="card-head">
        <h2 className="row" style={{ gap: 10 }}><span className="ins-badge"><Sparkles size={16} /></span> Smart insights</h2>
        <span className="small muted">From your clinic’s records, updated live</span>
      </div>
      <div className="card-body ins-grid">
        {items.map((x, i) => (
          <div key={x.title} className={`ins ins-${x.tone}`} style={{ animationDelay: `${i * 0.07}s` }}>
            <span className="ins-ic"><x.icon size={18} /></span>
            <div className="ins-body">
              <strong>{x.title}</strong>
              <span className="small">{x.text}</span>
              {x.act && <button className="btn sm" onClick={x.on}>{x.act}</button>}
            </div>
          </div>
        ))}
      </div>
      {book && <BookAppointment patientId={book} doctorId={doctorId} onClose={() => setBook(null)} />}
      {remind && <RemindModal appts={unreminded} title="Remind tomorrow’s patients" onClose={() => setRemind(false)} />}
    </section>
  )
}
