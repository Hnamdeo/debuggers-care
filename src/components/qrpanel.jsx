// The "let the patient fill it" side of the register popup: QR code, WhatsApp link and a printable poster.
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, MessageCircle, Printer, Smartphone } from 'lucide-react'
import { useTenant, toast } from './ui'
import { whatsappLink } from './videos'

export const registerLink = (slug) => `${window.location.origin}${window.location.pathname}#/t/${slug}/register`

export function QrPanel({ phone }) {
  const { tenant } = useTenant()
  const link = registerLink(tenant.slug)
  const [svg, setSvg] = useState('')
  useEffect(() => {
    QRCode.toString(link, { type: 'svg', margin: 1, color: { dark: '#0f1b2a', light: '#ffffff' }, errorCorrectionLevel: 'M' }).then(setSvg)
  }, [link])
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast('Link copied') } catch { toast('Select the link and copy it') }
  }
  const text = `Please fill your details for ${tenant.name}, it takes a minute: ${link}`
  const wa = /^\d{10}$/.test(phone || '') ? whatsappLink(phone, text) : `https://wa.me/?text=${encodeURIComponent(text)}`
  return (
    <aside className="qr-panel">
      <div className="qr-panel-h"><Smartphone size={16} /> Or let the patient fill it</div>
      <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} aria-label="QR code for patient registration" />
      <span className="small muted" style={{ textAlign: 'center' }}>Patient scans with the phone camera, fills name and mobile, and appears in Today’s visits.</span>
      <a className="btn primary" href={wa} target="_blank" rel="noreferrer"><MessageCircle /> {/^\d{10}$/.test(phone || '') ? `Send form to ${phone}` : 'Send form on WhatsApp'}</a>
      <div className="row" style={{ gap: 6, justifyContent: 'center' }}>
        <a className="btn sm" href={link} target="_blank" rel="noopener noreferrer"><MessageCircle /> Register by AI</a>
        <button className="btn sm" onClick={copy}><Copy /> Copy link</button>
        <button className="btn sm" onClick={() => window.print()}><Printer /> Print QR</button>
      </div>
      <div className="print-area qr-poster print-only">
        <h1>{tenant.name}</h1>
        <p className="qr-poster-hi">नए मरीज़: यह QR स्कैन करके अपना रजिस्ट्रेशन करें</p>
        <p>New patient? Scan this QR with your phone camera to register.</p>
        <div className="qr-poster-code" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="small">Name and mobile number are enough. It takes one minute.</p>
        <code>{link}</code>
      </div>
    </aside>
  )
}
