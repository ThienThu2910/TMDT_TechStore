import { Fragment, cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Link, NavLink, useGo } from './nav'
import {
  Search, ShoppingBag, UserRound, Heart, Menu, X, Star, ChevronRight, CircleCheck, CircleAlert, Sun, Moon, CornerDownLeft, ArrowUpRight,
  Laptop, Smartphone, Tablet, Monitor, Headphones, Package, Box, Clock, Trash2, Minus, Plus, Undo2, Truck,
} from 'lucide-react'
import { discountPct, vnd, fold, FREE_SHIP, type Category, type Product } from './data'
import { useStore, type CartLine } from './store'
import { canHover, flyToCart, isPlainClick, onTilt, onTiltLeave, transitionTo, useTheme } from './hooks'

/* Chỉ import đúng các icon dùng tới (thay cho `import * as Icons`) -> bundle nhỏ hơn rất nhiều. */
const iconMap = { Laptop, Smartphone, Tablet, Monitor, Headphones, Package, ShoppingBag, Heart, UserRound, Sun, Moon, Clock, Search, Box } as const
export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const C = (iconMap as Record<string, typeof Box>)[name] ?? Box
  return <C size={size} strokeWidth={1.6} />
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link to="/" className="font-display text-xl font-bold tracking-tight" aria-label="TECHSTORE">
      <span className={dark ? 'text-panel-ink' : 'text-ink'}>TECH</span><span className="text-grad">STORE</span>
    </Link>
  )
}

/* =========================================================================
   Overlay: hộp thoại gốc <dialog>. Focus trap, Esc, khoá cuộn nền, trả focus về nút đã mở: trình duyệt lo hết.
   ========================================================================= */
export function Overlay({ variant = 'center', label, onClose, className = '', children }: {
  variant?: 'center' | 'top' | 'left' | 'right' | 'bottom'; label: string; onClose: () => void; className?: string; children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const d = ref.current!
    if (!d.open) d.showModal()
    return () => { if (d.open) d.close() }
  }, [])
  return (
    <dialog ref={ref} className={`ov ov--${variant}`} aria-label={label}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`ov-panel ${className}`}>{children}</div>
    </dialog>
  )
}

/* ---------- lịch sử tìm nhanh ---------- */
type Recent = { label: string; to: string; icon: string }
const readRecent = (): Recent[] => { try { return JSON.parse(localStorage.getItem('ts-recent') ?? '[]') as Recent[] } catch { return [] } }
const pushRecent = (r: Recent) => { try { localStorage.setItem('ts-recent', JSON.stringify([r, ...readRecent().filter((x) => x.to !== r.to)].slice(0, 4))) } catch { /* bỏ qua */ } }

function Highlight({ text, q }: { text: string; q: string }) {
  const t = text.normalize('NFC'), f = fold(t), n = fold(q.trim())
  const i = n && f.length === t.length ? f.indexOf(n) : -1
  if (i < 0) return <>{text}</>
  return <>{t.slice(0, i)}<mark className="rounded bg-brand-50 px-0.5 text-brand-600">{t.slice(i, i + n.length)}</mark>{t.slice(i + n.length)}</>
}

/* ---------- Command palette ---------- */
type PItem = { key: string; group: string; label: string; hint?: string; icon: string; hay?: string; to?: string; run?: () => void }

