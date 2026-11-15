// Animated hero scene for dental clinic front pages: a tilted glowing screen with a rotating
// wireframe tooth, a live chart card, tooth record cards and dental tools.
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


const MiniTooth = () => (
  <svg viewBox="0 0 24 24" className="dsx-mini" aria-hidden="true"><path d="M7 3c-2 0-3.5 2-3.5 4.5 0 2.4 1 3.4 1.4 5.7.4 2.4.8 6.8 2.4 6.8 1.4 0 1.4-4.4 2.6-4.4h2.2c1.2 0 1.2 4.4 2.6 4.4 1.6 0 2-4.4 2.4-6.8.4-2.3 1.4-3.3 1.4-5.7C20.5 5 19 3 17 3c-1.8 0-2.6 1.2-5 1.2S8.8 3 7 3Z" /></svg>
)

export function DentalScreen() {
  return (
    <div className="dsx" aria-hidden="true">
      <div className="dsx-stage">
        <div className="dsx-screen">
          <div className="dsx-sheen" />
          <MeshTooth />
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
