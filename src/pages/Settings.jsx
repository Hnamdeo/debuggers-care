import { tenantHost } from '../lib/plans'
import { Check, Lock } from 'lucide-react'
import { useTenant, PageHead, Card, toast } from '../components/ui'
import { db } from '../lib/store'
import { PLANS, PLAN_ORDER, MODULES } from '../lib/plans'

export default function Settings() {
  const { tenant, tid } = useTenant()
  const switchTo = (p) => {
    db.updateTenant(tid, { plan: p })
    toast(`${tenant.name} is now on the ${PLANS[p].name} plan`)
  }
  return (
    <>
      <PageHead title="Plan & settings" sub="Switch plans any time. Records are never moved or lost." />
      <div className="grid g3">
        {PLAN_ORDER.map((p) => {
          const P = PLANS[p]
          const current = tenant.plan === p
          return (
            <div key={p} className={`plan-col ${current ? 'current' : ''}`}>
              <div className="row between"><h3>{P.name}</h3>{current && <span className="pill brand plain">Current plan</span>}</div>
              <div><span className="price">₹{P.price.toLocaleString('en-IN')}</span> <span className="muted small">/ month, indicative</span></div>
              <p className="muted small" style={{ margin: 0 }}>{P.blurb}</p>
              <div className="stack" style={{ gap: 4 }}>
                {Object.keys(MODULES).filter((m) => m !== 'dashboard').map((m) => (
                  <span key={m} className="small row" style={{ gap: 6, color: P.modules.includes(m) ? 'var(--fg)' : 'var(--faint)' }}>
                    {P.modules.includes(m) ? <Check size={13} color="var(--ok)" /> : <Lock size={12} />} {MODULES[m].label}
                  </span>
                ))}
                <span className="small muted">{P.maxDoctors === Infinity ? 'Unlimited doctors' : `Up to ${P.maxDoctors} doctors`}</span>
              </div>
              {!current && <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => switchTo(p)}>{PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(tenant.plan) ? 'Upgrade' : 'Switch'} to {P.name}</button>}
            </div>
          )
        })}
      </div>
      <Card title="Clinic details">
        <dl className="kv">
          <dt>Name</dt><dd>{tenant.name}</dd>
          <dt>Type</dt><dd>{tenant.kind}</dd>
          <dt>Web address</dt><dd>{tenantHost(tenant.slug)}</dd>
          <dt>Address</dt><dd>{tenant.address}</dd>
          <dt>Phone</dt><dd>{tenant.phone}</dd>
          <dt>GSTIN</dt><dd>{tenant.gstin}</dd>
          <dt>Registration</dt><dd>{tenant.regNo}</dd>
          <dt>Tenant ID</dt><dd className="tabular">{tenant.id}</dd>
        </dl>
      </Card>
    </>
  )
}