function Palette({ onClose, onToggleTheme, onOpenCart }: { onClose: () => void; onToggleTheme: () => void; onOpenCart: () => void }) {
  const nav = useGo()
  const { cartCount, wishlist, products, categories } = useStore()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const [recent] = useState(readRecent)
  const list = useRef<HTMLUListElement>(null)
  const s = fold(q.trim())
  const listId = useId()

  const items = useMemo<PItem[]>(() => {
    const quick: PItem[] = [
      { key: 'q-cart', group: 'Thao tác nhanh', label: 'Mở giỏ hàng', hint: cartCount ? `${cartCount} sản phẩm` : 'Trống', icon: 'ShoppingBag', run: onOpenCart },
      { key: 'q-wish', group: 'Thao tác nhanh', label: 'Sản phẩm yêu thích', hint: String(wishlist.length), icon: 'Heart', to: '/products?wish=1' },
      { key: 'q-acc', group: 'Thao tác nhanh', label: 'Tài khoản', icon: 'UserRound', to: '/account' },
      { key: 'q-theme', group: 'Thao tác nhanh', label: 'Đổi giao diện sáng / tối', icon: 'Sun', run: onToggleTheme },
    ]
    const cats: PItem[] = categories.map((c) => ({ key: 'c' + c.slug, group: 'Danh mục', label: c.name, hint: `${products.filter((p) => p.category === c.slug).length} sản phẩm`, icon: c.icon, to: `/products?cat=${c.slug}` }))
    const prods: PItem[] = products.map((p) => ({ key: 'p' + p.id, group: 'Sản phẩm', label: p.name, hay: p.name + ' ' + p.brand, hint: vnd(p.price), icon: 'Package', to: `/product/${p.id}` }))
    if (!s) return [
      ...recent.map((r, n) => ({ key: 'r' + n, group: 'Gần đây', label: r.label, icon: 'Clock', to: r.to })),
      ...quick, ...cats, ...prods.slice(0, 4).map((x) => ({ ...x, group: 'Gợi ý cho bạn' })),
    ]
    const hit = (x: PItem) => fold(x.hay ?? x.label).includes(s)
    return [
      { key: 'search', group: 'Tìm kiếm', label: `Tìm “${q.trim()}” trong tất cả sản phẩm`, icon: 'Search', to: `/products?q=${encodeURIComponent(q.trim())}` },
      ...cats.filter(hit), ...prods.filter(hit).slice(0, 6), ...quick.filter(hit),
    ]
  }, [s, q, recent, cartCount, wishlist.length, onOpenCart, onToggleTheme, products, categories])

  const choose = (it: PItem) => {
    if (it.to) { if (!it.key.startsWith('q-') && it.key !== 'search') pushRecent({ label: it.label, to: it.to, icon: it.icon }); else if (it.key === 'search') pushRecent({ label: `“${q.trim()}”`, to: it.to, icon: 'Search' }); nav(it.to) }
    onClose()
    it.run?.()
  }
  useEffect(() => { list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }) }, [i])

  let prev = ''
  return (
    <Overlay variant="top" label="Tìm nhanh" onClose={onClose} className="glass w-full max-w-xl overflow-hidden !bg-surface/90">
      <div className="flex items-center gap-3 border-b border-line px-5">
        <Search size={18} className="shrink-0 text-ink-3" />
        <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setI(0) }} role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={items[i] ? `${listId}-${i}` : undefined}
          aria-label="Tìm sản phẩm, danh mục" placeholder="Bạn đang tìm sản phẩm nào?" className="h-14 min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(items.length - 1, x + 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)) }
            if (e.key === 'Enter') { e.preventDefault(); if (items[i]) choose(items[i]) }
          }} />
        <kbd className="kbd">Esc</kbd>
      </div>
      <ul ref={list} id={listId} role="listbox" aria-label="Kết quả" className="max-h-[52vh] overflow-y-auto p-2">
        {items.map((it, n) => {
          const head = it.group !== prev ? <li role="presentation" className="eyebrow px-3 pb-1 pt-3 !text-[11px] !text-ink-3">{it.group}</li> : null
          prev = it.group
          return (
            <Fragment key={it.key}>
              {head}
              <li role="presentation">
              <div id={`${listId}-${n}`} role="option" aria-selected={n === i} onMouseMove={() => i !== n && setI(n)} onClick={() => choose(it)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${n === i ? 'bg-brand-50' : ''}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-2"><Icon name={it.icon} size={18} /></span>
                <span className="min-w-0 flex-1 truncate font-medium"><Highlight text={it.label} q={it.group === 'Sản phẩm' || it.group === 'Danh mục' ? q : ''} /></span>
                {it.hint && <span className="num shrink-0 text-xs text-ink-3">{it.hint}</span>}
                {n === i && <CornerDownLeft size={14} className="shrink-0 text-ink-3" />}
              </div>
              </li>
            </Fragment>
          )
        })}
      </ul>
      <div className="hidden items-center gap-4 border-t border-line px-5 py-2.5 text-xs text-ink-3 sm:flex">
        <span><kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> chọn</span><span><kbd className="kbd">↵</kbd> mở</span><span><kbd className="kbd">Esc</kbd> đóng</span>
      </div>
    </Overlay>
  )
}

