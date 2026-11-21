import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Check, LoaderCircle, CircleAlert, TicketPercent, X, LogIn, Landmark, Banknote } from 'lucide-react'
import { FREE_SHIP, vnd, type PaymentMethod } from '../data'
import { Breadcrumb, EmptyState, Field } from '../components'
import { Link, useGo } from '../nav'
import { useStore } from '../store'
import { api, type CouponCheck } from '../api'

export function Steps({ step }: { step: number }) {
  return (
    <ol className="my-6 flex items-center gap-3 text-sm font-medium" aria-label="Các bước đặt hàng">
      {['Giỏ hàng', 'Giao hàng', 'Hoàn tất'].map((s, i) => (
        <li key={s} className="flex items-center gap-3" aria-current={i === step ? 'step' : undefined}>
          <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i < step ? 'bg-ok text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-subtle text-ink-3'}`}>{i < step ? <Check size={14} /> : i + 1}</span>
          <span className={i <= step ? 'text-ink' : 'text-ink-3'}>{s}</span>{i < 2 && <span className="h-px w-6 bg-line sm:w-12" />}
        </li>
      ))}
    </ol>
  )
}

type Form = { customer: string; phone: string; address: string; note: string }
const validate = (f: Form, agree: boolean) => {
  const er: Record<string, string> = {}
  if (f.customer.trim().length < 2) er.customer = 'Vui lòng nhập họ tên.'
  if (!/^(0|\+84)\d{9}$/.test(f.phone.replace(/\s/g, ''))) er.phone = 'Số điện thoại không hợp lệ (ví dụ 0912 345 678).'
  if (f.address.trim().length < 8) er.address = 'Vui lòng nhập địa chỉ giao hàng đầy đủ.'
  if (!agree) er.agree = 'Vui lòng xác nhận thông tin đơn hàng.'
  return er
}
/** 0912345678 -> 0912 345 678 (giữ nguyên nếu bắt đầu bằng +84) */
const fmtPhone = (v: string) => {
  if (v.startsWith('+')) return '+' + v.slice(1).replace(/\D/g, '').slice(0, 11)
  const d = v.replace(/\D/g, '').slice(0, 10)
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7)].filter(Boolean).join(' ')
}

const methods: { id: PaymentMethod; title: string; hint: string; icon: typeof Banknote }[] = [
  { id: 'COD', title: 'Thanh toán khi nhận hàng (COD)', hint: 'Thanh toán bằng tiền mặt khi nhận hàng.', icon: Banknote },
  { id: 'SIMULATED', title: 'Chuyển khoản ngân hàng (mô phỏng)', hint: 'Chỉ để minh họa luồng thanh toán, không phát sinh giao dịch thật.', icon: Landmark },
]

export default function Checkout() {
  const { cart, user, placeOrder, products } = useStore()
  const go = useGo()
  const formRef = useRef<HTMLFormElement>(null)
  const [f, setF] = useState<Form>({ customer: user?.name ?? '', phone: user?.phone ? fmtPhone(user.phone) : '', address: '', note: '' })
  const [agree, setAgree] = useState(false)
  const [pay, setPay] = useState<PaymentMethod>('COD')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [apiErr, setApiErr] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [coupon, setCoupon] = useState<CouponCheck | null>(null)
  const [couponErr, setCouponErr] = useState('')
  const [couponBusy, setCouponBusy] = useState(false)

  const lines = cart.map((c) => ({ ...c, p: products.find((x) => x.id === c.id)! })).filter((l) => l.p)
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
  const saved = lines.reduce((s, l) => s + ((l.p.originalPrice ?? l.p.price) - l.p.price) * l.qty, 0)
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0
  const total = subtotal - discount

  if (!lines.length) return <div className="container-x py-12"><EmptyState icon={<Check size={30} />} title="Giỏ hàng của bạn đang trống." action={<Link to="/products" className="btn btn-primary">Khám phá sản phẩm</Link>} /></div>

  // Đơn hàng được lưu theo tài khoản (để theo dõi, hủy, đánh giá) nên cần đăng nhập trước khi đặt.
  if (!user) return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-md"><EmptyState icon={<LogIn size={30} />} title="Đăng nhập để đặt hàng"
        action={<div className="flex flex-col items-center gap-3"><p className="max-w-xs text-sm text-ink-2">Giỏ hàng của bạn vẫn được giữ nguyên. Đăng nhập hoặc tạo tài khoản để theo dõi đơn và nhận ưu đãi.</p>
          <div className="flex flex-wrap justify-center gap-3"><Link to="/account?next=/checkout" className="btn btn-primary">Đăng nhập / Đăng ký</Link><Link to="/cart" className="btn btn-secondary">Quay lại giỏ hàng</Link></div></div>} /></div>
    </div>
  )

  const applyCoupon = async () => {
    const code = codeInput.trim()
    if (!code || couponBusy) return
    setCouponBusy(true); setCouponErr('')
    try { setCoupon(await api.checkCoupon(code, subtotal)); setCodeInput('') } catch (e) { setCoupon(null); setCouponErr((e as Error).message) } finally { setCouponBusy(false) }
  }

  // Lỗi hiện theo từng ô khi người dùng rời ô đó (hoặc sau lần bấm đặt hàng đầu tiên), thay vì chờ tới lúc gửi mới báo hết.
  const all = validate(f, agree)
  const errs = Object.fromEntries(Object.entries(all).filter(([k]) => tried || touched[k]))
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }))
  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: k === 'phone' ? fmtPhone(e.target.value) : e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setTried(true); setApiErr('')
    if (Object.keys(all).length) {
      // đưa con trỏ tới ô lỗi đầu tiên: người dùng bàn phím / trình đọc màn hình không phải tự đi tìm
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setBusy(true)
    try {
      const o = await placeOrder({ ...f, phone: f.phone.replace(/\s/g, ''), payment: pay, coupon: coupon?.code })
      go(`/orders/${o.id}?success=1`)
    } catch (x) {
      setApiErr((x as Error).message || 'Chưa thể đặt hàng. Vui lòng thử lại.'); setBusy(false)
    }
  }

  return (
    <div className="container-x pb-8">
      <Breadcrumb items={[{ label: 'Giỏ hàng', to: '/cart' }, { label: 'Thanh toán' }]} />
      <h1 className="text-[clamp(1.875rem,4vw,2.5rem)] font-bold">Thanh toán</h1>
      <Steps step={1} />
      <form ref={formRef} onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="card space-y-5 p-6">
          <h2 className="text-lg font-bold">Thông tin người nhận</h2>
          {apiErr && <div className="flex items-start gap-2 rounded-xl bg-danger/15 p-3 text-sm text-danger" role="alert"><CircleAlert size={16} className="mt-0.5" />{apiErr}</div>}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Họ tên" error={errs.customer}><input className="input" value={f.customer} onChange={set('customer')} onBlur={blur('customer')} autoComplete="name" /></Field>
            <Field label="Số điện thoại" error={errs.phone}><input className="input" value={f.phone} onChange={set('phone')} onBlur={blur('phone')} inputMode="tel" autoComplete="tel" placeholder="0912 345 678" /></Field>
          </div>
          <Field label="Địa chỉ giao hàng" error={errs.address}><input className="input" value={f.address} onChange={set('address')} onBlur={blur('address')} autoComplete="street-address" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" /></Field>
          <Field label="Ghi chú (không bắt buộc)"><textarea className="input h-24 py-3" value={f.note} onChange={set('note')} /></Field>
          <fieldset>
            <legend className="label">Phương thức thanh toán</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {methods.map((m) => (
                <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${pay === m.id ? 'border-brand-600 bg-brand-50' : 'border-line hover:border-brand-600/50'}`}>
                  <input type="radio" name="pay" checked={pay === m.id} onChange={() => setPay(m.id)} className="mt-1 accent-brand-600" />
                  <span className="min-w-0"><b className="flex items-center gap-1.5 text-sm"><m.icon size={15} className="shrink-0 text-brand-600" />{m.title}</b><span className="mt-1 block text-xs text-ink-2">{m.hint}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-invalid={errs.agree ? true : undefined} aria-describedby={errs.agree ? 'agree-err' : undefined} className="mt-1 h-4 w-4 accent-brand-600" />Tôi xác nhận thông tin đúng và đồng ý với chính sách mua hàng.</label>
            {errs.agree && <p id="agree-err" className="err" role="alert">{errs.agree}</p>}
          </div>
        </div>
        <aside className="card h-fit p-6 lg:sticky lg:top-28">
          <h2 className="text-lg font-bold">Đơn hàng của bạn</h2>
          <ul className="mt-4 divide-y divide-line">
            {lines.map(({ p, qty }) => (
              <li key={p.id} className="flex gap-3 py-3"><img src={p.images[0]} alt="" className="h-14 w-14 rounded-xl object-cover" /><div className="min-w-0 flex-1"><div className="line-clamp-2 text-sm font-medium">{p.name}</div><div className="text-xs text-ink-2">SL: {qty}</div></div><div className="num text-sm font-semibold">{vnd(p.price * qty)}</div></li>
            ))}
          </ul>

          <div className="mt-2 border-t border-line pt-4">
            {coupon ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-ok/15 px-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-ok"><TicketPercent size={16} className="shrink-0" /><span className="truncate"><b>{coupon.code}</b>{coupon.description && <span className="text-ink-2"> · {coupon.description}</span>}</span></span>
                <button type="button" onClick={() => setCoupon(null)} aria-label="Bỏ mã giảm giá" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-subtle hover:text-ink"><X size={15} /></button>
              </div>
            ) : (
              <div>
                <label htmlFor="coupon" className="label">Mã giảm giá</label>
                <div className="flex gap-2">
                  <input id="coupon" className="input h-11 uppercase" value={codeInput} onChange={(e) => { setCodeInput(e.target.value); setCouponErr('') }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void applyCoupon() } }} placeholder="Nhập mã (vd. TECH10)" aria-invalid={couponErr ? true : undefined} aria-describedby={couponErr ? 'coupon-err' : undefined} autoComplete="off" />
                  <button type="button" className="btn btn-secondary h-11" onClick={applyCoupon} disabled={!codeInput.trim() || couponBusy}>{couponBusy ? <LoaderCircle size={16} className="animate-spin" /> : 'Áp dụng'}</button>
                </div>
                {couponErr && <p id="coupon-err" className="err" role="alert">{couponErr}</p>}
              </div>
            )}
          </div>

          <dl className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-ink-2">Tạm tính</dt><dd className="num">{vnd(subtotal)}</dd></div>
            {saved > 0 && <div className="flex justify-between"><dt className="text-ink-2">Đã tiết kiệm so với giá niêm yết</dt><dd className="num font-semibold text-ok">{vnd(saved)}</dd></div>}
            {discount > 0 && <div className="flex justify-between"><dt className="text-ink-2">Mã giảm giá</dt><dd className="num font-semibold text-ok">-{vnd(discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-2">Phí vận chuyển</dt><dd className={subtotal >= FREE_SHIP ? 'font-semibold text-ok' : 'text-ink-2'}>{subtotal >= FREE_SHIP ? 'Miễn phí' : 'Xác nhận khi đặt hàng'}</dd></div>
            <div className="flex justify-between pt-1 text-base font-bold"><dt>Tổng thanh toán</dt><dd className="num text-brand-600">{vnd(total)}</dd></div>
          </dl>
          <button className="btn btn-primary btn-lg mt-5 w-full" disabled={busy}>{busy ? <><LoaderCircle size={18} className="animate-spin" />Đang xử lý...</> : 'Đặt hàng'}</button>
          <p className="mt-3 text-xs text-ink-3">Giá và tồn kho được máy chủ kiểm tra lại khi đặt hàng.</p>
        </aside>
      </form>
    </div>
  )
}
