import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Archive, ImagePlus, LoaderCircle, Lock, LockOpen, Plus, RotateCcw, Search, SquarePen, X } from 'lucide-react'
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
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const busy = busyId !== null
  const load = () => { setErr(''); api.admin.products().then(setData).catch((e: Error) => setErr(e.message)) }
  useEffect(load, [])

  const rows = useMemo(() => (data?.products ?? []).filter((p) => (!fs || p.status === fs) && (!q || fold(`${p.name} ${p.brand}`).includes(fold(q.trim())))), [data, q, fs])
  if (err) return <LoadError message={err} onRetry={load} />
  if (!data) return <Loading rows={6} />

  const saved = (p: Product, isNew: boolean) => {
    setData((current) => current ? { ...current, products: isNew ? [p, ...current.products] : current.products.map((x) => (x.id === p.id ? p : x)) } : current)
    setEdit(null); toast(isNew ? 'Đã thêm sản phẩm.' : 'Đã lưu thay đổi.'); refreshCatalog().catch(() => {})
  }
  const setStatus = async (p: Product, status: 'active' | 'archived') => {
    if (busy) return
    setActionError('')
    setBusyId(p.id)
    try {
      const out = status === 'archived' ? await api.admin.archiveProduct(p.id) : await api.admin.updateProduct(p.id, { ...toInput(fromProduct(p, data.categories)), status: 'active' })
      setData((current) => current ? { ...current, products: current.products.map((x) => (x.id === out.id ? out : x)) } : current)
      toast(status === 'archived' ? 'Đã ngừng bán sản phẩm.' : 'Sản phẩm đã được bán trở lại.')
      if (status === 'archived') setArchive(null)
      refreshCatalog().catch(() => {})
    } catch (e) { const message = (e as Error).message; toast(message, 'err'); if (status === 'archived') setActionError(message) } finally { setBusyId(null) }
  }

  return (
    <>
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-5">
          <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><input className="input pl-9" placeholder="Tìm tên sản phẩm hoặc thương hiệu" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm sản phẩm" /></div>
          <select className="input w-auto" value={fs} onChange={(e) => setFs(e.target.value)} aria-label="Lọc trạng thái"><option value="">Tất cả trạng thái</option>{Object.entries(statusText).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button className="btn btn-primary" onClick={() => setEdit('new')} disabled={busy}><Plus size={16} />Thêm sản phẩm</button>
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
                      <button className="btn btn-secondary btn-sm" onClick={() => setEdit(p)} disabled={busy} aria-label={`Sửa ${p.name}`}><SquarePen size={14} />Sửa</button>
                      {p.status === 'archived' ? <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setStatus(p, 'active')} aria-busy={busyId === p.id} aria-label={`Bán lại ${p.name}`}>{busyId === p.id ? <LoaderCircle size={14} className="animate-spin" /> : <RotateCcw size={14} />}{busyId === p.id ? 'Đang bán lại...' : 'Bán lại'}</button>
                        : <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => { setActionError(''); setArchive(p) }} aria-label={`Ngừng bán ${p.name}`}><Archive size={14} />Ngừng bán</button>}
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
        <Modal title="Ngừng bán sản phẩm?" onClose={() => { if (!busy) { setArchive(null); setActionError('') } }}>
          <p className="text-ink-2">“{archive.name}” sẽ không còn hiển thị trên cửa hàng. Lịch sử đơn hàng vẫn được giữ nguyên và bạn có thể bán lại bất cứ lúc nào.</p>
          {actionError && <p className="mt-4 rounded-xl bg-danger/15 p-3 text-sm text-danger" role="alert">{actionError}</p>}
          <div className="mt-5 flex justify-end gap-2"><button className="btn btn-secondary" disabled={busy} onClick={() => { setArchive(null); setActionError('') }}>Quay lại</button><button className="btn btn-hot" disabled={busy} aria-busy={busy} onClick={() => setStatus(archive, 'archived')}>{busy && <LoaderCircle size={16} className="animate-spin" />}{busy ? 'Đang cập nhật...' : 'Ngừng bán'}</button></div>
        </Modal>
      )}
    </>
  )
}

