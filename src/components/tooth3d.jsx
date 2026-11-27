// A real 3D molar for the clinic website: glossy enamel, two roots, slowly turning; drag to turn it.
// three.js is loaded only here (on the public website), never in the staff app bundle.
import { useEffect, useRef, useState } from 'react'

function molar(THREE) {
  const g = new THREE.SphereGeometry(1, 120, 120)
  const p = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    let { x, y, z } = v
    if (y > -0.15) {
      // Crown: a wide, slightly square body with four cusps on top.
      const sq = 1 + 0.12 * Math.pow(Math.abs(Math.sin(2 * Math.atan2(z, x))), 2)
      x *= 1.05 * sq
      z *= 0.95 * sq
      if (y > 0.35) {
        const cusp = 0.11 * (Math.cos(x * 3.4) * Math.cos(z * 3.4)) + 0.04
        y = 0.35 + (y - 0.35) * 0.55 + cusp * Math.min(1, (y - 0.35) * 3)
      }
    } else {
      // Neck: the bottom of the crown narrows a little; the roots are separate meshes below.
      const t = Math.min(1, (-0.15 - y) / 0.85)
      x *= 0.95 - 0.2 * t
      z *= 0.9 - 0.2 * t
      y = -0.15 - t * 0.3
    }
    p.setXYZ(i, x, y, z)
  }
  g.computeVertexNormals()
  return g
}

// One tapering root, made by turning a curved outline around its axis.
function root(THREE) {
  const pts = []
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    pts.push(new THREE.Vector2(Math.max(0.02, 0.4 * Math.pow(1 - t, 0.75)), -t * 1.45))
  }
  return new THREE.LatheGeometry(pts, 64)
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
      camera.position.set(0, 0.15, 6.8)

      const mat = new THREE.MeshPhysicalMaterial({ color: 0xfbf8f1, roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.18, sheen: 0.3, sheenColor: new THREE.Color(0xdff6ff) })
      const tooth = new THREE.Group()
      const crown = new THREE.Mesh(molar(THREE), mat)
      tooth.add(crown)
      const rootGeo = root(THREE)
      for (const side of [-1, 1]) {
        const r = new THREE.Mesh(rootGeo, mat)
        r.position.set(side * 0.36, -0.2, 0)
        r.rotation.z = side * 0.14
        tooth.add(r)
      }
      tooth.position.y = 0.55
      const group = new THREE.Group()
      group.add(tooth)
      // A thin glowing ring under the tooth, like a scanner.
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.012, 16, 160), new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.75 }))
      ring.rotation.x = Math.PI / 2
      ring.position.y = -1.2
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
        tooth.position.y = 0.55 + (still ? 0 : Math.sin(s * 1.2) * 0.06)
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
        crown.geometry.dispose()
        rootGeo.dispose()
        mat.dispose()
        renderer.domElement.remove()
      }
    }).catch(() => setFailed(true))
    return () => { stop = true; cleanup() }
  }, [])

  if (failed) return fallback
  return <div ref={host} className={`tooth3d ${className}`} role="img" aria-label="3D model of a tooth. Drag to turn it." />
}
