import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Bar, Doughnut } from 'react-chartjs-2'
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js'
import { ArrowUpRight, ChartNoAxesCombined, ClipboardList, CreditCard, DollarSign, LayoutDashboard, LoaderCircle, LogOut, Mail, MapPin, Moon, Package, Phone, Plus, Search, ShoppingBag, Store, Sun, Tag, UserRound, Users, X, Clock3 } from 'lucide-react'
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
const descriptions: Record<Tab, string> = {
  dash: 'Theo dõi tình hình hoạt động cửa hàng.', orders: 'Kiểm tra đơn mới và cập nhật tiến độ xử lý.',
  products: 'Quản lý danh mục, giá bán, tồn kho và hình ảnh.', customers: 'Xem thông tin và trạng thái tài khoản khách hàng.',
  coupons: 'Tạo và quản lý các ưu đãi đang áp dụng.',
}

function StatusBadge({ s }: { s: OrderStatus }) { return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[s]}`}>{statusLabel[s]}</span> }

export default function Admin() {
  const { user, logout } = useStore()
  const go = useGo()
  const [theme, toggleTheme] = useTheme()
  const [tab, setTab] = useState<Tab>('dash')
  useThemeKey()

  if (!user || user.role !== 'admin') return <Navigate to="/account?next=/admin" replace />

  return (
    <div className="min-h-screen bg-page lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-panel px-4 py-4 text-panel-ink/80 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <div className="flex items-center justify-between lg:block">
          <div><Logo dark /><p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-panel-ink/45">Trung tâm quản trị</p></div>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold tracking-wider text-panel-ink/60 lg:hidden">ADMIN</span>
        </div>
        <p className="mt-8 hidden px-3 text-[10px] font-bold uppercase tracking-[.16em] text-panel-ink/40 lg:block">Quản lý cửa hàng</p>
        <nav className="no-scrollbar mt-4 flex gap-1 overflow-x-auto lg:flex-col" aria-label="Quản trị">
          {side.map(([I, l, k]) => (
            <button key={k} onClick={() => setTab(k)} aria-current={k === tab ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-left text-sm font-medium transition-colors ${k === tab ? 'border-brand-400 bg-white/10 text-white shadow-sm' : 'border-transparent text-panel-ink/65 hover:bg-white/5 hover:text-white'}`}><I size={17} />{l}</button>
          ))}
          <Link to="/" className="flex shrink-0 items-center gap-3 rounded-xl border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-panel-ink/65 transition-colors hover:bg-white/5 hover:text-white lg:mt-2"><Store size={17} />Về cửa hàng<ArrowUpRight size={14} className="ml-auto opacity-50" /></Link>
        </nav>
        <div className="mt-auto hidden rounded-2xl border border-white/10 bg-white/[.04] p-3 lg:block">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600/20 text-sm font-bold text-brand-400">{user.name.trim().charAt(0).toUpperCase()}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{user.name}</p><p className="mt-0.5 text-xs text-panel-ink/45">Quản trị viên</p></div>
          </div>
        </div>
      </aside>
      <main className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-surface/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-brand-600">TECHSTORE / QUẢN TRỊ</p>
            <h1 className="mt-0.5 truncate text-lg font-bold sm:text-xl">{titles[tab]}</h1>
            <p className="hidden text-xs text-ink-3 sm:block">{descriptions[tab]}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) }} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface transition-colors hover:bg-subtle" aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
            <button onClick={() => { logout(); go('/') }} className="btn btn-secondary btn-sm !h-9 !px-2.5 sm:!px-3" aria-label="Đăng xuất"><LogOut size={15} /><span className="hidden sm:inline">Đăng xuất</span></button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1680px] space-y-6 p-4 sm:p-6 lg:p-8">
          {tab === 'dash' && <DashboardTab userName={user.name} onOpenOrders={() => setTab('orders')} onOpenProducts={() => setTab('products')} />}
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
function DashboardTab({ userName, onOpenOrders, onOpenProducts }: { userName: string; onOpenOrders: () => void; onOpenProducts: () => void }) {
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
    { icon: DollarSign, label: 'Doanh thu đã giao', value: vnd(d.kpis.revenue), note: 'Tổng đơn đã hoàn tất', tone: 'text-ok', tint: 'bg-ok/12' },
    { icon: ClipboardList, label: 'Tổng đơn hàng', value: String(d.kpis.orders), note: 'Đơn đã ghi nhận', tone: 'text-brand-600', tint: 'bg-brand-50' },
    { icon: Clock3, label: 'Chờ xác nhận', value: String(d.kpis.pending), note: 'Đang cần xử lý', tone: 'text-warn', tint: 'bg-warn/12' },
    { icon: Users, label: 'Khách hàng', value: String(d.kpis.customers), note: 'Tài khoản khách hàng', tone: 'text-accent-2', tint: 'bg-accent-2/12' },
    { icon: Package, label: 'Sản phẩm đang bán', value: String(d.kpis.products), note: 'Đang hiển thị trên shop', tone: 'text-hot', tint: 'bg-hot/12' },
  ] as const

  return (
    <>
      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-gradient-to-br from-brand-50 via-surface to-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-brand-600">Bảng điều khiển</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">Xin chào, {userName.trim().split(/\s+/).slice(-1)[0]}!</h2><p className="mt-1 text-sm text-ink-2">Đây là tình hình hoạt động cửa hàng của bạn.</p></div>
        <div className="flex flex-wrap gap-2"><button className="btn btn-secondary btn-sm" onClick={onOpenOrders}><ClipboardList size={15} />Đơn hàng</button><button className="btn btn-primary btn-sm" onClick={onOpenProducts}><Plus size={16} />Quản lý sản phẩm</button></div>
      </section>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-5">
        {kpis.map(({ icon: I, label, value, note, tone, tint }) => <div key={label} className="card group relative overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-ink-2">{label}</p><p className="num mt-2 text-2xl font-bold tracking-tight sm:text-[1.75rem]">{value}</p></div><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tint} ${tone}`}><I size={19} /></span></div>
          <p className="mt-3 border-t border-line pt-3 text-[11px] text-ink-3">{note}</p>
          <span className={`absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${tint}`} />
        </div>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <section className="card min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold"><ChartNoAxesCombined size={18} className="text-brand-600" />Doanh thu</h2><p className="mt-1 text-xs text-ink-3">Giá trị đơn hàng đã hoàn tất (triệu ₫)</p></div>
            <select className="input h-9 w-auto" value={range} onChange={(e) => setRange(e.target.value as 'week' | 'month')} aria-label="Khoảng thời gian"><option value="week">7 ngày</option><option value="month">4 tuần</option></select></div>
          <div className="mt-4 h-64"><Bar aria-label="Biểu đồ doanh thu" data={{ labels: series.labels, datasets: [{ label: 'Doanh thu (triệu ₫)', data: series.values, backgroundColor: css('--accent'), borderRadius: 6 }] }} options={{ maintainAspectRatio: false, color: css('--text-1'), plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Triệu ₫', color: css('--text-1') }, ticks: { color: css('--text-1') }, grid: { color: css('--line') } }, x: { ticks: { color: css('--text-1') }, grid: { display: false } } } }} /></div>
        </section>
        <section className="card min-w-0 p-4 sm:p-5">
          <h2 className="font-bold">Đơn hàng theo trạng thái</h2><p className="mt-1 text-xs text-ink-3">Phân bố trạng thái hiện tại</p>
          <div className="mt-4 h-64"><Doughnut aria-label="Đơn hàng theo trạng thái" data={{ labels: statuses.map((s) => statusLabel[s]), datasets: [{ data: statuses.map((s) => d.statusCounts[s] ?? 0), backgroundColor: [css('--warn'), css('--accent'), css('--accent-2'), css('--ok'), css('--danger')], borderWidth: 0 }] }} options={{ maintainAspectRatio: false, color: css('--text-1'), plugins: { legend: { position: 'bottom', labels: { color: css('--text-1') } } } }} /></div>
        </section>
      </div>
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"><div><h2 className="font-bold">Đơn hàng gần đây</h2><p className="mt-1 text-xs text-ink-3">Các đơn mới nhất trong cửa hàng</p></div><button className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50" onClick={onOpenOrders}>Xem tất cả<ArrowUpRight size={15} /></button></div>
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
  const [updateError, setUpdateError] = useState('')
  useEffect(() => { setNext(nextStatuses[order.status][0] ?? 'confirmed') }, [order.status])

  const apply = async () => {
    if (busy) return
    setUpdateError('')
    setBusy(true)
    try { onChanged(await api.admin.setOrderStatus(order.id, next)); toast('Đã cập nhật trạng thái đơn hàng.'); setConfirm(false) } catch (e) { const message = (e as Error).message; setUpdateError(message); toast(message, 'err') } finally { setBusy(false) }
  }
  if (confirm) return (
    <Modal title="Xác nhận cập nhật" onClose={() => { if (!busy) { setConfirm(false); setUpdateError('') } }}>
      <p className="text-ink-2">Chuyển đơn {order.code} sang trạng thái “{statusLabel[next]}”?{next === 'cancelled' && ' Hàng sẽ được hoàn lại kho.'}</p>
      {updateError && <p className="mt-4 rounded-xl bg-danger/15 p-3 text-sm text-danger" role="alert">{updateError}</p>}
      <div className="mt-5 flex justify-end gap-2"><button className="btn btn-secondary" disabled={busy} onClick={() => { setConfirm(false); setUpdateError('') }}>Quay lại</button><button className="btn btn-primary" disabled={busy} aria-busy={busy} onClick={apply}>{busy ? <><LoaderCircle size={16} className="animate-spin" />Đang cập nhật...</> : 'Xác nhận'}</button></div>
    </Modal>
  )
  return (
    <Overlay variant="right" label={`Chi tiết đơn ${order.code}`} onClose={onClose} className="flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-line bg-surface shadow-2xl">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">Chi tiết đơn hàng</p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5"><h2 className="text-xl font-bold">{order.code}</h2><StatusBadge s={order.status} /></div>
          <p className="mt-1 text-sm text-ink-3">Đặt lúc {new Date(order.createdAt).toLocaleString('vi-VN')}</p>
        </div>
        <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-ink-2 transition hover:bg-subtle hover:text-ink" aria-label="Đóng"><X size={18} /></button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
        <section aria-labelledby="order-customer-heading">
          <h3 id="order-customer-heading" className="mb-3 text-sm font-bold">Thông tin nhận hàng</h3>
          <div className="grid gap-3 rounded-2xl border border-line bg-subtle/40 p-4 sm:grid-cols-2">
            <div className="flex min-w-0 items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-600"><UserRound size={17} /></span><div className="min-w-0"><p className="text-xs text-ink-3">Người nhận</p><p className="mt-0.5 break-words text-sm font-semibold">{order.customer}</p></div></div>
            <div className="flex min-w-0 items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-600"><Phone size={17} /></span><div className="min-w-0"><p className="text-xs text-ink-3">Số điện thoại</p><p className="mt-0.5 break-all text-sm font-semibold">{order.phone || '—'}</p></div></div>
            {order.account && <div className="flex min-w-0 items-start gap-3 sm:col-span-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-600"><Mail size={17} /></span><div className="min-w-0"><p className="text-xs text-ink-3">Tài khoản đặt hàng</p><p className="mt-0.5 break-all text-sm font-semibold">{order.account.email}</p></div></div>}
            <div className="flex min-w-0 items-start gap-3 sm:col-span-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-600"><MapPin size={17} /></span><div className="min-w-0"><p className="text-xs text-ink-3">Địa chỉ giao hàng</p><p className="mt-0.5 break-words text-sm font-semibold leading-6">{order.address}</p></div></div>
          </div>
        </section>

        <section aria-labelledby="order-payment-heading">
          <h3 id="order-payment-heading" className="mb-3 text-sm font-bold">Thanh toán</h3>
          <div className="flex items-start gap-3 rounded-2xl border border-line p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-subtle text-ink-2"><CreditCard size={17} /></span><div className="min-w-0"><p className="text-xs text-ink-3">Phương thức</p><p className="mt-0.5 text-sm font-semibold">{paymentLabel[order.payment]}</p></div></div>
        </section>

        <section aria-labelledby="order-items-heading">
          <div className="mb-3 flex items-center justify-between gap-3"><h3 id="order-items-heading" className="text-sm font-bold">Sản phẩm</h3><span className="rounded-full bg-subtle px-2.5 py-1 text-xs font-medium text-ink-2">{order.items.reduce((sum, item) => sum + item.qty, 0)} sản phẩm</span></div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {order.items.map((item) => <li key={item.id} className="flex items-center gap-3 p-3.5 sm:p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-subtle">{item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : <ShoppingBag size={20} className="text-ink-3" />}</div>
              <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold leading-5">{item.name}</p><p className="mt-1 text-xs text-ink-3">{vnd(item.price)} × {item.qty}</p></div>
              <b className="num shrink-0 text-right text-sm">{vnd(item.price * item.qty)}</b>
            </li>)}
          </ul>
        </section>

        <section aria-label="Tổng kết đơn hàng" className="rounded-2xl bg-subtle/50 p-4">
          <div className="flex justify-between gap-3 text-sm"><span className="text-ink-2">Tạm tính</span><span className="num">{vnd(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="mt-2 flex justify-between gap-3 text-sm"><span className="text-ink-2">Giảm giá</span><span className="num font-medium text-ok">−{vnd(order.discount)}</span></div>}
          <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3"><span className="font-bold">Tổng thanh toán</span><span className="num text-lg font-bold text-brand-600">{vnd(order.total)}</span></div>
        </section>

        {order.note && <section className="rounded-2xl border border-line p-4"><h3 className="text-sm font-bold">Ghi chú đơn hàng</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-2">{order.note}</p></section>}
      </div>

      <footer className="shrink-0 border-t border-line bg-surface/95 p-5 backdrop-blur sm:px-6">
        {options.length > 0 ? <>
          <label className="label" htmlFor="next-status">Cập nhật trạng thái</label>
          {updateError && <p className="mb-2 rounded-xl bg-danger/15 p-3 text-sm text-danger" role="alert">{updateError}</p>}
          <div className="flex gap-2"><select id="next-status" className="input min-w-0 flex-1" value={next} onChange={(e) => { setNext(e.target.value as OrderStatus); setUpdateError('') }}>{options.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}</select><button className="btn btn-primary shrink-0" onClick={() => { setUpdateError(''); setConfirm(true) }}>Cập nhật</button></div>
        </> : <p className="rounded-xl bg-subtle px-4 py-3 text-sm text-ink-2">Đơn hàng đã ở trạng thái cuối.</p>}
      </footer>
    </Overlay>
  )
}
