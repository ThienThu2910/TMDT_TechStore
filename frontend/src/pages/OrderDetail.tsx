import { useState, type CSSProperties } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, PackageX } from 'lucide-react'
import { paymentLabel, statusLabel, statusStyle, vnd, type OrderStatus } from '../data'
import { Breadcrumb, EmptyState, Modal } from '../components'
import { Link } from '../nav'
import { Steps } from './Checkout'
import { useStore } from '../store'

const flow: OrderStatus[] = ['pending', 'confirmed', 'shipping', 'delivered']
const confettiColors = ['var(--accent)', 'var(--accent-2)', 'var(--hot)', 'var(--lime)', 'var(--ok)']

/** Dấu tích tự "vẽ" ra + pháo giấy. Chỉ dùng CSS (stroke-dashoffset / keyframes), tự tắt khi bật "giảm chuyển động". */
function SuccessMark() {
  return (
    <div className="relative mx-auto h-24 w-24" aria-hidden>
      <div className="confetti absolute inset-0">
        {Array.from({ length: 18 }).map((_, i) => {
          const a = (i / 18) * Math.PI * 2 + (i % 2 ? 0.2 : 0)
          const r = 90 + (i % 3) * 28
          return <i key={i} style={{ '--dx': `${Math.cos(a) * r}px`, '--dy': `${Math.sin(a) * r - 10}px`, '--r': `${(i * 67) % 360}deg`, '--d': 380 + (i % 5) * 40, background: confettiColors[i % confettiColors.length] } as CSSProperties} />
        })}
      </div>
      <svg viewBox="0 0 96 96" className="relative h-full w-full" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <circle className="draw" style={{ '--len': 289 } as CSSProperties} cx="48" cy="48" r="46" stroke="var(--ok)" />
        <path className="draw" style={{ '--len': 60, animationDelay: '.55s' } as CSSProperties} d="M28 50 l14 14 l27 -30" stroke="var(--ok)" />
      </svg>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const { orders, ordersReady, user, cancelOrder, toast } = useStore()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const o = orders.find((x) => x.id === id)
  if (!user) return <Navigate to={`/account?next=${encodeURIComponent(`/orders/${id}`)}`} replace />
  if (!ordersReady) return <div className="container-x py-12"><div className="skeleton mx-auto h-40 max-w-xl" /></div>
  if (!o) return <div className="container-x py-12"><EmptyState icon={<PackageX size={30} />} title="Không tìm thấy đơn hàng." action={<Link to="/products" className="btn btn-primary">Tiếp tục mua sắm</Link>} /></div>
  const idx = flow.indexOf(o.status)
  return (
    <div className="container-x pb-8">
      {sp.get('success') ? (
        <div className="mx-auto mt-8 max-w-xl text-center">
          <Steps step={2} />
          <SuccessMark />
          <h1 className="mt-4 text-3xl font-bold">Đặt hàng thành công</h1>
          <p className="mt-2 text-ink-2">Mã đơn hàng <b className="text-ink">{o.code}</b> · Tổng thanh toán <b className="text-brand-600">{vnd(o.total)}</b></p>
          <div className="mt-6 flex justify-center gap-3"><a href="#detail" className="btn btn-primary">Xem đơn hàng</a><Link to="/products" className="btn btn-secondary">Tiếp tục mua sắm</Link></div>
        </div>
      ) : <Breadcrumb items={[{ label: 'Tài khoản', to: '/account' }, { label: `Đơn ${o.code}` }]} />}
      <div id="detail" className="mt-10 scroll-mt-40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-2xl font-bold">Đơn hàng {o.code}</h2><p className="text-ink-2">Đặt ngày {new Date(o.createdAt).toLocaleDateString('vi-VN')}</p></div>
          <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${statusStyle[o.status]}`}>{statusLabel[o.status]}</span>
        </div>
        {o.status !== 'cancelled' ? (
          <div className="card relative mt-6 p-5">
            <div aria-hidden className="absolute left-[12.5%] right-[12.5%] top-9 h-0.5 rounded-full bg-line">
              <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${(Math.max(idx, 0) / (flow.length - 1)) * 100}%`, background: 'var(--grad-brand)' }} />
            </div>
            <ol className="relative grid grid-cols-4 gap-2" aria-label="Tiến trình đơn hàng">
              {flow.map((s, i) => (
                <li key={s} className="text-center" aria-current={i === idx ? 'step' : undefined}>
                  <div className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-bold ring-4 ring-[var(--bg-1)] ${i <= idx ? 'bg-brand-600 text-white' : 'bg-surface-2 text-ink-3'}`}>{i < idx ? <Check size={14} /> : i + 1}</div>
                  <div className={`mt-2 text-xs sm:text-sm ${i <= idx ? 'font-semibold' : 'text-ink-3'}`}>{statusLabel[s]}</div>
                </li>
              ))}
            </ol>
          </div>
        ) : <p className="mt-6 rounded-xl bg-danger/15 p-4 text-danger">Đơn hàng này đã bị hủy.</p>}
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="card divide-y divide-line">
            {o.items.map((i) => (
              <div key={i.id} className="flex items-center gap-4 p-4"><img src={i.image} alt="" className="h-16 w-16 rounded-lg object-cover" /><div className="flex-1"><div className="font-medium">{i.name}</div><div className="text-xs text-ink-2">{vnd(i.price)} × {i.qty}</div></div><b>{vnd(i.price * i.qty)}</b></div>
            ))}
            {o.discount > 0 && <div className="flex justify-between p-4 text-sm"><span className="text-ink-2">Đã giảm bằng mã giảm giá</span><span className="num font-semibold text-ok">-{vnd(o.discount)}</span></div>}
            <div className="flex justify-between p-4 text-base font-bold"><span>Tổng tiền</span><span className="num text-brand-600">{vnd(o.total)}</span></div>
          </div>
          <div className="card h-fit space-y-3 p-5 text-sm">
            <h3 className="text-base font-bold">Thông tin giao hàng</h3>
            <div><span className="text-ink-2">Người nhận: </span>{o.customer}</div>
            <div><span className="text-ink-2">Điện thoại: </span>{o.phone}</div>
            <div><span className="text-ink-2">Địa chỉ: </span>{o.address}</div>
            <div><span className="text-ink-2">Thanh toán: </span>{paymentLabel[o.payment]}</div>
            {o.note && <div><span className="text-ink-2">Ghi chú: </span>{o.note}</div>}
            {(o.status === 'pending' || o.status === 'confirmed') && <button className="btn btn-danger w-full" onClick={() => setConfirm(true)}>Hủy đơn</button>}
            {o.status === 'delivered' && <p className="rounded-xl bg-subtle p-3 text-xs text-ink-2">Đơn đã giao. Bạn có thể vào trang sản phẩm để viết đánh giá.</p>}
          </div>
        </div>
      </div>
      {confirm && (
        <Modal title="Hủy đơn hàng?" onClose={() => setConfirm(false)}>
          <p className="text-ink-2">Bạn chắc chắn muốn hủy đơn {o.code}? Thao tác này không thể hoàn tác.</p>
          <div className="mt-5 flex justify-end gap-2"><button className="btn btn-secondary" onClick={() => setConfirm(false)}>Giữ đơn</button><button className="btn btn-hot" disabled={busy} onClick={async () => { setBusy(true); try { await cancelOrder(o.id); toast('Đã hủy đơn hàng.') } catch (x) { toast((x as Error).message, 'err') } finally { setBusy(false); setConfirm(false) } }}>Hủy đơn</button></div>
        </Modal>
      )}
    </div>
  )
}