export function SearchBar({ className = '', onDone }: { className?: string; onDone?: () => void }) {
  const nav = useGo()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); nav(`/products?q=${encodeURIComponent(q)}`); onDone?.() }
  return (
    <form onSubmit={submit} className={`relative ${className}`} role="search">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
      <input className="input rounded-full pl-10" placeholder="Bạn đang tìm sản phẩm nào?" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm kiếm" />
    </form>
  )
}

const buildNav = (categories: Category[]) => [
  { label: 'Tất cả', to: '/products', hot: false },
  ...categories.map((c) => ({ label: c.name, to: `/products?cat=${c.slug}`, hot: false })),
  { label: 'Săn deal', to: '/products?sale=1', hot: true },
]

function TopBar() {
  const msg = ['Miễn phí giao hàng từ 5.000.000đ', 'Đổi trả 30 ngày', 'Hotline 1800 6868']
  const row = (k: number) => (
    <div className="marquee__track" aria-hidden={k > 0} style={{ gap: 32 }}>
      {[...msg, ...msg].map((m, i) => <span key={i} className="flex items-center gap-8 whitespace-nowrap"><span>{m}</span><span className="text-brand-600">✦</span></span>)}
    </div>
  )
  return <div className="num h-9 border-b border-line bg-surface text-xs text-ink-2"><div className="marquee h-full items-center">{row(0)}{row(1)}</div></div>
}

/* ---------- Thanh tiến trình miễn phí vận chuyển ---------- */
export function FreeShipBar({ subtotal }: { subtotal: number }) {
  const left = Math.max(0, FREE_SHIP - subtotal)
  const pct = Math.min(100, (subtotal / FREE_SHIP) * 100)
  return (
    <div>
      <p className="flex items-center gap-2 text-sm"><Truck size={16} className={left === 0 ? 'text-ok' : 'text-brand-600'} />
        {left === 0 ? <span>Đơn của bạn được <b className="text-ok">miễn phí vận chuyển</b></span> : <span>Mua thêm <b className="num">{vnd(left)}</b> để được <b>miễn phí vận chuyển</b></span>}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-label="Tiến độ miễn phí vận chuyển" aria-valuemin={0} aria-valuemax={FREE_SHIP} aria-valuenow={Math.min(subtotal, FREE_SHIP)}>
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: left === 0 ? 'var(--ok)' : 'var(--grad-brand)', transitionTimingFunction: 'var(--ease)' }} />
      </div>
    </div>
  )
}

