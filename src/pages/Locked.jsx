import { Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PLANS, MODULES, planFor } from '../lib/plans'
import { useTenant } from '../components/ui'

export default function Locked({ mod }) {
  const { tenant, user, base } = useTenant()
  const nav = useNavigate()
  const need = PLANS[planFor(mod)]
  return (
    <div className="card locked-page">
      <div className="stack">
        <span className="brand-mark"><Lock /></span>
        <h2>{MODULES[mod].label} is on the {need.name} plan</h2>
        <p className="muted" style={{ margin: 0 }}>
          {tenant.name} is on the {PLANS[tenant.plan].name} plan. Upgrading switches this module on straight away, and all your patients,
          appointments and bills stay as they are.
        </p>
        {user.role === 'admin' && <button className="btn primary" onClick={() => nav(`${base}/settings`)}>See plans</button>}
      </div>
    </div>
  )
}
