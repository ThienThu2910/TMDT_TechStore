import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Bar, Doughnut } from 'react-chartjs-2'
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js'
import { ChartNoAxesCombined, ClipboardList, DollarSign, LayoutDashboard, LogOut, Moon, Package, Search, Store, Sun, Tag, Users, X, Clock3 } from 'lucide-react'
import { fold, nextStatuses, paymentLabel, statusLabel, statusStyle, vnd, type Order, type OrderStatus } from '../data'
import { Logo, Modal, Overlay } from '../components'
import { Link, useGo } from '../nav'
import { useStore } from '../store'
import { useTheme } from '../hooks'
import { api, type Dashboard } from '../api'
import { CouponsTab, CustomersTab, ProductsTab } from './AdminSections'
import { LoadError, Loading } from './AdminUi'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)
ChartJS.defaults.font.family = 'Be Vietnam Pro, sans-serif'
// Màu biểu đồ đọc từ CSS variables nên đổi theo giao diện sáng / tối.
const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim()
function useThemeKey() {
  const [k, setK] = useState(0)
  useEffect(() => {
    const mo = new MutationObserver(() => setK((x) => x + 1))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  return k
}

type Tab = 'dash' | 'orders' | 'products' | 'customers' | 'coupons'
const side: [typeof LayoutDashboard, string, Tab][] = [
  [LayoutDashboard, 'Tổng quan', 'dash'], [ClipboardList, 'Đơn hàng', 'orders'], [Package, 'Sản phẩm', 'products'], [Users, 'Khách hàng', 'customers'], [Tag, 'Mã giảm giá', 'coupons'],
]
const titles: Record<Tab, string> = { dash: 'Tổng quan', orders: 'Đơn hàng', products: 'Sản phẩm', customers: 'Khách hàng', coupons: 'Mã giảm giá' }

function StatusBadge({ s }: { s: OrderStatus }) { return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[s]}`}>{statusLabel[s]}</span> }

export default function Admin() {
  const { user, logout } = useStore()
  const go = useGo()
  const [theme, toggleTheme] = useTheme()
  const [tab, setTab] = useState<Tab>('dash')
  useThemeKey()

  if (!user || user.role !== 'admin') return <Navigate to="/account?next=/admin" replace />

  return (
    <div className="min-h-screen bg-subtle lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="bg-panel p-5 text-panel-ink/80 lg:sticky lg:top-0 lg:h-screen">
        <Logo dark />
        <nav className="no-scrollbar mt-6 flex gap-1 overflow-x-auto lg:flex-col" aria-label="Quản trị">
          {side.map(([I, l, k]) => (
            <button key={k} onClick={() => setTab(k)} aria-current={k === tab ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${k === tab ? 'bg-brand-600 text-white' : 'hover:bg-white/10'}`}><I size={18} />{l}</button>
          ))}
          <Link to="/" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-white/10 lg:mt-6"><Store size={18} />Về cửa hàng</Link>
        </nav>
      </aside>
      <main className="min-w-0">
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-6 py-4">
          <h1 className="text-xl font-bold">{titles[tab]}</h1>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) }} className="grid h-10 w-10 place-items-center rounded-full hover:bg-subtle" aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <span className="hidden sm:inline">{user.name}</span>
            <button onClick={() => { logout(); go('/') }} className="btn btn-secondary btn-sm"><LogOut size={14} />Đăng xuất</button>
          </div>
        </div>
        <div className="space-y-6 p-6">
          {tab === 'dash' && <DashboardTab onOpenOrders={() => setTab('orders')} />}
          {tab === 'orders' && <OrdersTab />}
          {tab === 'products' && <ProductsTab />}
          {tab === 'customers' && <CustomersTab />}
          {tab === 'coupons' && <CouponsTab />}
        </div>
      </main>
    </div>
  )
}

