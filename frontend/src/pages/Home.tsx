import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, ArrowUpRight, Cpu, Truck, ShieldCheck, CreditCard, Headphones, Star, Zap, GripVertical } from 'lucide-react'
import { discountPct, shortName, vnd, type LatestReview, type Product } from '../data'
import { EmptyState, ProductCard } from '../components'
import { Link } from '../nav'
import { api } from '../api'
import { CountUp, Magnetic, Reveal, canHover, onSpot, useCountdown } from '../hooks'
import { useStore } from '../store'

const trust = [
  { i: Truck, t: 'Miễn phí vận chuyển', d: 'Đơn từ 5.000.000đ' },
  { i: ShieldCheck, t: 'Bảo hành chính hãng', d: '12 tháng toàn quốc' },
  { i: CreditCard, t: 'Thanh toán COD', d: 'Nhận hàng rồi trả tiền' },
  { i: Headphones, t: 'Hotline 1800 6868', d: 'Hỗ trợ mỗi ngày' },
]

/* =========================================================================
   HERO. "Sân khấu sản phẩm": 3 sản phẩm luân phiên, mọi chip thông tin lấy từ dữ liệu thật của sản phẩm đang hiển thị
   (trước đây chip "Pin 28 giờ" được gắn cứng nên sai khi đổi sang điện thoại / máy tính bảng).
   Tự chuyển bằng chính animation CSS của thanh tiến độ (onAnimationEnd) => không cần setInterval,
   tạm dừng khi rê chuột/focus, và tự tắt khi người dùng bật "giảm chuyển động".
   ========================================================================= */
const DUR = 6500
const tints = [['rgba(91,140,255,.55)', 'rgba(139,92,246,.45)'], ['rgba(255,106,61,.5)', 'rgba(139,92,246,.4)'], ['rgba(61,220,151,.4)', 'rgba(91,140,255,.45)']]

