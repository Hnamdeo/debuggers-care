import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { Copy, MessageCircle, ExternalLink, Printer, UserPlus } from 'lucide-react'
import { Modal, useTenant, toast } from './ui'
import { PatientForm } from './forms'

export const registerLink = (slug) => `${window.location.origin}${window.location.pathname}#/t/${slug}/register`

// QR code for the reception desk plus a link to send on WhatsApp.
export default function RegisterQR({ onClose }) {
  const { tenant, base } = useTenant()
  const nav = useNavigate()
  const [adding, setAdding] = useState(false)
  const link = registerLink(tenant.slug)
  const [svg, setSvg] = useState('')
  useEffect(() => {
    QRCode.toString(link, { type: 'svg', margin: 1, color: { dark: '#0f1b2a', light: '#ffffff' }, errorCorrectionLevel: 'M' }).then(setSvg)
  }, [link])
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast('Link copied') } catch { toast('Select the link and copy it') }
  }
  const wa = `https://wa.me/?text=${encodeURIComponent(`Please register with ${tenant.name} before your visit, it takes a minute: ${link}`)}`
  return (
    <>
    <Modal title="Patient registration" onClose={onClose} footer={<>
      <button className="btn" onClick={() => window.print()}><Printer /> Print QR poster</button>
      <button className="btn" onClick={() => setAdding(true)}><UserPlus /> Register patient here</button>
      <button className="btn primary" onClick={onClose}>Done</button>
    </>}>
      <p className="muted" style={{ margin: 0 }}>Patients scan this at the front desk, or you send them the link. They answer a few chat questions on their phone and appear in your patient list with a UHID.</p>
      <div className="qr-wrap">
        <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} aria-label="QR code for patient registration" />
        <div className="stack" style={{ gap: 6, minWidth: 0, flex: 1 }}>
          <strong>{tenant.name}</strong>
          <span className="small muted">Scan to register</span>
          <code className="addr small" style={{ overflowWrap: 'anywhere' }}>{link}</code>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn sm" onClick={copy}><Copy /> Copy link</button>
            <a className="btn sm" href={wa} target="_blank" rel="noreferrer"><MessageCircle /> Send on WhatsApp</a>
            <a className="btn sm" href={link} target="_blank" rel="noreferrer"><ExternalLink /> Try it</a>
          </div>
        </div>
      </div>
      <div className="print-area qr-poster print-only">
        <h1>{tenant.name}</h1>
        <p className="qr-poster-hi">नए मरीज़: यह QR स्कैन करके अपना रजिस्ट्रेशन करें</p>
        <p>New patient? Scan this QR with your phone camera to register.</p>
        <div className="qr-poster-code" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="small">Name and mobile number are enough. It takes one minute.</p>
        <code>{link}</code>
      </div>
      <span className="small muted">Tip: print the QR and stick it at reception. {tenant.server ? 'When a patient finishes the chat on their phone, they appear in Today’s visits on the dashboard within a few seconds, ready for vitals.' : 'In this demo, registrations save on the device that fills the form.'}</span>
    </Modal>
    {adding && <PatientForm onClose={() => setAdding(false)} onSaved={(row) => { setAdding(false); onClose(); nav(`${base}/patients/${row.id}`) }} />}
    </>
  )
}