/* ---------- tổng quan ---------- */
function DashboardTab({ onOpenOrders }: { onOpenOrders: () => void }) {
  const [d, setD] = useState<Dashboard | null>(null)
  const [err, setErr] = useState('')
  const [range, setRange] = useState<'week' | 'month'>('week')
  const [sel, setSel] = useState<Order | null>(null)
  const load = () => { setErr(''); api.admin.dashboard().then(setD).catch((e: Error) => setErr(e.message)) }
  useEffect(load, [])

  if (err) return <LoadError message={err} onRetry={load} />
  if (!d) return <Loading rows={6} />

  const statuses = Object.keys(statusLabel) as OrderStatus[]
  const series = d.series[range]
  const kpis = [
    [DollarSign, 'Doanh thu (đơn đã giao)', vnd(d.kpis.revenue)], [ClipboardList, 'Tổng đơn hàng', String(d.kpis.orders)],
    [Clock3, 'Chờ xác nhận', String(d.kpis.pending)], [Users, 'Khách hàng', String(d.kpis.customers)], [Package, 'Sản phẩm đang bán', String(d.kpis.products)],
  ] as const

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {kpis.map(([I, l, v]) => <div key={l} className="card p-5"><span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600"><I size={20} /></span><div className="mt-3 text-xs text-ink-2">{l}</div><div className="num text-xl font-bold sm:text-2xl">{v}</div></div>)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><ChartNoAxesCombined size={18} />Doanh thu (triệu ₫)</h2>
            <select className="input h-9 w-auto" value={range} onChange={(e) => setRange(e.target.value as 'week' | 'month')} aria-label="Khoảng thời gian"><option value="week">7 ngày</option><option value="month">4 tuần</option></select></div>
          <div className="mt-4 h-64"><Bar aria-label="Biểu đồ doanh thu" data={{ labels: series.labels, datasets: [{ label: 'Doanh thu (triệu ₫)', data: series.values, backgroundColor: css('--accent'), borderRadius: 6 }] }} options={{ maintainAspectRatio: false, color: css('--text-1'), plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Triệu ₫', color: css('--text-1') }, ticks: { color: css('--text-1') }, grid: { color: css('--line') } }, x: { ticks: { color: css('--text-1') }, grid: { display: false } } } }} /></div>
        </section>
        <section className="card p-5">
          <h2 className="font-bold">Đơn hàng theo trạng thái</h2>
          <div className="mt-4 h-64"><Doughnut aria-label="Đơn hàng theo trạng thái" data={{ labels: statuses.map((s) => statusLabel[s]), datasets: [{ data: statuses.map((s) => d.statusCounts[s] ?? 0), backgroundColor: [css('--warn'), css('--accent'), css('--accent-2'), css('--ok'), css('--danger')], borderWidth: 0 }] }} options={{ maintainAspectRatio: false, color: css('--text-1'), plugins: { legend: { position: 'bottom', labels: { color: css('--text-1') } } } }} /></div>
        </section>
      </div>
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-5"><h2 className="font-bold">Đơn hàng gần đây</h2><button className="text-sm font-semibold text-brand-600" onClick={onOpenOrders}>Xem tất cả</button></div>
        <OrdersTable rows={d.recent} onView={setSel} />
      </section>
      {sel && <OrderDrawer order={sel} onClose={() => setSel(null)} onChanged={(o) => { setSel(o); setD({ ...d, recent: d.recent.map((x) => (x.id === o.id ? o : x)) }) }} />}
    </>
  )
}

/* ---------- đơn hàng ---------- */
const PAGE = 8
function OrdersTab() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [err, setErr] = useState('')
  const [fs, setFs] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState<Order | null>(null)
  const load = () => { setErr(''); api.admin.orders().then(setOrders).catch((e: Error) => setErr(e.message)) }
  useEffect(load, [])

  const statuses = Object.keys(statusLabel) as OrderStatus[]
  const filtered = useMemo(() => (orders ?? []).filter((o) => (!fs || o.status === fs) && (!q || fold(`${o.code} ${o.customer} ${o.account?.email ?? ''}`).includes(fold(q.trim())))), [orders, fs, q])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const cur = Math.min(page, pages)
  const rows = filtered.slice((cur - 1) * PAGE, cur * PAGE)

  if (err) return <LoadError message={err} onRetry={load} />
  if (!orders) return <Loading rows={6} />
  return (
    <>
      <section className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 p-5">
          <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><input className="input pl-9" placeholder="Tìm mã đơn, khách hàng hoặc email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Tìm đơn hàng" /></div>
          <select className="input w-auto" value={fs} onChange={(e) => { setFs(e.target.value); setPage(1) }} aria-label="Lọc trạng thái"><option value="">Tất cả trạng thái</option>{statuses.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}</select>
        </div>
        {rows.length ? <OrdersTable rows={rows} onView={setSel} /> : <p className="p-10 text-center text-ink-2">Không có đơn hàng nào phù hợp.</p>}
        <div className="flex items-center justify-between border-t border-line p-4 text-sm"><span className="text-ink-2">{filtered.length} đơn hàng</span>
          <div className="flex gap-1">{Array.from({ length: pages }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => setPage(n)} aria-current={n === cur ? 'page' : undefined} className={`h-9 w-9 rounded-lg border text-sm font-semibold ${n === cur ? 'border-brand-600 bg-brand-600 text-white' : 'border-line'}`}>{n}</button>)}</div></div>
      </section>
      {sel && <OrderDrawer order={sel} onClose={() => setSel(null)} onChanged={(o) => { setSel(o); setOrders(orders.map((x) => (x.id === o.id ? o : x))) }} />}
    </>
  )
}

function OrdersTable({ rows, onView }: { rows: Order[]; onView: (o: Order) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-y border-line bg-subtle text-xs uppercase text-ink-2"><tr>{['Mã đơn', 'Khách hàng', 'Ngày đặt', 'Tổng tiền', 'Trạng thái', ''].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">
          {rows.map((o) => (
            <tr key={o.id} className="hover:bg-subtle"><td className="px-5 py-3 font-semibold">{o.code}</td><td className="px-5 py-3">{o.customer}</td><td className="px-5 py-3 text-ink-2">{new Date(o.createdAt).toLocaleDateString('vi-VN')}</td><td className="num px-5 py-3 font-medium">{vnd(o.total)}</td><td className="px-5 py-3"><StatusBadge s={o.status} /></td><td className="px-5 py-3 text-right"><button className="btn btn-secondary btn-sm" onClick={() => onView(o)}>Xem</button></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- chi tiết đơn + cập nhật trạng thái ---------- */
function OrderDrawer({ order, onClose, onChanged }: { order: Order; onClose: () => void; onChanged: (o: Order) => void }) {
  const { toast } = useStore()
  const options = nextStatuses[order.status]
  const [next, setNext] = useState<OrderStatus>(options[0] ?? 'confirmed')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setNext(nextStatuses[order.status][0] ?? 'confirmed') }, [order.status])

  const apply = async () => {
    setBusy(true)
    try { onChanged(await api.admin.setOrderStatus(order.id, next)); toast('Đã cập nhật trạng thái đơn hàng.') } catch (e) { toast((e as Error).message, 'err') } finally { setBusy(false); setConfirm(false) }
  }
  if (confirm) return (
    <Modal title="Xác nhận cập nhật" onClose={() => setConfirm(false)}>
      <p className="text-ink-2">Chuyển đơn {order.code} sang trạng thái “{statusLabel[next]}”?{next === 'cancelled' && ' Hàng sẽ được hoàn lại kho.'}</p>
      <div className="mt-5 flex justify-end gap-2"><button className="btn btn-secondary" onClick={() => setConfirm(false)}>Quay lại</button><button className="btn btn-primary" disabled={busy} onClick={apply}>Xác nhận</button></div>
    </Modal>
  )
  return (
    <Overlay variant="right" label={`Chi tiết đơn ${order.code}`} onClose={onClose} className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-surface p-6 shadow-2xl">
      <button onClick={onClose} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full hover:bg-subtle" aria-label="Đóng"><X size={18} /></button>
      <h2 className="text-xl font-bold">Đơn {order.code}</h2><div className="mt-1"><StatusBadge s={order.status} /></div>
      <dl className="mt-5 space-y-2 text-sm">
        <div><dt className="inline text-ink-2">Người nhận: </dt><dd className="inline">{order.customer} · {order.phone}</dd></div>
        {order.account && <div><dt className="inline text-ink-2">Tài khoản: </dt><dd className="inline">{order.account.email}</dd></div>}
        <div><dt className="inline text-ink-2">Địa chỉ: </dt><dd className="inline">{order.address}</dd></div>
        <div><dt className="inline text-ink-2">Thanh toán: </dt><dd className="inline">{paymentLabel[order.payment]}</dd></div>
        <div><dt className="inline text-ink-2">Ngày đặt: </dt><dd className="inline">{new Date(order.createdAt).toLocaleString('vi-VN')}</dd></div>
        {order.note && <div><dt className="inline text-ink-2">Ghi chú: </dt><dd className="inline">{order.note}</dd></div>}
      </dl>
      <ul className="mt-5 divide-y divide-line rounded-xl border border-line">{order.items.map((i) => <li key={i.id} className="flex items-center gap-3 p-3">{i.image && <img src={i.image} alt="" className="h-12 w-12 rounded-lg object-cover" />}<div className="flex-1 text-sm">{i.name}<div className="text-xs text-ink-2">× {i.qty}</div></div><b className="num text-sm">{vnd(i.price * i.qty)}</b></li>)}</ul>
      {order.discount > 0 && <div className="mt-3 flex justify-between text-sm"><span className="text-ink-2">Giảm giá</span><span className="num text-ok">-{vnd(order.discount)}</span></div>}
      <div className="mt-3 flex justify-between font-bold"><span>Tổng tiền</span><span className="num text-brand-600">{vnd(order.total)}</span></div>
      {options.length > 0 ? (
        <div className="mt-auto pt-6"><label className="label" htmlFor="next-status">Cập nhật trạng thái</label>
          <div className="flex gap-2"><select id="next-status" className="input" value={next} onChange={(e) => setNext(e.target.value as OrderStatus)}>{options.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}</select><button className="btn btn-primary" onClick={() => setConfirm(true)}>Cập nhật</button></div></div>
      ) : <p className="mt-auto pt-6 text-sm text-ink-3">Đơn hàng ở trạng thái cuối, không thể thay đổi thêm.</p>}
    </Overlay>
  )
}