function Hero({ slides, total, rating }: { slides: Product[]; total: number; rating: number }) {
  const { catName } = useStore()
  const SLIDES = slides
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const cur = SLIDES[i % SLIDES.length]
  const d = discountPct(cur)
  const spec = cur.specs[0] ?? ['Thương hiệu', cur.brand]
  const move = (e: React.MouseEvent) => {
    if (!canHover() || !stage.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    stage.current.style.transform = `perspective(1000px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`
  }
  const leave = () => { setPaused(false); if (stage.current) stage.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)' }
  return (
    <section className="container-x relative grid min-h-[min(92vh,880px)] items-center gap-10 overflow-x-clip pb-12 pt-10 lg:grid-cols-12 lg:py-12">
      <div className="lg:col-span-7">
        <span className="glass num inline-flex items-center gap-2 !rounded-full px-4 py-1.5 text-xs text-ink-2"><span className="pulse-dot h-2 w-2 rounded-full bg-lime" />Hàng mới về tuần này</span>
        <h1 className="display mt-6 text-[clamp(2.25rem,9.5vw,3.5rem)] sm:text-[clamp(3rem,5.6vw,5.5rem)]">
          <span className="block">Công nghệ</span>
          <span className="block">bạn <span className="text-grad">khao khát</span>,</span>
          <span className="text-outline block">giao tận tay.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-ink-2 sm:text-lg">Khám phá thiết bị công nghệ chính hãng, ưu đãi phù hợp cho mọi nhu cầu. Thanh toán khi nhận hàng, đổi trả trong 30 ngày.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Magnetic><Link to="/products" className="btn btn-primary btn-lg">Mua ngay <ArrowRight size={18} /></Link></Magnetic>
          <Link to="/products?sale=1" className="btn btn-secondary btn-lg">Xem săn deal</Link>
        </div>
        <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
          {[[<CountUp to={total} />, 'sản phẩm chính hãng'], ...(rating > 0 ? [[<><CountUp to={rating} decimals={1} /><Star size={16} className="ml-1 inline fill-warn text-warn" /></>, 'đánh giá trung bình']] : []), [<CountUp to={30} />, 'ngày đổi trả']].map(([n, l], k) => (
            <div key={k}><dt className="font-display text-3xl font-bold">{n}</dt><dd className="text-sm text-ink-3">{l as string}</dd></div>
          ))}
        </dl>
      </div>

      <div className="parallax relative lg:col-span-5" onMouseMove={move} onMouseEnter={() => setPaused(true)} onMouseLeave={leave} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
        {SLIDES.map((_, n) => (
          <div key={n} aria-hidden className="pointer-events-none absolute inset-[-22%] transition-opacity duration-1000" style={{ opacity: n === i ? 0.9 : 0, background: `radial-gradient(closest-side at 38% 38%, ${tints[n % 3][0]}, transparent), radial-gradient(closest-side at 64% 64%, ${tints[n % 3][1]}, transparent)` }} />
        ))}
        <div ref={stage} className="relative transition-transform duration-200 ease-out" style={{ transformStyle: 'preserve-3d' }}>
          <Link to={`/product/${cur.id}`} className="relative block aspect-[4/5] overflow-hidden rounded-[28px] border border-line bg-surface-2 shadow-2xl" aria-label={`${cur.name}, xem chi tiết`}>
            {SLIDES.map((p, n) => (
              <div key={p.id} className="hero-slide absolute inset-0" data-on={n === i} aria-hidden={n !== i}>
                <img src={p.images[n === 0 ? 1 : 0] ?? p.images[0]} alt={n === i ? p.name : ''} width={800} height={1000} fetchPriority={n === 0 ? 'high' : 'low'} className="h-full w-full object-cover" />
              </div>
            ))}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          </Link>
          <div key={'a' + i} className="hero-info glass absolute left-2 top-10 flex items-center gap-2 !rounded-2xl px-4 py-3 text-sm sm:-left-10" style={{ transform: 'translateZ(60px)' }}><Cpu size={18} className="text-lime" /><span><span className="text-ink-2">{spec[0]} </span><b className="font-semibold">{spec[1]}</b></span></div>
          {(d > 0 || cur.isNew) && (
            <div key={'b' + i} className="hero-info glass absolute right-2 top-1/3 flex items-center gap-2 !rounded-2xl px-4 py-3 text-sm sm:-right-4" style={{ transform: 'translateZ(80px)' }}>
              {d > 0 ? <><span className="num font-bold text-hot">-{d}%</span>giá niêm yết</> : <><span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold text-black">MỚI</span>về kho</>}
            </div>
          )}
          <div className="glass float absolute left-2 bottom-24 flex items-center gap-2 !rounded-2xl px-4 py-3 text-sm sm:-left-8" style={{ animationDelay: '-4s', transform: 'translateZ(50px)' }}><Zap size={18} className="text-brand-600" />Giao 2h</div>
          <div key={'c' + i} className="hero-info glass absolute inset-x-4 -bottom-5 flex items-center justify-between !rounded-2xl px-5 py-3">
            <span className="truncate pr-3 text-sm font-semibold">{cur.name}</span><span className="num shrink-0 font-bold">{vnd(cur.price)}</span>
          </div>
        </div>
        <div className="mt-12 grid grid-cols-3 gap-3" role="tablist" aria-label="Sản phẩm nổi bật">
          {SLIDES.map((p, n) => (
            <button key={p.id} role="tab" aria-selected={n === i} onClick={() => setI(n)} className={`group text-left transition-opacity ${n === i ? 'opacity-100' : 'opacity-55 hover:opacity-100'}`}>
              <span className="relative block h-0.5 overflow-hidden rounded-full bg-line">
                {n === i && <span key={i} className="hero-fill absolute inset-0 rounded-full" style={{ background: 'var(--grad-brand)', ['--dur' as string]: `${DUR}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                  onAnimationEnd={(e) => { if (e.animationName === 'heroFill') setI((x) => (x + 1) % SLIDES.length) }} />}
              </span>
              <span className="num mt-2 block text-xs text-ink-3">0{n + 1}</span>
              <span className="block truncate text-sm font-semibold">{catName(p.category)}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function TrustStrip() {
  return (
    <section className="container-x">
      <ul className="grid grid-cols-2 divide-line border-y border-line lg:grid-cols-4 lg:divide-x">
        {trust.map((t, i) => (
          <li key={t.t} className={`flex items-center gap-3 px-2 py-5 lg:px-6 ${i % 2 === 1 ? 'border-l border-line lg:border-l-0' : ''} ${i > 1 ? 'border-t border-line lg:border-t-0' : ''}`}>
            <t.i size={26} strokeWidth={1.5} className="shrink-0 text-brand-600" />
            <div><div className="text-sm font-semibold">{t.t}</div><div className="text-xs text-ink-3">{t.d}</div></div>
          </li>
        ))}
      </ul>
    </section>
  )
}

const bentoLayout = ['sm:col-span-2 lg:col-span-2 lg:row-span-2', 'lg:col-span-1', 'lg:col-span-1', 'sm:col-span-2 lg:col-span-2', 'lg:col-span-1']

function Bento() {
  const time = useCountdown()
  const { products, categories } = useStore()
  const maxOff = Math.max(0, ...products.map(discountPct))
  const onSale = products.filter((p) => p.originalPrice).length
  return (
    <section className="container-x section-gap">
      <Reveal><h2 className="h-section">Mua theo <span className="text-outline">danh mục</span></h2></Reveal>
      <div className="no-scrollbar -mx-4 mt-10 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:auto-rows-[220px] sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {categories.map((c, i) => {
          const slug = c.slug
          const inCat = products.filter((p) => p.category === slug)
          const n = inCat.length
          const cover = inCat[0] ? (inCat[0].images[1] ?? inCat[0].images[0]) : ''
          const big = i === 0
          return (
            <Reveal key={slug} delay={i * 80} className={`min-w-[78%] snap-start sm:min-w-0 ${bentoLayout[i] ?? 'lg:col-span-1'}`}>
              <Link to={`/products?cat=${slug}`} onMouseMove={onSpot} className="spot group relative block h-full min-h-[240px] overflow-hidden rounded-[28px] border border-line bg-surface-2">
                {cover && <img src={cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-[1.06]" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <span className="absolute right-4 top-4 grid h-10 w-10 -translate-x-2 translate-y-2 place-items-center rounded-full bg-white/90 text-black opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"><ArrowUpRight size={18} /></span>
                <div className="absolute inset-x-0 bottom-0 z-[3] p-6 text-white">
                  <div className="num text-xs text-white/70">{n} sản phẩm</div>
                  <div className={`font-display font-bold tracking-tight ${big ? 'text-5xl' : 'text-2xl'}`}>{c.name}</div>
                </div>
              </Link>
            </Reveal>
          )
        })}
        <Reveal delay={400} className="min-w-[78%] snap-start sm:col-span-2 sm:min-w-0 lg:col-span-3">
          <Link to="/products?sale=1" className="group relative flex h-full min-h-[240px] flex-col justify-between overflow-hidden rounded-[28px] p-6 text-white sm:flex-row sm:items-end" style={{ background: 'linear-gradient(135deg, #ff6a3d, #ff3d71 70%, #8b5cf6)' }}>
            <div>
              <span className="eyebrow !text-white/80">Săn deal hôm nay</span>
              <div className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{maxOff > 0 ? <>Giảm đến {maxOff}%<br />{onSale} sản phẩm đang sale</> : <>Ưu đãi mỗi ngày<br />cho đơn đầu tiên</>}</div>
            </div>
            <div className="text-right"><div className="mb-1 text-xs text-white/80">Kết thúc sau</div><div className="num rounded-2xl bg-black/25 px-4 py-2 text-3xl font-bold backdrop-blur" aria-label={`Còn ${time}`}>{time}</div></div>
            <ArrowUpRight size={22} className="absolute right-5 top-5 -translate-x-2 translate-y-2 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

function Featured() {
  const { products } = useStore()
  return (
    <section className="container-x section-gap">
      <div className="flex items-end justify-between gap-4">
        <Reveal><h2 className="h-section">Sản phẩm <span className="text-grad">nổi bật</span></h2></Reveal>
        <Link to="/products" className="group relative shrink-0 pb-1 text-sm font-semibold">Xem tất cả →<span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-ink transition-transform duration-300 group-hover:scale-x-100" /></Link>
      </div>
      <div className="no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 lg:gap-6">
        {products.slice(0, 4).map((p, i) => <Reveal key={p.id} delay={i * 80} className="min-w-[72%] snap-start sm:min-w-0"><ProductCard p={p} /></Reveal>)}
      </div>
    </section>
  )
}

function Brands() {
  const { brands } = useStore()
  const row = (k: number) => <div className="marquee__track" aria-hidden={k > 0}>{brands.concat(brands).map((b, i) => <span key={i} className="font-display text-4xl font-bold tracking-tight text-ink-3 transition-colors hover:text-ink sm:text-5xl">{b}</span>)}</div>
  return (
    <section className="section-gap" aria-label="Thương hiệu">
      <div className="eyebrow mb-8 text-center">Thương hiệu đồng hành</div>
      <div className="marquee">{row(0)}{row(1)}</div>
    </section>
  )
}

function Compare({ a, b }: { a: Product; b: Product }) {
  const [pos, setPos] = useState(50)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const set = (x: number) => { const r = box.current!.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100))) }
  // Chỉ so sánh những thông số mà cả hai sản phẩm cùng có
  const spec = (p: Product, k: string) => p.specs.find((s) => s[0] === k)?.[1] ?? '—'
  const keys = a.specs.map((s) => s[0]).filter((k) => b.specs.some((s) => s[0] === k)).slice(0, 3)
  const rows = [...keys.map((k) => [k, spec(a, k), spec(b, k)]), ['Giá', vnd(a.price), vnd(b.price)]]
  return (
    <section className="container-x section-gap">
      <Reveal><h2 className="h-section max-w-2xl">So sánh <span className="text-outline">nhanh</span></h2></Reveal>
      <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div ref={box} className="relative aspect-[4/3] cursor-ew-resize touch-none select-none overflow-hidden rounded-[28px] border border-line"
          onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); set(e.clientX) }} onPointerMove={(e) => drag.current && set(e.clientX)} onPointerUp={() => (drag.current = false)}>
          <img src={b.images[0]} alt={b.name} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}><img src={a.images[0]} alt={a.name} className="h-full w-full object-cover" draggable={false} /></div>
          <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${pos}%` }}><span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-lg"><GripVertical size={18} /></span></div>
          <span className="glass absolute left-4 top-4 !rounded-full px-3 py-1 text-xs text-white">{shortName(a.name)}</span>
          <span className="glass absolute right-4 top-4 !rounded-full px-3 py-1 text-xs text-white">{shortName(b.name)}</span>
          <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} aria-label="Kéo để so sánh ảnh hai sản phẩm" className="sr-only" />
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-ink-3"><th className="p-4 font-medium" /><th className="p-4 font-semibold text-ink">{shortName(a.name)}</th><th className="p-4 font-semibold text-ink">{shortName(b.name)}</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map(([k, x, y]) => <tr key={k}><td className="p-4 text-ink-3">{k}</td><td className="num p-4">{x}</td><td className="num p-4">{y}</td></tr>)}
            </tbody>
          </table>
          <div className="flex gap-2 p-4"><Link to={`/product/${a.id}`} className="btn btn-secondary btn-sm min-w-0 flex-1"><span className="truncate">Xem {a.brand}</span></Link><Link to={`/product/${b.id}`} className="btn btn-secondary btn-sm min-w-0 flex-1"><span className="truncate">Xem {b.brand}</span></Link></div>
        </div>
      </div>
    </section>
  )
}

function Reviews({ items }: { items: LatestReview[] }) {
  if (items.length < 2) return null
  const half = Math.ceil(items.length / 2)
  const col = (list: LatestReview[], rev: boolean) => (
    <div className="vwrap h-[460px] overflow-hidden" style={{ maskImage: 'linear-gradient(180deg, transparent, #000 15%, #000 85%, transparent)' }}>
      <div className={`vmarquee ${rev ? 'rev' : ''}`}>
        {[...list, ...list].map((r, i) => (
          <figure key={i} className="glass !rounded-[22px] p-5" aria-hidden={i >= list.length}>
            <div className="flex gap-0.5" aria-label={`${r.rating} trên 5 sao`}>{Array.from({ length: 5 }).map((_, s) => <Star key={s} size={14} className={s < r.rating ? 'fill-warn text-warn' : 'text-ink-3'} />)}</div>
            <blockquote className="mt-3 text-sm text-ink">{r.comment}</blockquote>
            <figcaption className="mt-3 text-xs text-ink-3"><b className="text-ink-2">{r.customer}</b> · {r.product}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
  return (
    <section className="container-x section-gap grid items-center gap-10 lg:grid-cols-[1fr_1.4fr]">
      <Reveal><h2 className="h-section">Khách hàng<br /><span className="text-grad">nói gì</span></h2><p className="mt-4 text-ink-2">Đánh giá thật từ những khách đã nhận hàng tại TECHSTORE.</p></Reveal>
      <div className="grid gap-4 sm:grid-cols-2">{col(items.slice(0, half), false)}{col(items.slice(half), true)}</div>
    </section>
  )
}

function Newsletter() {
  const { toast } = useStore()
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Email không hợp lệ.')
    setErr(''); setBusy(true)
    try { await api.subscribe(email.trim()); setEmail(''); toast('Cảm ơn bạn đã đăng ký nhận ưu đãi.') } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <section className="container-x section-gap">
      <Reveal>
        <div className="relative overflow-hidden rounded-[36px] p-8 text-white sm:p-16" style={{ background: 'var(--grad-brand)' }}>
          <h2 className="h-section max-w-2xl !text-white">Nhận ưu đãi trước mọi người.</h2>
          <p className="mt-4 max-w-lg text-white/85">Đăng ký email để biết sớm hàng mới về và chương trình săn deal.</p>
          <form onSubmit={submit} noValidate className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <div className="flex-1"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email của bạn" aria-label="Email nhận ưu đãi" aria-invalid={!!err} className="h-14 w-full rounded-full border border-white/30 bg-black/25 px-6 text-white outline-none backdrop-blur placeholder:text-white/60 focus:border-white" />{err && <p className="mt-1 pl-4 text-xs text-white">{err}</p>}</div>
            <button className="btn btn-lg h-14 bg-white text-black" disabled={busy}>Đăng ký</button>
          </form>
        </div>
      </Reveal>
    </section>
  )
}

export default function Home() {
  const { products, latestReviews } = useStore()
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])
  if (!products.length) {
    return <div className="container-x py-16"><EmptyState icon={<Cpu size={30} />} title="Cửa hàng chưa có sản phẩm nào." action={<Link to="/account" className="btn btn-primary">Đăng nhập quản trị để thêm sản phẩm</Link>} /></div>
  }
  const rated = products.filter((p) => p.reviews > 0)
  const rating = rated.length ? rated.reduce((s, p) => s + p.rating * p.reviews, 0) / rated.reduce((s, p) => s + p.reviews, 0) : 0
  const a = products[0]
  const b = products.find((x) => x.id !== a.id && x.category === a.category) ?? products[1]
  const more = products.slice(4, 8)
  return (
    <div data-ready={ready}>
      <Hero slides={products.slice(0, 3)} total={products.length} rating={Math.round(rating * 10) / 10} />
      <TrustStrip />
      <Bento />
      <Featured />
      <Brands />
      {b && <Compare a={a} b={b} />}
      <section className="container-x section-gap">
        <Reveal><h2 className="h-section">Mới &amp; được <span className="text-outline">yêu thích</span></h2></Reveal>
        <div className="no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 lg:gap-6">
          {(more.length ? more : products.slice(0, 4)).map((p, i) => <Reveal key={p.id} delay={i * 80} className="min-w-[72%] snap-start sm:min-w-0"><ProductCard p={p} /></Reveal>)}
        </div>
      </section>
      <Reviews items={latestReviews} />
      <Newsletter />
    </div>
  )
}
