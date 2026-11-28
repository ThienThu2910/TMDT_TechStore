import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Minus, Plus, ShieldCheck, Truck, RotateCcw, Heart, PackageX, ShoppingBag, Star, LoaderCircle, SquarePen } from 'lucide-react'
import { vnd, type Review } from '../data'
import { Breadcrumb, EmptyState, PriceBlock, ProductCard, ProductRating, Rating, StockBadge } from '../components'
import { Link, useGo } from '../nav'
import { useStore } from '../store'
import { api } from '../api'
import { flyToCart } from '../hooks'
import { ProductDrawer } from './AdminSections'

/**
 * Vỏ ngoài: dùng `key={id}` để mỗi sản phẩm là một thể hiện riêng.
 * Trước đây bấm "Sản phẩm liên quan" giữ nguyên state => chỉ số ảnh (img) và số lượng của sản phẩm cũ
 * bị mang sang sản phẩm mới (có thể trỏ tới ảnh không tồn tại).
 */
export default function ProductDetail() {
  const { id } = useParams()
  return <ProductView key={id} id={Number(id)} />
}

/* Gallery: cuộn ngang có scroll-snap (vuốt trên điện thoại), phím mũi tên, thumbnail, zoom khi rê chuột trên desktop. */
function Gallery({ images, name, frameRef, onIndex }: { images: string[]; name: string; frameRef: React.RefObject<HTMLDivElement | null>; onIndex: (i: number) => void }) {
  const [i, setI] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const n = images.length
  const go = (k: number) => { const el = scroller.current; if (el) el.scrollTo({ left: ((k + n) % n) * el.clientWidth, behavior: 'smooth' }) }
  const onScroll = () => { const el = scroller.current; if (!el) return; const k = Math.round(el.scrollLeft / el.clientWidth); if (k !== i) { setI(k); onIndex(k) } }
  const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1) } if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1) } }
  return (
    <div className="lg:sticky lg:top-28 lg:self-start">
      <div ref={frameRef} className="vt-product relative overflow-hidden rounded-[28px] border border-line bg-surface-2">
        <div ref={scroller} onScroll={onScroll} onKeyDown={key} tabIndex={0} role="group" aria-roledescription="carousel" aria-label={`Ảnh ${name}`}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
          {images.map((s, k) => (
            <div key={s} className="aspect-square w-full shrink-0 basis-full snap-center overflow-hidden" role="group" aria-roledescription="slide" aria-label={`${k + 1} / ${n}`}>
              <img src={s} alt={k === 0 ? name : `${name}, ảnh ${k + 1}`} width={900} height={900} fetchPriority={k === 0 ? 'high' : 'auto'} loading={k === 0 ? 'eager' : 'lazy'} className="h-full w-full object-cover" draggable={false} />
            </div>
          ))}
        </div>
        {n > 1 && (
          <>
            <button onClick={() => go(i - 1)} aria-label="Ảnh trước" className="glass absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center !rounded-full sm:grid"><ChevronLeft size={18} /></button>
            <button onClick={() => go(i + 1)} aria-label="Ảnh sau" className="glass absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center !rounded-full sm:grid"><ChevronRight size={18} /></button>
            <span className="num glass pointer-events-none absolute bottom-3 right-3 !rounded-full px-3 py-1 text-xs" aria-hidden>{i + 1} / {n}</span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex gap-3">
          {images.map((s, k) => (
            <button key={s} onClick={() => go(k)} aria-label={`Xem ảnh ${k + 1}`} aria-current={k === i} className={`h-20 w-20 overflow-hidden rounded-2xl border-2 transition ${k === i ? 'border-brand-600' : 'border-line opacity-70 hover:opacity-100'}`}><img src={s} alt="" className="h-full w-full object-cover" /></button>
          ))}
        </div>
      )}
    </div>
  )
}

