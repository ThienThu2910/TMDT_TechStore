import { useMemo, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X, SearchX, ChevronLeft, ChevronRight } from 'lucide-react'
import { fold, vnd } from '../data'
import { Breadcrumb, EmptyState, Overlay, ProductCard } from '../components'
import { useStore } from '../store'

const PAGE = 6
const sorts = [['default', 'Mặc định'], ['asc', 'Giá thấp đến cao'], ['desc', 'Giá cao đến thấp'], ['new', 'Mới nhất'], ['best', 'Bán chạy']]
// Khoảng giá chọn nhanh: [nhãn, từ, đến]
const priceBands: [string, string, string][] = [['Dưới 10 triệu', '', '10000000'], ['10 – 20 triệu', '10000000', '20000000'], ['Trên 20 triệu', '20000000', '']]

export default function Products() {
  const [sp, setSp] = useSearchParams()
  const { wishlist, products, categories, brands, catName } = useStore()
  const [sheet, setSheet] = useState(false)
  const q = sp.get('q') ?? '', cat = sp.get('cat') ?? '', brand = sp.get('brand') ?? ''
  const min = sp.get('min') ?? '', max = sp.get('max') ?? '', inStock = sp.get('stock') === '1'
  const sale = sp.get('sale') === '1', wish = sp.get('wish') === '1'
  const sort = sp.get('sort') ?? 'default'

  // Toàn bộ danh mục đã được tải từ MySQL khi mở trang nên lọc / sắp xếp diễn ra tức thì ngay trên trình duyệt.
  const setMany = (kv: Record<string, string>) => {
    const n = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(kv)) { if (v) n.set(k, v); else n.delete(k) }
    if (!('page' in kv)) n.delete('page')
    setSp(n, { replace: true })
  }
  const set = (k: string, v: string) => setMany({ [k]: v })

  const list = useMemo(() => {
    const s = fold(q.trim())
    let r = products.filter((p) =>
      (!s || fold(p.name + ' ' + p.brand + ' ' + catName(p.category)).includes(s)) && (!cat || p.category === cat) && (!brand || p.brand === brand) &&
      (!min || p.price >= Number(min)) && (!max || p.price <= Number(max)) && (!inStock || p.stock > 0) &&
      (!sale || p.originalPrice) && (!wish || wishlist.includes(p.id)))
    if (sort === 'asc') r = [...r].sort((a, b) => a.price - b.price)
    if (sort === 'desc') r = [...r].sort((a, b) => b.price - a.price)
    if (sort === 'new') r = [...r].sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew) || b.id - a.id)
    if (sort === 'best') r = [...r].sort((a, b) => b.sold - a.sold)
    return r
  }, [products, q, cat, brand, min, max, inStock, sale, wish, sort, wishlist, catName])

  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  // Kẹp số trang vào khoảng hợp lệ: ?page=99 hoặc ?page=abc không còn cho ra trang trống.
  const page = Math.min(pages, Math.max(1, Math.floor(Number(sp.get('page'))) || 1))
  const shown = list.slice((page - 1) * PAGE, page * PAGE)
  const chips: [string, string][] = ([
    q && ['q', `Từ khóa: ${q}`], cat && ['cat', catName(cat)], brand && ['brand', brand],
    min && ['min', `Từ ${vnd(Number(min))}`], max && ['max', `Đến ${vnd(Number(max))}`],
    inStock && ['stock', 'Còn hàng'], sale && ['sale', 'Đang giảm giá'], wish && ['wish', 'Yêu thích'],
  ] as const).filter(Boolean) as unknown as [string, string][]

  const filters = (
    <div className="space-y-7">
      <div>
        <h3 className="mb-3 font-semibold">Danh mục</h3>
        <div className="flex flex-wrap gap-2">{[{ slug: '', name: 'Tất cả' }, ...categories].map((c) => (
          <button key={c.slug} className="chip" aria-pressed={cat === c.slug} onClick={() => set('cat', c.slug)}>{c.name}</button>
        ))}</div>
      </div>
      <div>
        <h3 className="mb-3 font-semibold">Thương hiệu</h3>
        <div className="flex flex-wrap gap-2">{['', ...brands].map((b) => (
          <button key={b} className="chip" aria-pressed={brand === b} onClick={() => set('brand', b)}>{b || 'Tất cả'}</button>
        ))}</div>
      </div>
      <div>
        <h3 className="mb-3 font-semibold">Khoảng giá</h3>
        <div className="mb-3 flex flex-wrap gap-2">{priceBands.map(([l, a, b]) => (
          <button key={l} className="chip" aria-pressed={min === a && max === b} onClick={() => setMany(min === a && max === b ? { min: '', max: '' } : { min: a, max: b })}>{l}</button>
        ))}</div>
        <div className="flex items-center gap-2">
          <input className="input h-10 px-3 text-sm" inputMode="numeric" placeholder="Từ (₫)" aria-label="Giá tối thiểu" value={min} onChange={(e) => set('min', e.target.value.replace(/\D/g, ''))} />
          <span aria-hidden>–</span>
          <input className="input h-10 px-3 text-sm" inputMode="numeric" placeholder="Đến (₫)" aria-label="Giá tối đa" value={max} onChange={(e) => set('max', e.target.value.replace(/\D/g, ''))} />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" checked={inStock} onChange={(e) => set('stock', e.target.checked ? '1' : '')} className="h-4 w-4 accent-brand-600" />Chỉ hiện sản phẩm còn hàng</label>
      <button className="btn btn-secondary w-full" disabled={chips.length === 0 && sort === 'default'} onClick={() => setSp({}, { replace: true })}>Xóa bộ lọc</button>
    </div>
  )

  return (
    <div className="container-x pb-4">
      <Breadcrumb items={[{ label: 'Sản phẩm' }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(1.875rem,4vw,2.5rem)] font-bold leading-tight">{cat ? catName(cat) : 'Sản phẩm công nghệ'}</h1>
          <p className="text-ink-2" aria-live="polite"><span className="num">{list.length}</span> kết quả</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary lg:hidden" onClick={() => setSheet(true)}><SlidersHorizontal size={16} />Bộ lọc{chips.length > 0 && <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] text-white">{chips.length}</span>}</button>
          <select className="input w-auto" value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sắp xếp">{sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden self-start lg:sticky lg:top-28 lg:block">{filters}</aside>
        <div>
          {chips.length > 0 && (
            <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
              {chips.map(([k, l]) => <button key={k} onClick={() => set(k, '')} aria-label={`Bỏ lọc ${l}`} className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600">{l}<X size={12} /></button>)}
            </div>
          )}
          {shown.length === 0 ? (
            <EmptyState icon={<SearchX size={30} />} title="Chưa tìm thấy sản phẩm phù hợp." action={<button className="btn btn-primary" onClick={() => setSp({}, { replace: true })}>Xóa bộ lọc</button>} />
          ) : (
            // `key` đổi theo bộ lọc => danh sách kết quả mới hiện lần lượt (stagger) thay vì nhảy cục
            <div key={sp.toString()} className="stagger grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
              {shown.map((p, n) => <div key={p.id} style={{ '--i': n } as CSSProperties}><ProductCard p={p} /></div>)}
            </div>
          )}
          {pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Phân trang">
              <button className="grid h-10 w-10 place-items-center rounded-full border border-line hover:bg-subtle disabled:opacity-40" disabled={page <= 1} onClick={() => set('page', String(page - 1))} aria-label="Trang trước"><ChevronLeft size={16} /></button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => set('page', String(n))} aria-current={n === page ? 'page' : undefined} className={`num h-10 w-10 rounded-full border text-sm font-semibold ${n === page ? 'border-transparent text-white' : 'border-line hover:bg-subtle'}`} style={n === page ? { background: 'var(--grad-brand)' } : undefined}>{n}</button>
              ))}
              <button className="grid h-10 w-10 place-items-center rounded-full border border-line hover:bg-subtle disabled:opacity-40" disabled={page >= pages} onClick={() => set('page', String(page + 1))} aria-label="Trang sau"><ChevronRight size={16} /></button>
            </nav>
          )}
        </div>
      </div>
      {sheet && (
        <Overlay variant="bottom" label="Bộ lọc" onClose={() => setSheet(false)} className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl border-t border-line bg-surface p-5">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">Bộ lọc</h2><button onClick={() => setSheet(false)} aria-label="Đóng" className="grid h-10 w-10 place-items-center rounded-full hover:bg-subtle"><X size={20} /></button></div>
          {filters}
          <button className="btn btn-primary btn-lg mt-6 w-full" onClick={() => setSheet(false)}>Xem {list.length} kết quả</button>
        </Overlay>
      )}
    </div>
  )
}
