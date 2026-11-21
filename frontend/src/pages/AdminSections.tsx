import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Archive, LoaderCircle, Lock, LockOpen, Plus, RotateCcw, Search, SquarePen, X } from 'lucide-react'
import { fold, vnd, type Product } from '../data'
import { Field, Modal, Overlay } from '../components'
import { useStore } from '../store'
import { api, type AdminCoupon, type AdminCustomer, type ProductInput } from '../api'
import { LoadError, Loading } from './AdminUi'

type Cat = { id: number; name: string; slug: string }
const digits = (v: string) => v.replace(/\D/g, '')

/* =========================================================================================
   SẢN PHẨM — thêm / sửa / ngừng bán, mọi thay đổi được ghi thẳng vào MySQL
   ========================================================================================= */
const statusText = { active: 'Đang bán', draft: 'Bản nháp', archived: 'Ngừng bán' } as const
const statusColor = { active: 'bg-ok/15 text-ok', draft: 'bg-warn/15 text-warn', archived: 'bg-subtle text-ink-3' } as const

type PForm = { name: string; brand: string; categoryId: string; price: string; originalPrice: string; stock: string; description: string; images: string; specs: string; isNew: boolean; isFeatured: boolean; status: 'active' | 'draft' | 'archived' }

const emptyForm = (cats: Cat[]): PForm => ({ name: '', brand: '', categoryId: String(cats[0]?.id ?? ''), price: '', originalPrice: '', stock: '10', description: '', images: '', specs: '', isNew: false, isFeatured: false, status: 'active' })
const fromProduct = (p: Product, cats: Cat[]): PForm => ({
  name: p.name, brand: p.brand, categoryId: String(cats.find((c) => c.slug === p.category)?.id ?? cats[0]?.id ?? ''), price: String(p.price), originalPrice: p.originalPrice ? String(p.originalPrice) : '',
  stock: String(p.stock), description: p.description, images: p.images.join('\n'), specs: p.specs.map(([k, v]) => `${k}: ${v}`).join('\n'),
  isNew: !!p.isNew, isFeatured: !!p.isFeatured, status: p.status ?? 'active',
})
const toInput = (f: PForm): ProductInput => ({
  name: f.name.trim(), brand: f.brand.trim(), categoryId: Number(f.categoryId), price: Number(f.price), originalPrice: f.originalPrice ? Number(f.originalPrice) : null,
  stock: Number(f.stock || 0), description: f.description.trim(), isNew: f.isNew, isFeatured: f.isFeatured, status: f.status,
  images: f.images.split('\n').map((s) => s.trim()).filter(Boolean),
  specs: f.specs.split('\n').map((l) => { const i = l.indexOf(':'); return i > 0 ? ([l.slice(0, i).trim(), l.slice(i + 1).trim()] as [string, string]) : null }).filter((x): x is [string, string] => !!x && !!x[0] && !!x[1]),
})

