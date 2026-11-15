// Animated hero scene for dental clinic front pages: a tilted glowing screen with a rotating
// wireframe tooth that turns into a bright smile and back, a live chart card, tooth record cards and dental tools.
import { useEffect, useState } from 'react'
const TOOTH = 'M116 70 C112 34 146 22 162 40 C174 26 196 26 208 40 C224 22 258 34 254 70 C256 98 246 120 240 140 C234 180 228 222 216 250 C208 264 194 258 194 238 C192 212 188 188 185 176 C182 188 178 212 176 238 C176 258 162 264 154 250 C142 222 136 180 130 140 C124 120 114 98 116 70 Z'

// Mesh lines inside the tooth: rings across, curved meridians down, and diagonals for the triangle look.
const rings = Array.from({ length: 21 }, (_, i) => 26 + i * 12)
const merid = Array.from({ length: 13 }, (_, i) => 110 + i * 13)
const diag = Array.from({ length: 26 }, (_, i) => -140 + i * 22)
const dots = [[150, 60], [185, 52], [222, 66], [140, 104], [176, 96], [210, 110], [236, 92], [150, 146], [196, 140], [226, 150], [160, 196], [208, 192], [166, 236], [204, 232], [128, 84], [244, 126]]

function MeshTooth() {
  return (
    <svg className="dsx-tooth" viewBox="90 10 190 270" aria-hidden="true">
      <defs>
        <clipPath id="dsxClip"><path d={TOOTH} /></clipPath>
        <radialGradient id="dsxFill" cx=".5" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity=".04" />
        </radialGradient>
        <filter id="dsxGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={TOOTH} fill="url(#dsxFill)" />
      <g clipPath="url(#dsxClip)" className="dsx-mesh">
        {rings.map((y) => <path key={`r${y}`} d={`M100 ${y} Q185 ${y + 10} 270 ${y}`} />)}
        <g className="dsx-spin">
          {merid.map((x) => <path key={`m${x}`} d={`M${x} 20 Q${x + (x - 185) * 0.35} 150 ${x} 280`} />)}
          {merid.map((x) => <path key={`n${x}`} d={`M${x + 169} 20 Q${x + 169 + (x - 185) * 0.35} 150 ${x + 169} 280`} />)}
        </g>
        <g className="dsx-spin slow">
          {diag.map((x) => <line key={`d${x}`} x1={x} y1="20" x2={x + 160} y2="280" />)}
          {diag.map((x) => <line key={`e${x}`} x1={x + 160} y1="20" x2={x} y2="280" className="faint" />)}
        </g>
      </g>
      <path d={TOOTH} className="dsx-outline" filter="url(#dsxGlow)" />
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" className="dsx-dot" style={{ animationDelay: `${(i % 6) * 0.35}s` }} />)}
    </svg>
  )
}


// A happy smile: lips with a row of white teeth and sparkles.
function SmileArt() {
  const top = Array.from({ length: 8 }, (_, i) => i)
  return (
    <svg className="dsx-smile" viewBox="0 0 260 170" aria-hidden="true">
      <defs>
        <linearGradient id="dsxLip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fb7185" /><stop offset="1" stopColor="#e11d48" /></linearGradient>
        <clipPath id="dsxMouth"><path d="M30 62 Q130 40 230 62 Q190 140 130 142 Q70 140 30 62 Z" /></clipPath>
      </defs>
      <path d="M14 58 Q72 22 130 40 Q188 22 246 58 Q200 166 130 166 Q60 166 14 58 Z" fill="url(#dsxLip)" />
      <path d="M30 62 Q130 40 230 62 Q190 140 130 142 Q70 140 30 62 Z" fill="#7f1d1d" />
      <g clipPath="url(#dsxMouth)">
        {top.map((i) => { const x = 36 + i * 24; const h = 34 - Math.abs(i - 3.5) * 4; return <rect key={i} x={x} y={44 + Math.abs(i - 3.5) * 2} width="22" height={h} rx="6" className="dsx-teeth" /> })}
        {top.map((i) => { const x = 46 + i * 21; const h = 24 - Math.abs(i - 3.5) * 3; return i < 8 ? <rect key={`b${i}`} x={x} y={132 - h - Math.abs(i - 3.5) * 2} width="19" height={h} rx="6" className="dsx-teeth low" /> : null })}
        <rect x="60" y="96" width="140" height="40" rx="20" fill="#f43f5e" opacity=".85" />
      </g>
      <g className="dsx-sparkles">
        <path d="M84 50 l3 -9 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 Z" />
        <path d="M176 46 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 Z" />
        <path d="M226 24 l2.5 -7 l2.5 7 l7 2.5 l-7 2.5 l-2.5 7 l-2.5 -7 l-7 -2.5 Z" />
      </g>
    </svg>
  )
}

const MiniTooth = () => (
  <svg viewBox="0 0 24 24" className="dsx-mini" aria-hidden="true"><path d="M7 3c-2 0-3.5 2-3.5 4.5 0 2.4 1 3.4 1.4 5.7.4 2.4.8 6.8 2.4 6.8 1.4 0 1.4-4.4 2.6-4.4h2.2c1.2 0 1.2 4.4 2.6 4.4 1.6 0 2-4.4 2.4-6.8.4-2.3 1.4-3.3 1.4-5.7C20.5 5 19 3 17 3c-1.8 0-2.6 1.2-5 1.2S8.8 3 7 3Z" /></svg>
)

export function DentalScreen() {
  const [smile, setSmile] = useState(false)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setSmile((x) => !x), 5200)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="dsx" aria-hidden="true">
      <div className="dsx-stage">
        <div className="dsx-screen">
          <div className="dsx-sheen" />
          <div className={`dsx-art ${smile ? 'off' : 'on'}`}><MeshTooth /></div>
          <div className={`dsx-art ${smile ? 'on' : 'off'}`}><SmileArt /><span className="dsx-cap">Smile ready ✨</span></div>
          <div className="dsx-scan" />
        </div>
        <div className="dsx-card chart">
          <svg viewBox="0 0 120 60"><g className="dsx-bars">{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <line key={i} x1={8 + i * 11.5} x2={8 + i * 11.5} y1="6" y2="56" />)}</g><path className="dsx-wave" d="M4 40 C14 40 16 14 28 14 S42 46 54 46 S68 18 80 20 S96 52 116 44" /></svg>
        </div>
        <div className="dsx-card rec left"><MiniTooth /><span className="dsx-lines"><i /><i /><i /></span></div>
        <div className="dsx-card rec right"><MiniTooth /><span className="dsx-lines"><i /><i /><i /><i /><i /></span></div>
      </div>
      <svg className="dsx-tools" viewBox="0 0 60 150">
        <circle cx="16" cy="18" r="13" className="mirror" /><circle cx="16" cy="18" r="9" className="glass" />
        <line x1="16" y1="31" x2="16" y2="146" className="handle" />
        <path d="M38 8 L42 40 L40 146 M50 8 L46 40 L48 146" className="probe" />
      </svg>
    </div>
  )
}