export function ProductDrawer({ product, cats, brands, onClose, onSaved }: { product: Product | null; cats: Cat[]; brands: string[]; onClose: () => void; onSaved: (p: Product, isNew: boolean) => void }) {
  const [f, setF] = useState<PForm>(() => (product ? fromProduct(product, cats) : emptyForm(cats)))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [apiErr, setApiErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const imageInput = useRef<HTMLInputElement>(null)
  const imageUrls = f.images.split('\n').map((url) => url.trim()).filter(Boolean)
  // sửa ô nào thì xóa lỗi của ô đó ngay, không đợi tới lần bấm lưu kế tiếp
  const set = <K extends keyof PForm>(k: K, v: PForm[K]) => { setF((x) => ({ ...x, [k]: v })); setErrs((er) => { const { [k]: _drop, ...rest } = er; return rest }) }
  const close = () => { if (!busy && !uploading) onClose() }

  const uploadImages = async (files: File[]) => {
    if (!files.length) return
    setApiErr('')
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (files.some((file) => !allowedTypes.includes(file.type))) { setApiErr('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.'); return }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) { setApiErr('Mỗi ảnh không được vượt quá 5 MB.'); return }
    if (imageUrls.length + files.length > 10) { setApiErr('Mỗi sản phẩm có thể dùng tối đa 10 ảnh.'); return }

    setUploading(true)
    try {
      for (const file of files) {
        const { url } = await api.admin.uploadProductImage(file)
        setF((current) => ({ ...current, images: [...current.images.split('\n').map((value) => value.trim()).filter(Boolean), url].join('\n') }))
      }
      setErrs((current) => { const { images: _drop, ...rest } = current; return rest })
    } catch (error) {
      setApiErr((error as Error).message)
    } finally {
      setUploading(false)
    }
  }
  const onChooseImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    void uploadImages(files)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setApiErr('')
    if (busy || uploading) return
    const inp = toInput(f), er: Record<string, string> = {}
    if (inp.name.length < 2) er.name = 'Vui lòng nhập tên sản phẩm.'
    if (!inp.brand) er.brand = 'Vui lòng nhập thương hiệu.'
    if (!inp.categoryId) er.categoryId = 'Vui lòng chọn danh mục.'
    if (!(inp.price >= 1000)) er.price = 'Giá bán tối thiểu 1.000₫.'
    if (inp.originalPrice !== null && inp.originalPrice < inp.price) er.originalPrice = 'Giá niêm yết phải lớn hơn hoặc bằng giá bán.'
    if (!inp.images.length) er.images = 'Vui lòng tải lên ít nhất một ảnh sản phẩm.'
    setErrs(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try { onSaved(product ? await api.admin.updateProduct(product.id, inp) : await api.admin.createProduct(inp), !product) } catch (x) { setApiErr((x as Error).message); setBusy(false) }
  }

  return (
    <Overlay variant="right" label={product ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={close} className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-line bg-surface shadow-2xl">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">Danh mục sản phẩm</p>
          <h2 className="mt-1 text-xl font-bold">{product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
          <p className="mt-1 text-sm text-ink-3">Điền thông tin và hình ảnh để hiển thị sản phẩm trong cửa hàng.</p>
        </div>
        <button onClick={close} disabled={busy || uploading} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-ink-2 transition hover:bg-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-40" aria-label="Đóng"><X size={18} /></button>
      </header>
      <form onSubmit={submit} noValidate aria-busy={busy || uploading} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {apiErr && <p className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{apiErr}</p>}
          <section className="space-y-4 rounded-2xl border border-line bg-subtle/20 p-4 sm:p-5" aria-labelledby="product-basic-heading">
            <div><h3 id="product-basic-heading" className="font-bold">Thông tin cơ bản</h3><p className="mt-1 text-xs text-ink-3">Tên sản phẩm, thương hiệu và danh mục.</p></div>
            <Field label="Tên sản phẩm" error={errs.name}><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ví dụ: iPhone 16 128GB" /></Field>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Field label="Thương hiệu" error={errs.brand}><input className="input min-w-0" list="brand-list" value={f.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Chọn hoặc nhập thương hiệu" /></Field>
              <Field label="Danh mục" error={errs.categoryId}><select className="input min-w-0" value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            </div>
            <datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist>
          </section>

          <section className="space-y-4 rounded-2xl border border-line bg-subtle/20 p-4 sm:p-5" aria-labelledby="product-pricing-heading">
            <div><h3 id="product-pricing-heading" className="font-bold">Giá và tồn kho</h3><p className="mt-1 text-xs text-ink-3">Giá niêm yết có thể để trống nếu không áp dụng giảm giá.</p></div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-3">
              <Field label="Giá bán (₫)" error={errs.price}><input className="input min-w-0" inputMode="numeric" value={f.price} onChange={(e) => set('price', digits(e.target.value))} placeholder="0" /></Field>
              <Field label="Giá niêm yết (₫)" error={errs.originalPrice}><input className="input min-w-0" inputMode="numeric" value={f.originalPrice} onChange={(e) => set('originalPrice', digits(e.target.value))} placeholder="Không bắt buộc" /></Field>
              <Field label="Tồn kho"><input className="input min-w-0" inputMode="numeric" value={f.stock} onChange={(e) => set('stock', digits(e.target.value))} placeholder="0" /></Field>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-line bg-subtle/20 p-4 sm:p-5" aria-labelledby="product-images-heading">
            <div className="flex items-start justify-between gap-3"><div><h3 id="product-images-heading" className="font-bold">Hình ảnh sản phẩm</h3><p className="mt-1 text-xs text-ink-3">Tối đa 10 ảnh · JPG, PNG hoặc WEBP · 5 MB/ảnh.</p></div><span className="shrink-0 rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold text-ink-2">{imageUrls.length}/10</span></div>
            <Field label="Ảnh sản phẩm" error={errs.images}>{({ id, 'aria-describedby': describedBy, 'aria-invalid': invalid }) => <div className="space-y-3">
              <input ref={imageInput} id={id} aria-describedby={describedBy} aria-invalid={invalid} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onChooseImages} />
              <button type="button" aria-describedby={describedBy} aria-invalid={invalid} className="btn btn-secondary btn-sm" disabled={uploading || busy || imageUrls.length >= 10} onClick={() => imageInput.current?.click()}>
                {uploading ? <LoaderCircle size={15} className="animate-spin" /> : <ImagePlus size={16} />}
                {uploading ? 'Đang tải ảnh...' : 'Tải ảnh từ máy'}
              </button>
              {imageUrls.length > 0 ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">{imageUrls.map((url, index) => (
                <div key={`${url}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-subtle">
                  <img src={url} alt={`Ảnh sản phẩm ${index + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => set('images', imageUrls.filter((_, i) => i !== index).join('\n'))} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-page/90 text-ink shadow transition hover:bg-danger hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" aria-label={`Xóa ảnh ${index + 1}`}><X size={14} /></button>
                </div>
              ))}</div> : <div className="rounded-xl border border-dashed border-line bg-surface/70 px-4 py-6 text-center"><ImagePlus size={22} className="mx-auto text-ink-3" /><p className="mt-2 text-sm font-medium">Chưa có hình ảnh</p><p className="mt-1 text-xs text-ink-3">Tải ảnh sản phẩm từ máy tính của bạn.</p></div>}
            </div>}</Field>
          </section>

          <section className="space-y-4 rounded-2xl border border-line bg-subtle/20 p-4 sm:p-5" aria-labelledby="product-details-heading">
            <div><h3 id="product-details-heading" className="font-bold">Mô tả và thông số</h3><p className="mt-1 text-xs text-ink-3">Thông tin giúp khách hàng hiểu rõ sản phẩm.</p></div>
            <Field label="Thông số kỹ thuật (mỗi dòng dạng “Tên: Giá trị”)"><textarea className="input min-h-[112px]" value={f.specs} onChange={(e) => set('specs', e.target.value)} placeholder={'Chip: Apple M3\nRAM: 8GB'} /></Field>
            <Field label="Mô tả"><textarea className="input min-h-[120px]" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Mô tả tính năng, thiết kế hoặc chính sách đi kèm..." /></Field>
          </section>

          <section className="space-y-4 rounded-2xl border border-line bg-subtle/20 p-4 sm:p-5" aria-labelledby="product-display-heading">
            <div><h3 id="product-display-heading" className="font-bold">Hiển thị trên cửa hàng</h3><p className="mt-1 text-xs text-ink-3">Chọn nhãn và trạng thái bán của sản phẩm.</p></div>
            <div className="flex flex-wrap gap-3">
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.isNew} onChange={(e) => set('isNew', e.target.checked)} />Nhãn “Mới”</label>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />Nổi bật trên trang chủ</label>
            </div>
            <label className="block max-w-xs text-sm font-medium">Trạng thái<select className="input mt-1.5" value={f.status} onChange={(e) => set('status', e.target.value as PForm['status'])}>{Object.entries(statusText).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          </section>
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-4 backdrop-blur sm:px-6">
          <span className="hidden text-xs text-ink-3 sm:block">{uploading ? 'Đang tải hình ảnh lên cửa hàng...' : 'Thông tin này sẽ hiển thị trên trang sản phẩm.'}</span>
          <div className="ml-auto flex gap-2"><button type="button" className="btn btn-secondary" onClick={close} disabled={uploading || busy}>Hủy</button><button className="btn btn-primary min-w-36 justify-center" disabled={busy || uploading}>{busy || uploading ? <><LoaderCircle size={16} className="animate-spin" />{uploading ? 'Đang tải ảnh...' : 'Đang lưu...'}</> : product ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button></div>
        </footer>
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
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [lockTarget, setLockTarget] = useState<AdminCustomer | null>(null)
  const [lockError, setLockError] = useState('')
  const load = () => { setErr(''); api.admin.customers().then(setRows).catch((e: Error) => setErr(e.message)) }
  useEffect(load, [])

  if (err) return <LoadError message={err} onRetry={load} />
  if (!rows) return <Loading rows={5} />
  const shown = rows.filter((c) => !q || fold(`${c.name} ${c.email} ${c.phone}`).includes(fold(q.trim())))
  const toggle = async (c: AdminCustomer) => {
    const status = c.status === 'active' ? 'locked' : 'active'
    if (pendingId !== null) return false
    setPendingId(c.id)
    try {
      await api.admin.setCustomerStatus(c.id, status)
      setRows((current) => current?.map((x) => (x.id === c.id ? { ...x, status } : x)) ?? current)
      if (status === 'locked') setLockError('')
      toast(status === 'locked' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.')
      return true
    } catch (e) { const message = (e as Error).message; toast(message, 'err'); if (status === 'locked') setLockError(message); return false } finally { setPendingId(null) }
  }
  const confirmLock = async () => { if (!lockTarget) return; setLockError(''); if (await toggle(lockTarget)) setLockTarget(null) }
  return (
    <>
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
                    <td className="px-5 py-3 text-right"><button className="btn btn-secondary btn-sm" disabled={pendingId !== null} aria-busy={pendingId === c.id} onClick={() => { if (c.status === 'active') { setLockError(''); setLockTarget(c) } else void toggle(c) }}>
                      {pendingId === c.id ? <LoaderCircle size={14} className="animate-spin" /> : c.status === 'active' ? <Lock size={14} /> : <LockOpen size={14} />}
                      {pendingId === c.id ? 'Đang xử lý...' : c.status === 'active' ? 'Khóa' : 'Mở khóa'}
                    </button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-line p-4 text-sm text-ink-2">{shown.length} khách hàng</div>
      </section>
      {lockTarget && <Modal title="Xác nhận khóa tài khoản" onClose={() => { if (pendingId === null) setLockTarget(null) }}>
        <p className="text-ink-2">Bạn có chắc muốn khóa tài khoản <b className="text-ink">{lockTarget.name}</b>? Bạn có thể mở khóa lại sau.</p>
        {lockError && <p className="mt-4 rounded-xl bg-danger/15 p-3 text-sm text-danger" role="alert">{lockError}</p>}
        <div className="mt-5 flex justify-end gap-2"><button className="btn btn-secondary" disabled={pendingId !== null} onClick={() => setLockTarget(null)}>Hủy</button><button className="btn btn-hot" disabled={pendingId !== null} aria-busy={pendingId !== null} onClick={() => void confirmLock()}>{pendingId !== null && <LoaderCircle size={16} className="animate-spin" />}{pendingId !== null ? 'Đang khóa...' : 'Khóa tài khoản'}</button></div>
      </Modal>}
    </>
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
  const [pendingId, setPendingId] = useState<number | null>(null)
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
      setRows((current) => current ? [c, ...current] : current); setF((current) => ({ ...current, code: '', description: '', value: '', minOrder: '', maxDiscount: '' })); toast('Đã tạo mã giảm giá.')
    } catch (x) { setFormErr((x as Error).message) } finally { setBusy(false) }
  }
  const toggle = async (c: AdminCoupon) => {
    if (pendingId !== null) return
    setPendingId(c.id)
    const next = c.status === 'active' ? 'inactive' : 'active'
    try {
      const out = await api.admin.setCouponStatus(c.id, next)
      setRows((current) => current?.map((x) => (x.id === out.id ? out : x)) ?? current)
      toast(next === 'active' ? 'Đã bật mã giảm giá.' : 'Đã tắt mã giảm giá.')
    } catch (e) { toast((e as Error).message, 'err') } finally { setPendingId(null) }
  }
  const now = Date.now()

  return (
    <>
      <form onSubmit={create} noValidate className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <h2 className="font-bold sm:col-span-2 lg:col-span-4">Tạo mã giảm giá mới</h2>
        <Field label="Mã"><input className="input uppercase" value={f.code} disabled={busy} onChange={(e) => { setFormErr(''); setF({ ...f, code: e.target.value }) }} placeholder="VD: SUMMER20" /></Field>
        <Field label="Loại giảm"><select className="input" value={f.type} disabled={busy} onChange={(e) => { setFormErr(''); setF({ ...f, type: e.target.value as 'percent' | 'fixed' }) }}><option value="percent">Theo phần trăm (%)</option><option value="fixed">Số tiền cố định (₫)</option></select></Field>
        <Field label={f.type === 'percent' ? 'Giảm (%)' : 'Giảm (₫)'}><input className="input" inputMode="numeric" value={f.value} disabled={busy} onChange={(e) => { setFormErr(''); setF({ ...f, value: digits(e.target.value) }) }} /></Field>
        <Field label="Giảm tối đa (₫)"><input className="input" inputMode="numeric" value={f.maxDiscount} onChange={(e) => { setFormErr(''); setF({ ...f, maxDiscount: digits(e.target.value) }) }} placeholder="Không giới hạn" disabled={f.type === 'fixed' || busy} /></Field>
        <Field label="Đơn tối thiểu (₫)"><input className="input" inputMode="numeric" value={f.minOrder} disabled={busy} onChange={(e) => { setFormErr(''); setF({ ...f, minOrder: digits(e.target.value) }) }} placeholder="0" /></Field>
        <Field label="Số lượt dùng"><input className="input" inputMode="numeric" value={f.limit} disabled={busy} onChange={(e) => { setFormErr(''); setF({ ...f, limit: digits(e.target.value) }) }} /></Field>
        <Field label="Hiệu lực (ngày)"><input className="input" inputMode="numeric" value={f.days} disabled={busy} onChange={(e) => { setFormErr(''); setF({ ...f, days: digits(e.target.value) }) }} /></Field>
        <Field label="Mô tả ngắn"><input className="input" value={f.description} disabled={busy} onChange={(e) => { setFormErr(''); setF({ ...f, description: e.target.value }) }} placeholder="Hiện ở bước thanh toán" /></Field>
        {formErr && <p className="err sm:col-span-2 lg:col-span-4" role="alert">{formErr}</p>}
        <div className="sm:col-span-2 lg:col-span-4"><button className="btn btn-primary" disabled={busy} aria-busy={busy}>{busy ? <><LoaderCircle size={16} className="animate-spin" />Đang tạo mã...</> : <><Plus size={16} />Tạo mã</>}</button></div>
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
                    <td className="px-5 py-3 text-right"><button className="btn btn-secondary btn-sm" onClick={() => void toggle(c)} disabled={expired || pendingId !== null} aria-busy={pendingId === c.id}>{pendingId === c.id && <LoaderCircle size={14} className="animate-spin" />}{pendingId === c.id ? 'Đang cập nhật...' : c.status === 'active' ? 'Tắt' : 'Bật'}</button></td>
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