export function ProductsTab() {
  const { toast, refreshCatalog } = useStore()
  const [data, setData] = useState<{ products: Product[]; categories: Cat[]; brands: { id: number; name: string }[] } | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [fs, setFs] = useState('')
  const [edit, setEdit] = useState<Product | 'new' | null>(null)
  const [archive, setArchive] = useState<Product | null>(null)
  const [busy, setBusy] = useState(false)
  const load = () => { setErr(''); api.admin.products().then(setData).catch((e: Error) => setErr(e.message)) }
  useEffect(load, [])

  const rows = useMemo(() => (data?.products ?? []).filter((p) => (!fs || p.status === fs) && (!q || fold(`${p.name} ${p.brand}`).includes(fold(q.trim())))), [data, q, fs])
  if (err) return <LoadError message={err} onRetry={load} />
  if (!data) return <Loading rows={6} />

  const saved = (p: Product, isNew: boolean) => {
    setData({ ...data, products: isNew ? [p, ...data.products] : data.products.map((x) => (x.id === p.id ? p : x)) })
    setEdit(null); toast(isNew ? 'Đã thêm sản phẩm.' : 'Đã lưu thay đổi.'); refreshCatalog().catch(() => {})
  }
  const setStatus = async (p: Product, status: 'active' | 'archived') => {
    setBusy(true)
    try {
      const out = status === 'archived' ? await api.admin.archiveProduct(p.id) : await api.admin.updateProduct(p.id, { ...toInput(fromProduct(p, data.categories)), status: 'active' })
      setData({ ...data, products: data.products.map((x) => (x.id === out.id ? out : x)) })
      toast(status === 'archived' ? 'Đã ngừng bán sản phẩm.' : 'Sản phẩm đã được bán trở lại.'); refreshCatalog().catch(() => {})
    } catch (e) { toast((e as Error).message, 'err') } finally { setBusy(false); setArchive(null) }
  }

  return (
    <>
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-5">
          <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><input className="input pl-9" placeholder="Tìm tên sản phẩm hoặc thương hiệu" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm sản phẩm" /></div>
          <select className="input w-auto" value={fs} onChange={(e) => setFs(e.target.value)} aria-label="Lọc trạng thái"><option value="">Tất cả trạng thái</option>{Object.entries(statusText).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button className="btn btn-primary" onClick={() => setEdit('new')}><Plus size={16} />Thêm sản phẩm</button>
        </div>
        {rows.length === 0 ? <p className="p-10 text-center text-ink-2">Không có sản phẩm nào phù hợp.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-y border-line bg-subtle text-xs uppercase text-ink-2"><tr>{['Sản phẩm', 'Giá bán', 'Tồn kho', 'Đã bán', 'Trạng thái', ''].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-subtle">
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><img src={p.images[0]} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /><div className="min-w-0"><div className="line-clamp-1 max-w-[320px] font-semibold">{p.name}</div><div className="text-xs text-ink-3">{p.brand}</div></div></div></td>
                    <td className="num px-5 py-3 font-medium">{vnd(p.price)}</td>
                    <td className="px-5 py-3"><span className={`num font-semibold ${p.stock === 0 ? 'text-danger' : p.stock <= 5 ? 'text-warn' : ''}`}>{p.stock}</span></td>
                    <td className="num px-5 py-3 text-ink-2">{p.sold}</td>
                    <td className="px-5 py-3"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor[p.status ?? 'active']}`}>{statusText[p.status ?? 'active']}</span></td>
                    <td className="px-5 py-3"><div className="flex justify-end gap-1.5">
                      <button className="btn btn-secondary btn-sm" onClick={() => setEdit(p)} aria-label={`Sửa ${p.name}`}><SquarePen size={14} />Sửa</button>
                      {p.status === 'archived' ? <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setStatus(p, 'active')} aria-label={`Bán lại ${p.name}`}><RotateCcw size={14} />Bán lại</button>
                        : <button className="btn btn-danger btn-sm" onClick={() => setArchive(p)} aria-label={`Ngừng bán ${p.name}`}><Archive size={14} />Ngừng bán</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-line p-4 text-sm text-ink-2">{rows.length} / {data.products.length} sản phẩm</div>
      </section>
      {edit && <ProductDrawer product={edit === 'new' ? null : edit} cats={data.categories} brands={data.brands.map((b) => b.name)} onClose={() => setEdit(null)} onSaved={saved} />}
      {archive && (
        <Modal title="Ngừng bán sản phẩm?" onClose={() => setArchive(null)}>
          <p className="text-ink-2">“{archive.name}” sẽ không còn hiển thị trên cửa hàng. Lịch sử đơn hàng vẫn được giữ nguyên và bạn có thể bán lại bất cứ lúc nào.</p>
          <div className="mt-5 flex justify-end gap-2"><button className="btn btn-secondary" onClick={() => setArchive(null)}>Quay lại</button><button className="btn btn-hot" disabled={busy} onClick={() => setStatus(archive, 'archived')}>Ngừng bán</button></div>
        </Modal>
      )}
    </>
  )
}

function ProductDrawer({ product, cats, brands, onClose, onSaved }: { product: Product | null; cats: Cat[]; brands: string[]; onClose: () => void; onSaved: (p: Product, isNew: boolean) => void }) {
  const [f, setF] = useState<PForm>(() => (product ? fromProduct(product, cats) : emptyForm(cats)))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [apiErr, setApiErr] = useState('')
  const [busy, setBusy] = useState(false)
  // sửa ô nào thì xóa lỗi của ô đó ngay, không đợi tới lần bấm lưu kế tiếp
  const set = <K extends keyof PForm>(k: K, v: PForm[K]) => { setF((x) => ({ ...x, [k]: v })); setErrs((er) => { const { [k]: _drop, ...rest } = er; return rest }) }

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setApiErr('')
    const inp = toInput(f), er: Record<string, string> = {}
    if (inp.name.length < 2) er.name = 'Vui lòng nhập tên sản phẩm.'
    if (!inp.brand) er.brand = 'Vui lòng nhập thương hiệu.'
    if (!inp.categoryId) er.categoryId = 'Vui lòng chọn danh mục.'
    if (!(inp.price >= 1000)) er.price = 'Giá bán tối thiểu 1.000₫.'
    if (inp.originalPrice !== null && inp.originalPrice < inp.price) er.originalPrice = 'Giá niêm yết phải lớn hơn hoặc bằng giá bán.'
    if (!inp.images.length) er.images = 'Cần ít nhất một đường dẫn ảnh (mỗi dòng một ảnh).'
    setErrs(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try { onSaved(product ? await api.admin.updateProduct(product.id, inp) : await api.admin.createProduct(inp), !product) } catch (x) { setApiErr((x as Error).message); setBusy(false) }
  }

  return (
    <Overlay variant="right" label={product ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={onClose} className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-line bg-surface p-6 shadow-2xl">
      <button onClick={onClose} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full hover:bg-subtle" aria-label="Đóng"><X size={18} /></button>
      <h2 className="pr-10 text-xl font-bold">{product ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        {apiErr && <p className="rounded-xl bg-danger/15 p-3 text-sm text-danger" role="alert">{apiErr}</p>}
        <Field label="Tên sản phẩm" error={errs.name}><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Thương hiệu" error={errs.brand}><input className="input" list="brand-list" value={f.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Chọn hoặc gõ thương hiệu mới" /></Field>
          <Field label="Danh mục" error={errs.categoryId}><select className="input" value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        </div>
        <datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Giá bán (₫)" error={errs.price}><input className="input" inputMode="numeric" value={f.price} onChange={(e) => set('price', digits(e.target.value))} /></Field>
          <Field label="Giá niêm yết (₫)" error={errs.originalPrice}><input className="input" inputMode="numeric" value={f.originalPrice} onChange={(e) => set('originalPrice', digits(e.target.value))} placeholder="Để trống nếu không giảm" /></Field>
          <Field label="Tồn kho"><input className="input" inputMode="numeric" value={f.stock} onChange={(e) => set('stock', digits(e.target.value))} /></Field>
        </div>
        <Field label="Ảnh sản phẩm (mỗi dòng một đường dẫn)" error={errs.images}><textarea className="input min-h-[96px] font-mono text-xs" value={f.images} onChange={(e) => set('images', e.target.value)} placeholder="https://..." /></Field>
        <Field label="Thông số kỹ thuật (mỗi dòng dạng “Tên: Giá trị”)"><textarea className="input min-h-[96px]" value={f.specs} onChange={(e) => set('specs', e.target.value)} placeholder={'Chip: Apple M3\nRAM: 8GB'} /></Field>
        <Field label="Mô tả"><textarea className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.isNew} onChange={(e) => set('isNew', e.target.checked)} />Nhãn “Mới”</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />Nổi bật (lên đầu trang chủ)</label>
          <label className="ml-auto flex items-center gap-2 text-sm">Trạng thái
            <select className="input h-10 w-auto" value={f.status} onChange={(e) => set('status', e.target.value as PForm['status'])}>{Object.entries(statusText).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4"><button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : product ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button></div>
      </form>
    </Overlay>
  )
}

/* =========================================================================================
   KHÁCH HÀNG
   ========================================================================================= */
export function CustomersTab() {
  const { toast } = useStore()
  const [rows, setRows] = useState<AdminCustomer[] | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const load = () => { setErr(''); api.admin.customers().then(setRows).catch((e: Error) => setErr(e.message)) }
  useEffect(load, [])

  if (err) return <LoadError message={err} onRetry={load} />
  if (!rows) return <Loading rows={5} />
  const shown = rows.filter((c) => !q || fold(`${c.name} ${c.email} ${c.phone}`).includes(fold(q.trim())))
  const toggle = async (c: AdminCustomer) => {
    const status = c.status === 'active' ? 'locked' : 'active'
    try { await api.admin.setCustomerStatus(c.id, status); setRows(rows.map((x) => (x.id === c.id ? { ...x, status } : x))); toast(status === 'locked' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.') } catch (e) { toast((e as Error).message, 'err') }
  }
  return (
    <section className="card overflow-hidden">
      <div className="p-5"><div className="relative max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><input className="input pl-9" placeholder="Tìm tên, email hoặc số điện thoại" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm khách hàng" /></div></div>
      {shown.length === 0 ? <p className="p-10 text-center text-ink-2">Không có khách hàng nào phù hợp.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-line bg-subtle text-xs uppercase text-ink-2"><tr>{['Khách hàng', 'Số điện thoại', 'Đơn hàng', 'Đã chi tiêu', 'Tham gia', 'Trạng thái', ''].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {shown.map((c) => (
                <tr key={c.id} className="hover:bg-subtle">
                  <td className="px-5 py-3"><div className="font-semibold">{c.name}</div><div className="text-xs text-ink-3">{c.email}</div></td>
                  <td className="px-5 py-3 text-ink-2">{c.phone || '—'}</td>
                  <td className="num px-5 py-3">{c.orders}</td>
                  <td className="num px-5 py-3 font-medium">{vnd(c.spent)}</td>
                  <td className="px-5 py-3 text-ink-2">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.status === 'active' ? 'bg-ok/15 text-ok' : 'bg-danger/15 text-danger'}`}>{c.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</span></td>
                  <td className="px-5 py-3 text-right"><button className="btn btn-secondary btn-sm" onClick={() => toggle(c)}>{c.status === 'active' ? <><Lock size={14} />Khóa</> : <><LockOpen size={14} />Mở khóa</>}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="border-t border-line p-4 text-sm text-ink-2">{shown.length} khách hàng</div>
    </section>
  )
}

/* =========================================================================================
   MÃ GIẢM GIÁ
   ========================================================================================= */
export function CouponsTab() {
  const { toast } = useStore()
  const [rows, setRows] = useState<AdminCoupon[] | null>(null)
  const [err, setErr] = useState('')
  const [f, setF] = useState({ code: '', description: '', type: 'percent' as 'percent' | 'fixed', value: '', minOrder: '', maxDiscount: '', limit: '100', days: '30' })
  const [formErr, setFormErr] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => { setErr(''); api.admin.coupons().then(setRows).catch((e: Error) => setErr(e.message)) }
  useEffect(load, [])
  if (err) return <LoadError message={err} onRetry={load} />
  if (!rows) return <Loading rows={4} />

  const create = async (e: FormEvent) => {
    e.preventDefault(); setFormErr('')
    const value = Number(f.value)
    if (f.code.trim().length < 3) return setFormErr('Mã tối thiểu 3 ký tự.')
    if (!(value > 0)) return setFormErr('Vui lòng nhập giá trị giảm.')
    if (f.type === 'percent' && value > 100) return setFormErr('Phần trăm giảm tối đa là 100.')
    setBusy(true)
    try {
      const c = await api.admin.createCoupon({ code: f.code.trim(), description: f.description.trim(), type: f.type, value, minOrder: Number(f.minOrder || 0), maxDiscount: f.maxDiscount ? Number(f.maxDiscount) : null, limit: Number(f.limit || 100), days: Number(f.days || 30) })
      setRows([c, ...rows]); setF({ ...f, code: '', description: '', value: '', minOrder: '', maxDiscount: '' }); toast('Đã tạo mã giảm giá.')
    } catch (x) { setFormErr((x as Error).message) } finally { setBusy(false) }
  }
  const toggle = async (c: AdminCoupon) => {
    try { const out = await api.admin.setCouponStatus(c.id, c.status === 'active' ? 'inactive' : 'active'); setRows(rows.map((x) => (x.id === out.id ? out : x))) } catch (e) { toast((e as Error).message, 'err') }
  }
  const now = Date.now()

  return (
    <>
      <form onSubmit={create} noValidate className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <h2 className="font-bold sm:col-span-2 lg:col-span-4">Tạo mã giảm giá mới</h2>
        <Field label="Mã"><input className="input uppercase" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="VD: SUMMER20" /></Field>
        <Field label="Loại giảm"><select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as 'percent' | 'fixed' })}><option value="percent">Theo phần trăm (%)</option><option value="fixed">Số tiền cố định (₫)</option></select></Field>
        <Field label={f.type === 'percent' ? 'Giảm (%)' : 'Giảm (₫)'}><input className="input" inputMode="numeric" value={f.value} onChange={(e) => setF({ ...f, value: digits(e.target.value) })} /></Field>
        <Field label="Giảm tối đa (₫)"><input className="input" inputMode="numeric" value={f.maxDiscount} onChange={(e) => setF({ ...f, maxDiscount: digits(e.target.value) })} placeholder="Không giới hạn" disabled={f.type === 'fixed'} /></Field>
        <Field label="Đơn tối thiểu (₫)"><input className="input" inputMode="numeric" value={f.minOrder} onChange={(e) => setF({ ...f, minOrder: digits(e.target.value) })} placeholder="0" /></Field>
        <Field label="Số lượt dùng"><input className="input" inputMode="numeric" value={f.limit} onChange={(e) => setF({ ...f, limit: digits(e.target.value) })} /></Field>
        <Field label="Hiệu lực (ngày)"><input className="input" inputMode="numeric" value={f.days} onChange={(e) => setF({ ...f, days: digits(e.target.value) })} /></Field>
        <Field label="Mô tả ngắn"><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Hiện ở bước thanh toán" /></Field>
        {formErr && <p className="err sm:col-span-2 lg:col-span-4" role="alert">{formErr}</p>}
        <div className="sm:col-span-2 lg:col-span-4"><button className="btn btn-primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <><Plus size={16} />Tạo mã</>}</button></div>
      </form>
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-subtle text-xs uppercase text-ink-2"><tr>{['Mã', 'Ưu đãi', 'Đơn tối thiểu', 'Đã dùng', 'Hết hạn', 'Trạng thái', ''].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => {
                const expired = new Date(c.endsAt).getTime() < now
                return (
                  <tr key={c.id} className="hover:bg-subtle">
                    <td className="px-5 py-3"><b>{c.code}</b>{c.description && <div className="max-w-[220px] truncate text-xs text-ink-3">{c.description}</div>}</td>
                    <td className="num px-5 py-3">{c.type === 'percent' ? `${c.value}%${c.maxDiscount ? ` (tối đa ${vnd(c.maxDiscount)})` : ''}` : vnd(c.value)}</td>
                    <td className="num px-5 py-3 text-ink-2">{c.minOrder ? vnd(c.minOrder) : '—'}</td>
                    <td className="num px-5 py-3">{c.used} / {c.limit}</td>
                    <td className="px-5 py-3 text-ink-2">{new Date(c.endsAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${expired ? 'bg-subtle text-ink-3' : c.status === 'active' ? 'bg-ok/15 text-ok' : 'bg-warn/15 text-warn'}`}>{expired ? 'Hết hạn' : c.status === 'active' ? 'Đang bật' : 'Đã tắt'}</span></td>
                    <td className="px-5 py-3 text-right"><button className="btn btn-secondary btn-sm" onClick={() => toggle(c)} disabled={expired}>{c.status === 'active' ? 'Tắt' : 'Bật'}</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
