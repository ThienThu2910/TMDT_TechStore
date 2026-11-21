import { useEffect, useRef, useState } from 'react'
import { Link } from '../nav'
import { Minus, Plus, ShoppingBag, Trash2, Undo2, ArrowLeft } from 'lucide-react'
import { FREE_SHIP, vnd } from '../data'
import { Breadcrumb, EmptyState, FreeShipBar } from '../components'
import { useStore, type CartLine } from '../store'

export default function Cart() {
  const { cart, setQty, removeFromCart, restoreToCart, cartCount, products } = useStore()
  const [undo, setUndo] = useState<{ line: CartLine; name: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const lines = cart.map((c) => ({ ...c, p: products.find((x) => x.id === c.id)! })).filter((l) => l.p)
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
  // Tiết kiệm thật sự = chênh lệch giữa giá niêm yết và giá bán (trước đây dòng này bị gắn cứng "0₫")
  const saved = lines.reduce((s, l) => s + ((l.p.originalPrice ?? l.p.price) - l.p.price) * l.qty, 0)
  const freeShip = subtotal >= FREE_SHIP

  const remove = (id: number, qty: number, name: string) => {
    removeFromCart(id); setUndo({ line: { id, qty }, name })
    clearTimeout(timer.current); timer.current = setTimeout(() => setUndo(null), 7000)
  }

  return (
    <div className="container-x pb-8">
      <Breadcrumb items={[{ label: 'Giỏ hàng' }]} />
      <h1 className="text-[clamp(1.875rem,4vw,2.5rem)] font-bold">Giỏ hàng {cartCount > 0 && <span className="text-base font-normal text-ink-2">({cartCount} sản phẩm)</span>}</h1>
      {undo && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm" role="status">
          <span className="line-clamp-1 text-ink-2">Đã xóa “{undo.name}” khỏi giỏ hàng</span>
          <button className="flex shrink-0 items-center gap-1.5 font-semibold text-brand-600" onClick={() => { restoreToCart(undo.line); setUndo(null) }}><Undo2 size={15} />Hoàn tác</button>
        </div>
      )}
      {lines.length === 0 ? (
        <div className="mt-6"><EmptyState icon={<ShoppingBag size={30} />} title="Giỏ hàng của bạn đang trống." action={<Link to="/products" className="btn btn-primary">Khám phá sản phẩm</Link>} /></div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="card p-5"><FreeShipBar subtotal={subtotal} /></div>
            {lines.map(({ p, qty }) => (
              <div key={p.id} className="card flex gap-4 p-4">
                <Link to={`/product/${p.id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-subtle"><img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" /></Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <Link to={`/product/${p.id}`} className="line-clamp-2 font-semibold hover:text-brand-600">{p.name}</Link>
                    <div className="num mt-1 text-ink-2">{vnd(p.price)}{p.originalPrice && <span className="ml-2 text-xs text-ink-3 line-through">{vnd(p.originalPrice)}</span>}</div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center rounded-full border border-line" role="group" aria-label={`Số lượng ${p.name}`}>
                      <button className="grid h-10 w-10 place-items-center disabled:opacity-40" disabled={qty <= 1} onClick={() => setQty(p.id, qty - 1)} aria-label="Giảm"><Minus size={14} /></button>
                      <span className="num w-8 text-center font-semibold" aria-live="polite">{qty}</span>
                      <button className="grid h-10 w-10 place-items-center disabled:opacity-40" disabled={qty >= p.stock} onClick={() => setQty(p.id, qty + 1)} aria-label="Tăng"><Plus size={14} /></button>
                    </div>
                    <div className="num w-28 text-right font-bold">{vnd(p.price * qty)}</div>
                    <button onClick={() => remove(p.id, qty, p.name)} className="grid h-10 w-10 place-items-center rounded-full text-ink-3 hover:bg-subtle hover:text-danger" aria-label={`Xóa ${p.name}`}><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
            <Link to="/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600"><ArrowLeft size={15} />Tiếp tục mua sắm</Link>
          </div>
          <aside className="card h-fit p-6 lg:sticky lg:top-28">
            <h2 className="text-lg font-bold">Tóm tắt đơn hàng</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-ink-2">Tạm tính</dt><dd className="num">{vnd(subtotal)}</dd></div>
              {saved > 0 && <div className="flex justify-between"><dt className="text-ink-2">Đã tiết kiệm</dt><dd className="num font-semibold text-ok">{vnd(saved)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink-2">Phí vận chuyển</dt><dd className={freeShip ? 'font-semibold text-ok' : 'text-ink-2'}>{freeShip ? 'Miễn phí' : 'Xác nhận khi đặt hàng'}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-bold"><dt>Tổng thanh toán</dt><dd className="num text-brand-600">{vnd(subtotal)}</dd></div>
            </dl>
            <Link to="/checkout" className="btn btn-primary btn-lg mt-5 w-full">Tiến hành thanh toán</Link>
            <p className="mt-3 text-xs text-ink-3">Tổng tiền cuối cùng do hệ thống xác nhận khi đặt hàng.</p>
          </aside>
        </div>
      )}
    </div>
  )
}
