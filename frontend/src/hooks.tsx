import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'

/* ---------- môi trường ---------- */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const canHover = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !prefersReducedMotion()

/* ---------- điểm sáng theo vị trí con trỏ ---------- */
export const onSpot = (e: MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

/* ---------- hiện dần khi cuộn ---------- */
export function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, seen] as const
}

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>()
  return <div ref={ref} className={`reveal ${seen ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>
}

export function CountUp({ to, decimals = 0, suffix = '' }: { to: number; decimals?: number; suffix?: string }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.3)
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!seen) return
    if (prefersReducedMotion()) { setV(to); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400)
      setV(to * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, to])
  return <span ref={ref} className="num">{v.toFixed(decimals)}{suffix}</span>
}

/** Nút từ tính: dịch tối đa 8px về phía con trỏ khi con trỏ cách nút < 80px. */
export function Magnetic({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!canHover()) return
    const el = ref.current!
    const move = (e: globalThis.MouseEvent) => {
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      const edge = Math.hypot(Math.max(Math.abs(dx) - r.width / 2, 0), Math.max(Math.abs(dy) - r.height / 2, 0))
      if (edge < 80) { const d = Math.hypot(dx, dy) || 1; const k = Math.min(8, d * 0.15); el.style.transform = `translate(${(dx / d) * k}px, ${(dy / d) * k}px)` }
      else el.style.transform = 'translate(0,0)'
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return <span ref={ref} className={`inline-block transition-transform duration-200 ${className}`}>{children}</span>
}

/** Đếm ngược đến 24:00 hôm nay. */
export function useCountdown() {
  const calc = () => { const n = new Date(); const end = new Date(n); end.setHours(24, 0, 0, 0); return Math.max(0, Math.floor((+end - +n) / 1000)) }
  const [s, setS] = useState(calc)
  useEffect(() => { const t = setInterval(() => setS(calc()), 1000); return () => clearInterval(t) }, [])
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))} : ${p(Math.floor((s % 3600) / 60))} : ${p(s % 60)}`
}

/* ---------- View Transitions API (tăng dần, tự bỏ qua nếu trình duyệt không hỗ trợ) ---------- */
type VT = { ready: Promise<void>; finished: Promise<void> }
type VTDoc = Document & { startViewTransition?: (cb: () => void | Promise<void>) => VT }
const vtDoc = () => document as VTDoc
const supportsVT = () => typeof document !== 'undefined' && !!vtDoc().startViewTransition && !prefersReducedMotion()

/** Shell gọi hàm này sau khi route mới đã render xong để View Transition chụp ảnh "sau". */
let pendingNav: (() => void) | null = null
export const resolveNav = () => { pendingNav?.(); pendingNav = null }

/**
 * Chuyển trang có hiệu ứng. Nếu truyền `shared` (thường là ảnh sản phẩm), phần tử đó sẽ "bay" sang
 * phần tử cùng tên `product-image` ở trang đích (shared-element transition).
 */
export function transitionTo(go: () => void, shared?: HTMLElement | null) {
  if (!supportsVT()) return go()
  // Tên view-transition phải duy nhất trong một khung hình: nếu trang hiện tại đã có khung ảnh `.vt-product`
  // (ví dụ bấm "Sản phẩm liên quan" ở trang chi tiết) thì tạm vô hiệu nó để không bị trùng tên làm hỏng hiệu ứng.
  document.querySelectorAll<HTMLElement>('.vt-product').forEach((el) => el.style.setProperty('view-transition-name', 'none'))
  shared?.style.setProperty('view-transition-name', 'product-image')
  const vt = vtDoc().startViewTransition!(() => new Promise<void>((resolve) => {
    pendingNav = resolve
    go()
    setTimeout(resolve, 700) // chốt an toàn: không bao giờ treo trang
  }))
  vt.finished.finally(() => shared?.style.removeProperty('view-transition-name'))
}

/** Click thường -> chuyển trang có hiệu ứng; click kèm Ctrl/Cmd/Shift hoặc chuột giữa -> để trình duyệt xử lý. */
export function isPlainClick(e: MouseEvent<HTMLElement>) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

/* ---------- giao diện sáng / tối (có hiệu ứng loang tròn từ vị trí nút) ---------- */
export function useTheme() {
  const [t, setT] = useState<'dark' | 'light'>(() => (document.documentElement.dataset.theme as 'light') === 'light' ? 'light' : 'dark')
  const toggle = (origin?: { x: number; y: number }) => {
    const n = t === 'dark' ? 'light' : 'dark'
    const apply = () => {
      document.documentElement.dataset.theme = n
      try { localStorage.setItem('ts-theme', n) } catch { /* bỏ qua */ }
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', n === 'light' ? '#f4f6fb' : '#07080c')
      flushSync(() => setT(n))
    }
    if (!supportsVT()) return apply()
    const x = origin?.x ?? window.innerWidth / 2
    const y = origin?.y ?? 0
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    document.documentElement.dataset.vt = 'theme'
    const vt = vtDoc().startViewTransition!(apply)
    vt.ready.then(() => document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)', pseudoElement: '::view-transition-new(root)' },
    )).catch(() => {})
    vt.finished.finally(() => { delete document.documentElement.dataset.vt })
  }
  return [t, toggle] as const
}

/* ---------- ảnh sản phẩm "bay" vào giỏ ---------- */
export function flyToCart(from: Element | null | undefined) {
  if (!from || prefersReducedMotion()) return
  const target = document.querySelector('[data-cart-icon]')
  const img = from instanceof HTMLImageElement ? from : from.querySelector('img')
  if (!target || !img) return
  const a = img.getBoundingClientRect(), b = target.getBoundingClientRect()
  if (!a.width || !b.width) return
  const size = 56
  const dot = document.createElement('div')
  Object.assign(dot.style, {
    position: 'fixed', left: `${a.left + a.width / 2 - size / 2}px`, top: `${a.top + a.height / 2 - size / 2}px`,
    width: `${size}px`, height: `${size}px`, borderRadius: '50%', zIndex: '120', pointerEvents: 'none',
    background: `center / cover no-repeat url("${img.currentSrc || img.src}")`, boxShadow: '0 10px 30px rgba(0,0,0,.45), 0 0 0 2px rgba(255,255,255,.7)',
  })
  document.body.appendChild(dot)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2)
  const anim = dot.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 90}px) scale(.8)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(.18)`, opacity: .6 },
  ], { duration: 720, easing: 'cubic-bezier(.5,0,.3,1)' })
  const done = () => dot.remove()
  anim.onfinish = done; anim.oncancel = done
}

/* ---------- hiệu ứng gợn sóng (ripple) khi bấm nút / chip: gắn một lần ở App ---------- */
export function useRipple() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return
      const el = (e.target as Element | null)?.closest<HTMLElement>('.btn, .chip, [data-ripple]')
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return
      const r = el.getBoundingClientRect()
      const size = Math.max(r.width, r.height) * 2
      const dot = document.createElement('span')
      dot.className = 'ripple'
      dot.setAttribute('aria-hidden', 'true')
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`
      el.appendChild(dot)
      dot.addEventListener('animationend', () => dot.remove(), { once: true })
    }
    document.addEventListener('pointerdown', down, { passive: true })
    return () => document.removeEventListener('pointerdown', down)
  }, [])
}