/* ---------- Giỏ hàng mini (drawer bên phải) ---------- */
function MiniCart({ onClose }: { onClose: () => void }) {
  const { cart, setQty, removeFromCart, restoreToCart, cartCount, products } = useStore()
  const [undo, setUndo] = useState<{ line: CartLine; name: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const lines = cart.map((c) => ({ ...c, p: products.find((x) => x.id === c.id)! })).filter((l) => l.p)
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
  const remove = (l: CartLine, name: string) => {
    removeFromCart(l.id); setUndo({ line: { id: l.id, qty: l.qty }, name })
    clearTimeout(timer.current); timer.current = setTimeout(() => setUndo(null), 6000)
  }
  return (
    <Overlay variant="right" label="Giỏ hàng" onClose={onClose} className="flex h-full w-full max-w-[420px] flex-col border-l border-line bg-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-xl font-bold">Giỏ hàng {cartCount > 0 && <span className="num text-sm font-normal text-ink-3">({cartCount})</span>}</h2>
        <button onClick={onClose} aria-label="Đóng giỏ hàng" className="grid h-10 w-10 place-items-center rounded-full hover:bg-subtle"><X size={18} /></button>
      </div>
      {lines.length > 0 && <div className="border-b border-line px-5 py-4"><FreeShipBar subtotal={subtotal} /></div>}
      <div className="flex-1 overflow-y-auto px-5">
        {lines.length === 0 ? (
          <div className="grid h-full place-items-center py-16 text-center">
            <div><div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600"><ShoppingBag size={28} /></div>
              <p className="font-display text-lg font-semibold">Giỏ hàng đang trống</p><p className="mt-1 text-sm text-ink-2">Thêm vài món công nghệ bạn thích nhé.</p>
              <Link to="/products" onClick={onClose} className="btn btn-primary mt-5">Khám phá sản phẩm</Link></div>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {lines.map(({ p, qty }) => (
              <li key={p.id} className="flex gap-3 py-4">
                <Link to={`/product/${p.id}`} onClick={onClose} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-subtle"><img src={p.images[0]} alt="" className="h-full w-full object-cover" /></Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link to={`/product/${p.id}`} onClick={onClose} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-brand-600">{p.name}</Link>
                  <div className="num mt-0.5 text-sm text-ink-2">{vnd(p.price)}</div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-full border border-line" role="group" aria-label={`Số lượng ${p.name}`}>
                      <button className="grid h-8 w-8 place-items-center disabled:opacity-40" disabled={qty <= 1} onClick={() => setQty(p.id, qty - 1)} aria-label="Giảm"><Minus size={13} /></button>
                      <span className="num w-6 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
                      <button className="grid h-8 w-8 place-items-center" onClick={() => setQty(p.id, qty + 1)} aria-label="Tăng"><Plus size={13} /></button>
                    </div>
                    <button onClick={() => remove({ id: p.id, qty }, p.name)} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-subtle hover:text-danger" aria-label={`Xóa ${p.name}`}><Trash2 size={16} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {undo && (
          <div className="sticky bottom-3 my-3 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm shadow-lg" role="status">
            <span className="line-clamp-1 text-ink-2">Đã xóa “{undo.name}”</span>
            <button className="flex shrink-0 items-center gap-1.5 font-semibold text-brand-600" onClick={() => { restoreToCart(undo.line); setUndo(null) }}><Undo2 size={15} />Hoàn tác</button>
          </div>
        )}
      </div>
      {lines.length > 0 && (
        <div className="space-y-3 border-t border-line p-5">
          <div className="flex items-baseline justify-between"><span className="text-ink-2">Tạm tính</span><span className="num text-xl font-bold">{vnd(subtotal)}</span></div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/cart" onClick={onClose} className="btn btn-secondary btn-lg">Xem giỏ hàng</Link>
            <Link to="/checkout" onClick={onClose} className="btn btn-primary btn-lg">Thanh toán</Link>
          </div>
        </div>
      )}
    </Overlay>
  )
}

export function Header() {
  const { cartCount, user, wishlist, categories } = useStore()
  const [open, setOpen] = useState(false)
  const [pal, setPal] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [theme, toggleTheme] = useTheme()
  const loc = useLocation()
  const nav = useGo()
  const navItems = useMemo(() => buildNav(categories), [categories])
  const [q, setQ] = useState('')
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal((p) => !p); return }
      const t = e.target as HTMLElement | null
      const typing = !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !document.querySelector('dialog[open]')) { e.preventDefault(); setPal(true) }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  // Số lượng giỏ tăng -> huy hiệu "nảy" lên một nhịp để người dùng thấy phản hồi
  const prevCount = useRef(cartCount)
  const [bumpKey, setBumpKey] = useState(0)
  useEffect(() => { if (cartCount > prevCount.current) setBumpKey((k) => k + 1); prevCount.current = cartCount }, [cartCount])

  // thanh trượt dưới menu
  const refs = useRef<(HTMLAnchorElement | null)[]>([])
  const [hover, setHover] = useState<number | null>(null)
  const full = loc.pathname + loc.search
  const active = loc.pathname === '/products' ? navItems.findIndex((n) => n.to === full) : -1
  const target = hover ?? active
  const [bar, setBar] = useState({ left: 0, width: 0 })
  useLayoutEffect(() => {
    const el = target >= 0 ? refs.current[target] : null
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth })
  }, [target])
  const PAD = 10 // phải khớp với px-2.5 của mỗi mục menu

  const themeClick = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
  }
  const toggleFromPalette = () => toggleTheme({ x: window.innerWidth - 120, y: 60 })

  return (
    <>
      <div className="scroll-progress" aria-hidden />
      <TopBar />
      <header className="site-header sticky top-0 z-40 px-3 pt-4 sm:px-6 pointer-events-none">
        <div className={`pointer-events-auto mx-auto flex max-w-[1280px] items-center gap-3 rounded-full border border-line px-4 transition-all duration-300 sm:px-6 ${scrolled ? 'h-14 bg-surface/80 backdrop-blur-2xl shadow-lg' : 'h-16 bg-surface/60 backdrop-blur-xl'}`}>
          <button className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-subtle xl:hidden" onClick={() => setOpen(true)} aria-label="Mở menu"><Menu size={20} /></button>
          <Logo />
          <nav className="relative ml-4 hidden shrink-0 xl:block" aria-label="Danh mục" onMouseLeave={() => setHover(null)}>
            <ul className="relative flex items-center">
              {navItems.map((n, i) => (
                <li key={n.to} className="shrink-0">
                  <NavLink ref={(el) => { refs.current[i] = el }} to={n.to} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                    className={`relative flex items-center gap-1.5 whitespace-nowrap px-2.5 py-2 text-sm font-medium transition-colors ${target === i ? 'text-ink' : 'text-ink-2'}`}>
                    {n.label}{n.hot && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-hot" />}
                  </NavLink>
                </li>
              ))}
            </ul>
            <span aria-hidden className="absolute -bottom-1 h-0.5 rounded-full transition-all duration-300" style={{ left: bar.left + PAD, width: Math.max(0, bar.width - PAD * 2), opacity: target >= 0 ? 1 : 0, background: 'var(--grad-brand)', transitionTimingFunction: 'var(--ease)' }} />
          </nav>
          <form role="search" onSubmit={(e) => { e.preventDefault(); nav(`/products?q=${encodeURIComponent(q)}`) }} className="relative ml-auto hidden w-48 shrink transition-all duration-300 focus-within:w-72 lg:block xl:focus-within:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="input h-10 rounded-full pl-9 pr-16 text-sm" placeholder="Tìm kiếm..." aria-label="Tìm kiếm" />
            <button type="button" onClick={() => setPal(true)} aria-label="Mở tìm nhanh" className="num absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink-3 hover:text-ink">{isMac ? '⌘K' : 'Ctrl K'}</button>
          </form>
          <div className="ml-auto flex shrink-0 items-center gap-0.5 lg:ml-0">
            <button onClick={() => setPal(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-subtle lg:hidden" aria-label="Tìm kiếm"><Search size={19} /></button>
            <button onClick={themeClick} className="grid h-10 w-10 place-items-center rounded-full hover:bg-subtle" aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>
            <Link to="/account" className="hidden h-10 items-center gap-2 rounded-full px-2.5 hover:bg-subtle sm:flex" aria-label="Tài khoản"><UserRound size={19} /><span className="hidden whitespace-nowrap text-sm font-medium 2xl:inline">{user ? user.name.split(' ').slice(-1)[0] : 'Tài khoản'}</span></Link>
            <Link to="/products?wish=1" className="relative hidden h-10 w-10 place-items-center rounded-full hover:bg-subtle sm:grid" aria-label={`Yêu thích, ${wishlist.length} sản phẩm`}>
              <Heart size={19} />{wishlist.length > 0 && <span className="num absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-accent-2 px-1 text-[10px] font-bold text-white">{wishlist.length}</span>}
            </Link>
            <button data-cart-icon onClick={() => setCartOpen(true)} aria-haspopup="dialog" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-subtle" aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}>
              <ShoppingBag size={19} />{cartCount > 0 && <span key={bumpKey} className={`num absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-hot px-1 text-[10px] font-bold text-white ${bumpKey ? 'bump' : ''}`}>{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>
      {pal && <Palette onClose={() => setPal(false)} onToggleTheme={toggleFromPalette} onOpenCart={() => setCartOpen(true)} />}
      {cartOpen && <MiniCart onClose={() => setCartOpen(false)} />}
      {open && (
        <Overlay variant="left" label="Menu" onClose={() => setOpen(false)} className="h-full w-[min(320px,86vw)] overflow-y-auto border-r border-line bg-surface p-5 shadow-xl">
          <div className="mb-5 flex items-center justify-between"><Logo /><button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-subtle" aria-label="Đóng"><X size={20} /></button></div>
          <SearchBar onDone={() => setOpen(false)} className="mb-4" />
          <ul className="space-y-1">
            {navItems.map((c) => (
              <li key={c.to}><Link onClick={() => setOpen(false)} to={c.to} className="flex items-center justify-between rounded-xl px-3 py-3 font-medium hover:bg-subtle">{c.label}<ChevronRight size={16} className="text-ink-3" /></Link></li>
            ))}
            <li><Link onClick={() => setOpen(false)} to="/account" className="flex items-center justify-between rounded-xl px-3 py-3 font-medium hover:bg-subtle">Tài khoản<ChevronRight size={16} className="text-ink-3" /></Link></li>
            <li><Link onClick={() => setOpen(false)} to="/products?wish=1" className="flex items-center justify-between rounded-xl px-3 py-3 font-medium hover:bg-subtle">Yêu thích{wishlist.length > 0 && <span className="num rounded-full bg-brand-50 px-2 text-xs text-brand-600">{wishlist.length}</span>}</Link></li>
          </ul>
        </Overlay>
      )}
    </>
  )
}

export function Footer() {
  const { categories } = useStore()
  return (
    <footer className="relative mt-[clamp(80px,12vw,160px)] overflow-hidden border-t border-line bg-surface/70">
      <div className="container-x grid gap-10 pt-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-2">TECHSTORE — Technology for Life. Thiết bị công nghệ chính hãng, ưu đãi phù hợp cho mọi nhu cầu.</p>
        </div>
        <div><h4 className="eyebrow mb-4">Sản phẩm</h4><ul className="space-y-2 text-sm text-ink-2">{categories.map((c) => <li key={c.slug}><Link className="hover:text-ink" to={`/products?cat=${c.slug}`}>{c.name}</Link></li>)}</ul></div>
        <div><h4 className="eyebrow mb-4">Hỗ trợ</h4><ul className="space-y-2 text-sm text-ink-2"><li>Chính sách đổi trả</li><li>Chính sách bảo hành</li><li>Hướng dẫn mua hàng</li><li><Link className="hover:text-ink" to="/admin">Quản trị</Link></li></ul></div>
        <div><h4 className="eyebrow mb-4">Liên hệ</h4><ul className="num space-y-2 text-sm text-ink-2"><li>Hotline: 1800 6868</li><li>support@techstore.vn</li><li>Thanh toán: COD</li></ul></div>
      </div>
      <div className="container-x mt-12 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-3">
        <span>© 2026 TECHSTORE · Đồ án môn Thương mại điện tử.</span>
        <span className="hidden sm:inline">Nhấn <kbd className="kbd">/</kbd> hoặc <kbd className="kbd">Ctrl K</kbd> để tìm nhanh</span>
      </div>
      <div aria-hidden className="display pointer-events-none -mb-[0.2em] mt-4 select-none text-center text-[clamp(4rem,20vw,18rem)] leading-[.8] text-transparent"
        style={{ WebkitTextStroke: '1.5px var(--line)', maskImage: 'linear-gradient(180deg, #000 20%, transparent 90%)', WebkitMaskImage: 'linear-gradient(180deg, #000 20%, transparent 90%)' }}>TECHSTORE</div>
    </footer>
  )
}

export function ToastHost() {
  const { toasts } = useStore()
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[200] flex flex-col items-end gap-2 sm:left-auto" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} style={{ animation: 'toastIn .25s var(--ease)' }} className="glass pointer-events-auto flex items-center gap-2 !rounded-full px-5 py-3 text-sm">
          {t.kind === 'ok' ? <CircleCheck size={18} className="text-ok" /> : <CircleAlert size={18} className="text-danger" />}{t.msg}
        </div>
      ))}
    </div>
  )
}

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 py-5 text-xs text-ink-2">
      <Link to="/" className="hover:text-ink">Trang chủ</Link>
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5"><ChevronRight size={12} />{i.to ? <Link to={i.to} className="hover:text-ink">{i.label}</Link> : <span className="text-ink" aria-current="page">{i.label}</span>}</span>
      ))}
    </nav>
  )
}

