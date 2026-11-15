// Clinic expenses: rent, salaries, lab bills, materials… and what is left after them each month.
import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, IndianRupee, TrendingDown, Wallet, PieChart, Trash2 } from 'lucide-react'
import { useTenant, PageHead, Card, Stat, Modal, Input, Select, Table, toast } from '../components/ui'
import { db } from '../lib/store'
import { today, fmtDate, fmtMonth, money, billTotal } from '../lib/utils'

export const EXPENSE_TYPES = ['Rent', 'Salaries', 'Dental lab', 'Materials & supplies', 'Medicines', 'Equipment', 'Electricity & water', 'Internet & phone', 'Marketing', 'Maintenance', 'Other']

const shiftYM = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

export default function Expenses() {
  const { tid, list } = useTenant()
  const [ym, setYm] = useState(today().slice(0, 7))
  const [add, setAdd] = useState(false)
  const rows = list('expenses').filter((e) => !e.deleted && e.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const spent = rows.reduce((s, e) => s + +e.amount, 0)
  const bills = list('bills').filter((b) => b.date.startsWith(ym))
  const income = bills.reduce((s, b) => s + Math.min(+b.paid || 0, billTotal(b)), 0)
  const byType = Object.entries(rows.reduce((m, e) => ({ ...m, [e.category]: (m[e.category] || 0) + +e.amount }), {})).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...byType.map(([, v]) => v))
  const prev = list('expenses').filter((e) => !e.deleted && e.date.startsWith(shiftYM(ym, -1))).reduce((s, e) => s + +e.amount, 0)
  const remove = (e) => { db.update(tid, 'expenses', e.id, { deleted: true }); toast(`${e.category} ${money(e.amount)} removed`) }
  return (
    <>
      <PageHead title="Expenses" sub="What the clinic spends, and what is left from the income">
        <button className="btn primary" onClick={() => setAdd(true)}><Plus /> Add expense</button>
      </PageHead>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn sm" onClick={() => setYm(shiftYM(ym, -1))} aria-label="Previous month"><ChevronLeft /></button>
        <strong style={{ minWidth: 100, textAlign: 'center' }}>{fmtMonth(ym)}</strong>
        <button className="btn sm" onClick={() => setYm(shiftYM(ym, 1))} aria-label="Next month" disabled={ym >= today().slice(0, 7)}><ChevronRight /></button>
      </div>
      <div className="grid g4">
        <Stat label="Money received" value={money(income)} sub={`${bills.length} bills`} icon={IndianRupee} />
        <Stat label="Expenses" value={money(spent)} sub={prev ? `${spent >= prev ? 'Up' : 'Down'} ${money(Math.abs(spent - prev))} from last month` : `${rows.length} entries`} icon={TrendingDown} />
        <Stat label={income - spent >= 0 ? 'Left after expenses' : 'Short this month'} value={money(Math.abs(income - spent))} sub={income ? `${Math.round(((income - spent) / income) * 100)}% of income` : ''} icon={Wallet} />
        <Stat label="Biggest expense" value={byType[0]?.[0] || '–'} sub={byType[0] ? money(byType[0][1]) : ''} icon={PieChart} />
      </div>
      <div className="grid g2-1">
        <Card title={<h2>All expenses</h2>}>
          <Table rows={rows} empty="No expenses in this month yet. Add rent, salaries, lab bills and materials to see your real profit." cols={[
            { label: 'Date', render: (e) => fmtDate(e.date) },
            { label: 'Expense', render: (e) => <><div className="cell-main">{e.category}</div>{(e.paidTo || e.note) && <div className="cell-sub">{[e.paidTo, e.note].filter(Boolean).join(' · ')}</div>}</> },
            { label: 'Paid by', key: 'mode' },
            { label: 'Amount', num: true, render: (e) => money(e.amount) },
            { label: '', render: (e) => <button className="btn ghost sm" aria-label="Remove" title="Remove" onClick={() => remove(e)}><Trash2 /></button> },
          ]} />
        </Card>
        <Card title={<h2>Where the money went</h2>}>
          {byType.length ? (
            <div className="ex-bars">
              {byType.map(([k, v]) => (
                <div key={k} className="ex-bar">
                  <div className="row between small"><span>{k}</span><b className="tabular">{money(v)}</b></div>
                  <div className="ex-track"><i style={{ width: `${(v / max) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          ) : <div className="muted small">Nothing yet.</div>}
        </Card>
      </div>
      {add && <ExpenseForm onClose={() => setAdd(false)} />}
    </>
  )
}

function ExpenseForm({ onClose }) {
  const { tid } = useTenant()
  const [f, setF] = useState({ date: today(), category: 'Materials & supplies', amount: '', paidTo: '', mode: 'UPI', note: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    if (!(+f.amount > 0)) return toast('Enter the amount')
    db.add(tid, 'expenses', { ...f, amount: +f.amount })
    toast(`${f.category} ${money(f.amount)} added`)
    onClose()
  }
  return (
    <Modal title="Add expense" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
      <div className="dc-chips">{EXPENSE_TYPES.map((t) => <button key={t} type="button" className={`qchip ${f.category === t ? 'on' : ''}`} onClick={() => setF({ ...f, category: t })}>{t}</button>)}</div>
      <div className="grid g2">
        <Input id="ex-amt" label="Amount (₹)" type="number" min="0" inputMode="numeric" value={f.amount} onChange={set('amount')} autoFocus />
        <Input id="ex-date" label="Date" type="date" max={today()} value={f.date} onChange={set('date')} />
        <Input id="ex-to" label="Paid to (optional)" value={f.paidTo} onChange={set('paidTo')} placeholder="e.g. Shree Dental Lab" />
        <Select id="ex-mode" label="Paid by" value={f.mode} onChange={set('mode')} options={['UPI', 'Cash', 'Card', 'Bank transfer', 'Cheque']} />
      </div>
      <Input id="ex-note" label="Note (optional)" value={f.note} onChange={set('note')} placeholder="e.g. 2 crowns for P-1012" />
    </Modal>
  )
}