/* Chỉ khách đã nhận hàng mới gửi được đánh giá — máy chủ kiểm tra và trả lời rõ lý do nếu chưa đủ điều kiện. */
function ReviewForm({ productId, onSaved }: { productId: number; onSaved: (list: Review[]) => void }) {
  const { user, toast, refreshCatalog } = useStore()
  const [stars, setStars] = useState(5)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (!user) return <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-2"><Link to={`/account?next=${encodeURIComponent(`/product/${productId}`)}`} className="font-semibold text-brand-600">Đăng nhập</Link> để viết đánh giá sau khi nhận hàng.</p>
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const d = await api.addReview(productId, stars, text)
      onSaved(d.reviewList); setText(''); toast('Cảm ơn bạn đã đánh giá!')
      refreshCatalog().catch(() => { /* điểm trung bình sẽ cập nhật ở lần tải sau */ })
    } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <b>Viết đánh giá của bạn</b>
        <div className="flex" role="radiogroup" aria-label="Số sao">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} sao`} onClick={() => setStars(n)} className="grid h-9 w-8 place-items-center">
              <Star size={20} className={n <= stars ? 'fill-warn text-warn' : 'text-ink-3'} />
            </button>
          ))}
        </div>
      </div>
      <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..." aria-label="Nội dung đánh giá" />
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : 'Gửi đánh giá'}</button>
    </form>
  )
}

function ProductView({ id }: { id: number }) {
  const nav = useGo()
  const { addToCart, cart, wishlist, toggleWish, products, categories, brands, catName, user, toast, refreshCatalog } = useStore()
  const p = products.find((x) => x.id === id)
  const [editingProduct, setEditingProduct] = useState(false)
  const [qty, setQty] = useState(1)
  const [idx, setIdx] = useState(0)
  const [tab, setTab] = useState<'desc' | 'specs' | 'reviews'>('desc')
  const [open, setOpen] = useState<number | null>(0)
  const frame = useRef<HTMLDivElement>(null)
  const buyRef = useRef<HTMLDivElement>(null)
  const barThumb = useRef<HTMLImageElement>(null)
  const [barOn, setBarOn] = useState(false)
  const [reviewList, setReviewList] = useState<Review[] | null>(null)

  // Đánh giá thật của khách lấy từ MySQL
  useEffect(() => {
    let alive = true
    api.product(id).then((d) => { if (alive) setReviewList(d.reviewList) }).catch(() => { if (alive) setReviewList([]) })
    return () => { alive = false }
  }, [id])

  // Thanh mua hàng dính: chỉ hiện khi cụm nút mua chính đã cuộn khỏi màn hình
  useEffect(() => {
    const el = buyRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setBarOn(!e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (!p) return <div className="container-x py-16"><EmptyState icon={<PackageX size={30} />} title="Sản phẩm không tồn tại." action={<Link to="/products" className="btn btn-primary">Khám phá sản phẩm</Link>} /></div>

  const editorCategories = categories
    .filter((category) => typeof category.id === 'number')
    .map((category) => ({ ...category, id: category.id as number }))
  const inCart = cart.find((c) => c.id === p.id)?.qty ?? 0
  const over = qty + inCart > p.stock
  const wished = wishlist.includes(p.id)
  const canBuy = p.stock > 0 && !over
  const policies = [['Đổi trả trong 30 ngày', 'Đổi trả miễn phí nếu sản phẩm lỗi do nhà sản xuất.'], ['Bảo hành chính hãng 12 tháng', 'Bảo hành tại trung tâm ủy quyền trên toàn quốc.']]
  const add = (from?: Element | null) => { if (addToCart(p.id, qty)) flyToCart(from ?? frame.current?.querySelectorAll('img')[idx]) }

  return (
    <div className="container-x pb-28">
      <Breadcrumb items={[{ label: catName(p.category), to: `/products?cat=${p.category}` }, { label: p.name }]} />
      <div className="grid gap-10 lg:grid-cols-[55fr_45fr]">
        <Gallery images={p.images} name={p.name} frameRef={frame} onIndex={setIdx} />
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="eyebrow">{p.brand} · {catName(p.category)}</div>
            {user?.role === 'admin' && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingProduct(true)}><SquarePen size={15} />Sửa sản phẩm</button>}
          </div>
          <h1 className="mt-2 text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-tight">{p.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4"><ProductRating p={p} /><StockBadge stock={p.stock} /></div>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Thông số nổi bật">
            {p.specs.slice(0, 3).map(([k, v]) => <li key={k} className="rounded-full border border-line bg-subtle px-3 py-1 text-xs text-ink-2"><span className="text-ink-3">{k}: </span><b className="font-semibold text-ink">{v}</b></li>)}
          </ul>
          <div className="mt-5 rounded-2xl border border-line bg-subtle p-5"><PriceBlock p={p} large /></div>
          <ul className="mt-5 space-y-2 text-sm text-ink-2">
            <li className="flex items-center gap-2"><Truck size={16} className="text-brand-600" />Giao hàng toàn quốc, miễn phí từ 5.000.000₫</li>
            <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand-600" />Hàng chính hãng, bảo hành 12 tháng</li>
            <li className="flex items-center gap-2"><RotateCcw size={16} className="text-brand-600" />Đổi trả trong 30 ngày</li>
          </ul>
          <div ref={buyRef} className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center rounded-full border border-line" role="group" aria-label="Số lượng">
                <button className="grid h-11 w-11 place-items-center disabled:opacity-40" disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label="Giảm"><Minus size={16} /></button>
                <span className="num w-8 text-center font-semibold" aria-live="polite">{qty}</span>
                <button className="grid h-11 w-11 place-items-center" onClick={() => setQty(qty + 1)} aria-label="Tăng"><Plus size={16} /></button>
              </div>
              <button onClick={() => toggleWish(p.id)} aria-pressed={wished} aria-label={wished ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} className="btn btn-secondary !px-4"><Heart size={18} className={wished ? 'fill-hot text-hot' : ''} /><span className="hidden sm:inline">{wished ? 'Đã thích' : 'Yêu thích'}</span></button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button className="btn btn-secondary btn-lg" disabled={!canBuy} onClick={() => add()}><ShoppingBag size={17} />Thêm vào giỏ</button>
              <button className="btn btn-primary btn-lg" disabled={!canBuy} onClick={() => { if (addToCart(p.id, qty)) nav('/cart') }}>Mua ngay</button>
            </div>
            {over && p.stock > 0 && <p className="err" role="alert">Số lượng vượt tồn kho (còn {p.stock}, trong giỏ {inCart}).</p>}
          </div>
          <div className="mt-6 divide-y divide-line rounded-2xl border border-line">
            {policies.map(([t, d], i) => (
              <div key={t}><button className="flex w-full items-center justify-between px-4 py-3 font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>{t}<Plus size={16} className={`transition ${open === i ? 'rotate-45' : ''}`} /></button>{open === i && <p className="px-4 pb-4 text-sm text-ink-2">{d}</p>}</div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-16">
        <div className="flex gap-6 border-b border-line" role="tablist" aria-label="Thông tin sản phẩm">
          {([['desc', 'Mô tả'], ['specs', 'Thông số kỹ thuật'], ['reviews', `Đánh giá (${p.reviews})`]] as const).map(([k, l]) => (
            <button key={k} role="tab" id={`tab-${k}`} aria-controls={`panel-${k}`} aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px whitespace-nowrap border-b-2 pb-3 font-semibold transition-colors ${tab === k ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-2 hover:text-ink'}`}>{l}</button>
          ))}
        </div>
        <div className="py-6" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'desc' && <p className="max-w-3xl text-base leading-relaxed text-ink-2">{p.description}</p>}
          {tab === 'specs' && <dl className="max-w-2xl divide-y divide-line rounded-2xl border border-line">{p.specs.map(([k, v]) => <div key={k} className="grid grid-cols-[140px_1fr] px-4 py-3"><dt className="text-ink-2">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>}
          {tab === 'reviews' && (
            <div className="max-w-2xl space-y-4">
              <ReviewForm productId={p.id} onSaved={setReviewList} />
              {reviewList === null ? <div className="skeleton h-20" /> : reviewList.length === 0 ? <p className="text-ink-2">Chưa có đánh giá nào cho sản phẩm này.</p>
                : reviewList.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-center justify-between gap-3"><b>{r.customer}</b><Rating value={r.rating} count={0} /></div>
                    {r.comment && <p className="mt-2 text-ink-2">{r.comment}</p>}
                    <p className="mt-2 text-xs text-ink-3">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-6 text-2xl font-bold">Sản phẩm liên quan</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">{products.filter((x) => x.id !== p.id).sort((a, b) => Number(b.category === p.category) - Number(a.category === p.category)).slice(0, 4).map((x) => <ProductCard key={x.id} p={x} />)}</div>
      </section>

      {/* Thanh mua hàng dính: luôn có nút mua trong tầm tay khi người dùng đọc thông số / đánh giá */}
      <div aria-hidden={!barOn} inert={!barOn} className={`glass fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-3xl items-center gap-3 !rounded-2xl p-2.5 pr-3 transition-all duration-500 sm:bottom-5 ${barOn ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[160%] opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease)' }}>
        <img ref={barThumb} src={p.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{p.name}</div><div className="num text-sm font-bold text-brand-600">{vnd(p.price)}</div></div>
        <button className="btn btn-primary shrink-0" disabled={!canBuy} onClick={() => add(barThumb.current)}><ShoppingBag size={16} />{p.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ'}</button>
      </div>
      {editingProduct && <ProductDrawer product={p} cats={editorCategories} brands={brands} onClose={() => setEditingProduct(false)} onSaved={() => {
        setEditingProduct(false)
        toast('Đã cập nhật sản phẩm.')
        refreshCatalog().catch(() => toast('Không tải lại được danh mục sản phẩm.', 'err'))
      }} />}
    </div>
  )
}