export function Rating({ value, count }: { value: number; count: number }) {
  return <span className="num flex items-center gap-1 text-xs text-ink-2"><Star size={13} className="fill-warn text-warn" /><b className="text-ink">{value.toFixed(1)}</b>{count > 0 && <>({count})</>}</span>
}

/** Hiện điểm trung bình thật từ đánh giá của khách; chưa có đánh giá thì ghi rõ thay vì hiện 0.0. */
export function ProductRating({ p }: { p: Pick<Product, 'rating' | 'reviews'> }) {
  return p.reviews > 0 ? <Rating value={p.rating} count={p.reviews} /> : <span className="text-xs text-ink-3">Chưa có đánh giá</span>
}

export function PriceBlock({ p, large = false }: { p: Product; large?: boolean }) {
  const d = discountPct(p)
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className={`num font-bold ${large ? 'text-4xl text-ink' : 'text-lg text-ink'}`}>{vnd(p.price)}</span>
      {p.originalPrice && <span className={`num text-ink-3 line-through ${large ? 'text-base' : 'text-xs'}`}>{vnd(p.originalPrice)}</span>}
      {large && d > 0 && <span className="num rounded-full bg-hot px-2.5 py-0.5 text-sm font-semibold text-white">-{d}%</span>}
    </div>
  )
}

