import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, MessageCircle, ExternalLink } from 'lucide-react'
import { Modal, useTenant, toast } from './ui'

export const registerLink = (slug) => `${window.location.origin}${window.location.pathname}#/t/${slug}/register`

// QR code for the reception desk plus a link to send on WhatsApp.
export default function RegisterQR({ onClose }) {
  const { tenant } = useTenant()
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
    <Modal title="Patient self-registration" onClose={onClose} footer={<button className="btn primary" onClick={onClose}>Done</button>}>
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
      <span className="small muted">Tip: print the QR and stick it at reception. In this demo, registrations save on the device that fills the form; once the clinic is live they reach the clinic instantly.</span>
    </Modal>
  )
}
