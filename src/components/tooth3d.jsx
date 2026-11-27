// A real 3D molar for the clinic website: glossy enamel, two roots, slowly turning; drag to turn it.
// three.js is loaded only here (on the public website), never in the staff app bundle.
import { useEffect, useRef, useState } from 'react'

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const ENAMEL = [1, 0.985, 0.95]
const ROOT = [0.9, 0.79, 0.6]
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

// Crown and root trunk from one sphere: four cusps around a central groove, the widest part
// a little above the gum line, then narrowing smoothly to the neck (no "mushroom" ledge).
function crown(THREE) {
  const g = new THREE.SphereGeometry(1, 160, 160)
  const p = g.attributes.position
  const col = new Float32Array(p.count * 3)
  const v = new THREE.Vector3()
  const CUSPS = [[0.42, 0.36], [-0.42, 0.36], [0.42, -0.36], [-0.42, -0.36]]
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    let { x, y, z } = v
    const sq = 1 + 0.1 * Math.pow(Math.abs(Math.sin(2 * Math.atan2(z, x))), 2)
    if (y >= 0) {
      const bulge = 1 + 0.05 * Math.sin(Math.min(1, y / 0.6) * Math.PI)
      x *= 0.9 * sq * bulge
      z *= 0.82 * sq * bulge
      if (y > 0.4) {
        const w = smooth(0.4, 0.95, y)
        const field = CUSPS.reduce((s, [cx, cz]) => s + Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / 0.07), 0)
        y = 0.4 + (y - 0.4) * 0.42 + w * (0.16 * field - 0.06)
      }
      y *= 0.95
    } else {
      const t = -y
      const neck = 1 - 0.3 * smooth(0, 0.75, t)
      x *= 0.9 * sq * neck
      z *= 0.82 * sq * neck
      y *= 0.8
    }
    p.setXYZ(i, x, y, z)
    const c = mix(ENAMEL, ROOT, smooth(-0.02, -0.16, y))
    col.set(c, i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

// One root: thick where it leaves the crown, tapering to a blunt rounded tip, curving gently inward.
function root(THREE, side) {
  const L = 1.6
  const pts = []
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    pts.push(new THREE.Vector2(0.4 * (1 - 0.8 * Math.pow(t, 1.4)), -t * L))
  }
  for (let i = 1; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(0.08 * Math.cos(a), -L - 0.08 * Math.sin(a))) }
  const g = new THREE.LatheGeometry(pts, 72)
  const p = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const t = Math.min(1, -v.y / L)
    p.setXYZ(i, v.x - side * 0.22 * t * t, v.y, v.z * 0.85)
  }
  const col = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) col.set(ROOT, i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

export function Tooth3D({ className = '', fallback = null }) {
  const host = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let stop = false
    let cleanup = () => {}
    import('three').then((THREE) => {
      if (stop || !host.current) return
      const el = host.current
      let renderer
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      } catch {
        setFailed(true)
        return
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      el.appendChild(renderer.domElement)
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
      camera.position.set(0, 0.1, 7.2)

      const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.18, sheen: 0.3, sheenColor: new THREE.Color(0xdff6ff) })
      const tooth = new THREE.Group()
      const crownGeo = crown(THREE)
      const crownMesh = new THREE.Mesh(crownGeo, mat)
      tooth.add(crownMesh)
      const rootGeos = [-1, 1].map((side) => root(THREE, side))
      rootGeos.forEach((g, k) => {
        const side = k ? 1 : -1
        const r = new THREE.Mesh(g, mat)
        r.position.set(side * 0.27, -0.25, 0)
        r.rotation.z = side * 0.13
        tooth.add(r)
      })
      tooth.position.y = 0.75
      const group = new THREE.Group()
      group.add(tooth)
      // A thin glowing ring under the tooth, like a scanner.
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.012, 16, 160), new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.75 }))
      ring.rotation.x = Math.PI / 2
      ring.position.y = -1.35
      group.add(ring)
      scene.add(group)

      scene.add(new THREE.HemisphereLight(0xffffff, 0x2a6f7a, 1.1))
      const key = new THREE.DirectionalLight(0xffffff, 2.2)
      key.position.set(3, 4, 5)
      scene.add(key)
      const rim = new THREE.DirectionalLight(0x8ee9ff, 1.6)
      rim.position.set(-4, 1, -3)
      scene.add(rim)

      const size = () => {
        const w = el.clientWidth || 300
        const h = el.clientHeight || 300
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      size()
      const ro = new ResizeObserver(size)
      ro.observe(el)

      // Drag to turn; it keeps turning slowly on its own.
      let drag = null
      let spin = 0
      let tilt = 0.18
      const down = (e) => { drag = { x: e.clientX, y: e.clientY, s: spin, t: tilt }; el.setPointerCapture?.(e.pointerId) }
      const move = (e) => { if (!drag) return; spin = drag.s + (e.clientX - drag.x) * 0.012; tilt = Math.max(-0.6, Math.min(0.8, drag.t + (e.clientY - drag.y) * 0.006)) }
      const up = () => { drag = null }
      el.addEventListener('pointerdown', down)
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)

      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      let raf
      const t0 = performance.now()
      const tick = (now) => {
        const s = (now - t0) / 1000
        if (!drag && !still) spin += 0.006
        group.rotation.y = spin
        group.rotation.x = tilt
        tooth.position.y = 0.75 + (still ? 0 : Math.sin(s * 1.2) * 0.06)
        ring.scale.setScalar(1 + (still ? 0 : Math.sin(s * 2) * 0.04))
        renderer.render(scene, camera)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)

      cleanup = () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        el.removeEventListener('pointerdown', down)
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        renderer.dispose()
        crownGeo.dispose()
        rootGeos.forEach((g) => g.dispose())
        mat.dispose()
        renderer.domElement.remove()
      }
    }).catch(() => setFailed(true))
    return () => { stop = true; cleanup() }
  }, [])

  if (failed) return fallback
  return <div ref={host} className={`tooth3d ${className}`} role="img" aria-label="3D model of a tooth. Drag to turn it." />
}