export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="rounded-full bg-danger/15 px-2.5 py-1 text-xs font-semibold text-danger">Hết hàng</span>
  if (stock <= 5) return <span className="rounded-full bg-warn/15 px-2.5 py-1 text-xs font-semibold text-warn">Sắp hết hàng · còn {stock}</span>
  return <span className="rounded-full bg-ok/15 px-2.5 py-1 text-xs font-semibold text-ok">Còn hàng</span>
}

/* =========================================================================
   Thẻ sản phẩm
   - Rê chuột ngang qua ảnh để "lướt" giữa các ảnh; chạm vào chấm trên điện thoại.
   - Bấm vào thẻ: ảnh "bay" sang trang chi tiết (View Transitions).
   - Thêm vào giỏ: ảnh bay vào biểu tượng giỏ hàng.
   ========================================================================= */
export function ProductCard({ p }: { p: Product }) {
  const { addToCart, wishlist, toggleWish, catName } = useStore()
  const nav = useNavigate()
  const d = discountPct(p)
  const wished = wishlist.includes(p.id)
  const [v, setV] = useState(0)
  const [engaged, setEngaged] = useState(false) // chỉ tải các ảnh phụ khi người dùng thực sự tương tác -> tiết kiệm băng thông
  const [burst, setBurst] = useState(0)
  const imgLink = useRef<HTMLAnchorElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const to = `/product/${p.id}`
  const n = p.images.length

  const heart = () => { if (!wished) { setBurst(Date.now()); setTimeout(() => setBurst(0), 800) } toggleWish(p.id) }
  const open = (e: MouseEvent<HTMLElement>) => {
    if (!isPlainClick(e)) return
    e.preventDefault()
    transitionTo(() => nav(to), imgLink.current)
  }
  const scrub = (e: MouseEvent<HTMLElement>) => {
    if (!canHover() || n < 2) return
    setEngaged(true)
    const r = e.currentTarget.getBoundingClientRect()
    setV(Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n))))
  }
  const add = () => { if (addToCart(p.id)) flyToCart(stage.current) }

  return (
    <article onMouseMove={onTilt} onMouseLeave={onTiltLeave} className="pcard tilt border-run flex h-full flex-col rounded-[28px] border border-line bg-surface">
      <div ref={stage} onMouseMove={scrub} onMouseLeave={() => setV(0)} className="relative m-2 aspect-square overflow-hidden rounded-[22px]" style={{ background: 'radial-gradient(80% 80% at 50% 30%, color-mix(in srgb, var(--accent) 22%, transparent), var(--bg-2))' }}>
        <Link ref={imgLink} to={to} onClick={open} aria-label={p.name} className="absolute inset-0 block">
          <div className="float-img absolute inset-0" style={{ animationDelay: `${(p.id % 4) * -1.2}s` }}>
            {p.images.slice(0, engaged ? n : 1).map((src, i) => (
              <img key={src} src={src} alt={i === 0 ? p.name : ''} loading="lazy" decoding="async" width={600} height={600}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${i === v ? 'opacity-100' : 'opacity-0'} ${p.stock === 0 ? 'opacity-50 grayscale' : ''}`} />
            ))}
          </div>
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {d > 0 && <span className="num rounded-full bg-hot px-2.5 py-0.5 text-xs font-bold text-white">-{d}%</span>}
          {p.isNew && <span className="rounded-full bg-lime px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-black">MỚI</span>}
        </div>
        <div className="absolute right-2 top-2">
          <button onClick={heart} aria-pressed={wished} aria-label={wished ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-black/30 backdrop-blur-md">
            <Heart size={17} className={wished ? 'fill-hot text-hot' : 'text-white'} />
          </button>
          {burst > 0 && <span aria-hidden key={burst} className="pointer-events-none absolute left-1/2 top-1/2">{Array.from({ length: 8 }).map((_, i) => <span key={i} className="absolute h-1.5 w-1.5 rounded-full" style={{ background: i % 2 ? 'var(--hot)' : 'var(--accent)', animation: 'burst .7s var(--ease) forwards', ['--dx' as string]: `${Math.cos((i / 8) * 6.28) * 26}px`, ['--dy' as string]: `${Math.sin((i / 8) * 6.28) * 26}px` }} />)}</span>}
        </div>
        <div className="pcard-cta absolute inset-x-3 bottom-3">
          <button className="btn btn-primary btn-sm w-full" disabled={p.stock === 0} onClick={add}><ShoppingBag size={15} />{p.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ'}</button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5 pb-5 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="eyebrow truncate !text-[11px] !tracking-[.08em]">{p.brand} · {catName(p.category)}</div>
          {n > 1 && <div className="-mr-1 flex shrink-0" role="group" aria-label="Chọn ảnh">{p.images.slice(0, 4).map((_, i) => <button key={i} onClick={() => { setEngaged(true); setV(i) }} aria-label={`Ảnh ${i + 1}`} aria-pressed={v === i} className="grid h-6 place-items-center px-[3px]"><span className="pager-dot block" /></button>)}</div>}
        </div>
        <Link to={to} onClick={open} className="line-clamp-2 min-h-11 font-semibold leading-snug hover:text-brand-600">{p.name}</Link>
        <ProductRating p={p} />
        <div className="mt-auto pt-1"><PriceBlock p={p} /></div>
        <button className="btn btn-secondary btn-sm mt-1 w-full [@media(hover:hover)_and_(pointer:fine)]:hidden" disabled={p.stock === 0} onClick={add}><ShoppingBag size={15} />{p.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ'}</button>
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return <div className="rounded-[28px] border border-line bg-surface p-2"><div className="skeleton aspect-square !rounded-[22px]" /><div className="space-y-3 p-4"><div className="skeleton h-3 w-1/2" /><div className="skeleton h-4" /><div className="skeleton h-4 w-2/3" /></div></div>
}

export function EmptyState({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[28px] border border-dashed border-line bg-subtle py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">{icon}</div>
      <p className="font-display text-xl font-semibold">{title}</p>{action}
    </div>
  )
}

/**
 * Field gắn nhãn <label htmlFor> với ô nhập và nối thông báo lỗi bằng aria-describedby
 * (trước đây nhãn không liên kết với input nên trình đọc màn hình và việc bấm vào nhãn đều không hoạt động).
 * `children` là một phần tử input, hoặc hàm nhận props để áp vào input lồng sâu bên trong.
 */
type FieldProps = { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode | ((p: FieldProps) => ReactNode) }) {
  const id = useId()
  const props: FieldProps = { id, 'aria-describedby': error ? `${id}-err` : undefined, 'aria-invalid': error ? true : undefined }
  const body = typeof children === 'function' ? children(props) : isValidElement(children) ? cloneElement(children as React.ReactElement<FieldProps>, props) : children
  return <div><label className="label" htmlFor={id}>{label}</label>{body}{error && <p id={`${id}-err`} className="err" role="alert">{error}</p>}</div>
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <Overlay variant="center" label={title} onClose={onClose} className="glass relative w-full max-w-md !bg-surface p-6">
      <button onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full hover:bg-subtle" aria-label="Đóng"><X size={18} /></button>
      <h3 className="mb-3 pr-8 text-xl font-bold">{title}</h3>{children}
    </Overlay>
  )
}

export { ArrowUpRight }
