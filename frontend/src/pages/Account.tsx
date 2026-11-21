import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { CircleAlert, Eye, EyeOff, LoaderCircle, LogOut, PackageOpen, ShieldCheck, Sparkles, UserPen } from 'lucide-react'
import { statusLabel, statusStyle, vnd } from '../data'
import { Field, Logo } from '../components'
import { Link, useGo } from '../nav'
import { useStore } from '../store'

/** Chỉ cho phép quay lại đường dẫn nội bộ (chống chuyển hướng ra trang ngoài). */
const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/')

export default function Account() {
  const { user, login, register, logout, orders, ordersReady, updateProfile, toast } = useStore()
  const go = useGo()
  const [sp] = useSearchParams()
  const next = safeNext(sp.get('next'))
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [edit, setEdit] = useState(false)
  const [pf, setPf] = useState({ name: '', phone: '' })
  const [pfErr, setPfErr] = useState('')
  useEffect(() => { if (user) setPf({ name: user.name, phone: user.phone ?? '' }) }, [user])

  // Đã đăng nhập mà được đưa tới từ trang cần đăng nhập (vd. thanh toán) thì quay lại luôn.
  if (user && sp.get('next')) return <Navigate to={next} replace />

  if (user) {
    const saveProfile = async (e: FormEvent) => {
      e.preventDefault(); setPfErr('')
      if (pf.name.trim().length < 2) return setPfErr('Vui lòng nhập họ tên.')
      if (pf.phone.trim() && !/^(0|\+84)\d{9}$/.test(pf.phone.replace(/\s/g, ''))) return setPfErr('Số điện thoại không hợp lệ.')
      try { await updateProfile(pf.name.trim(), pf.phone.replace(/\s/g, '')); setEdit(false); toast('Đã cập nhật thông tin.') } catch (x) { setPfErr((x as Error).message) }
    }
    return (
      <div className="container-x py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold">Xin chào, {user.name}</h1><p className="text-ink-2">{user.email}{user.phone ? ` · ${user.phone}` : ''}</p></div>
          <div className="flex flex-wrap gap-2">
            {user.role === 'admin' && <Link to="/admin" className="btn btn-primary"><ShieldCheck size={16} />Trang quản trị</Link>}
            <button className="btn btn-secondary" onClick={() => setEdit((v) => !v)} aria-expanded={edit}><UserPen size={16} />Sửa thông tin</button>
            <button className="btn btn-secondary" onClick={() => { logout(); go('/') }}><LogOut size={16} />Đăng xuất</button>
          </div>
        </div>
        {edit && (
          <form onSubmit={saveProfile} noValidate className="card mt-6 grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Họ tên"><input className="input" value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} autoComplete="name" /></Field>
            <Field label="Số điện thoại"><input className="input" value={pf.phone} onChange={(e) => setPf({ ...pf, phone: e.target.value })} inputMode="tel" autoComplete="tel" placeholder="0912345678" /></Field>
            <button className="btn btn-primary">Lưu</button>
            {pfErr && <p className="err sm:col-span-3" role="alert">{pfErr}</p>}
          </form>
        )}
        <h2 className="mb-4 mt-8 text-xl font-bold">Lịch sử đơn hàng</h2>
        {!ordersReady ? <div className="card divide-y divide-line">{[0, 1, 2].map((i) => <div key={i} className="p-4"><div className="skeleton h-5 w-1/3" /></div>)}</div>
          : orders.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 p-10 text-center"><PackageOpen size={30} className="text-ink-3" /><p className="text-ink-2">Bạn chưa có đơn hàng nào.</p><Link to="/products" className="btn btn-primary btn-sm">Bắt đầu mua sắm</Link></div>
          ) : (
            <div className="card divide-y divide-line">
              {orders.map((o) => (
                <Link key={o.id} to={`/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-subtle">
                  <div><b>{o.code}</b><div className="text-xs text-ink-2">{new Date(o.createdAt).toLocaleDateString('vi-VN')} · {o.items.reduce((s, i) => s + i.qty, 0)} sản phẩm</div></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[o.status]}`}>{statusLabel[o.status]}</span><b className="num">{vnd(o.total)}</b>
                </Link>
              ))}
            </div>
          )}
      </div>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (mode === 'register' && f.name.trim().length < 2) er.name = 'Vui lòng nhập họ tên.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Email không hợp lệ.'
    if (f.password.length < 8) er.password = 'Mật khẩu tối thiểu 8 ký tự.'
    setErrs(er); setErr('')
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      if (mode === 'login') await login(f.email, f.password); else await register(f.name, f.email, f.password)
      toast(mode === 'login' ? 'Đăng nhập thành công.' : 'Tạo tài khoản thành công.')
      if (!sp.get('next')) go('/') // có ?next thì <Navigate> ở đầu trang sẽ đưa người dùng quay lại
    } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  const demo = (email: string, password: string) => () => { setMode('login'); setF({ name: '', email, password }); setErrs({}); setErr('') }

  return (
    <div className="container-x py-8">
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-[28px] border border-line bg-surface shadow-card md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-panel p-10 text-panel-ink md:flex">
          <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 8% 4%, rgba(91,140,255,.5), transparent), radial-gradient(70% 55% at 95% 100%, rgba(255,106,61,.36), transparent), radial-gradient(60% 50% at 90% 15%, rgba(139,92,246,.34), transparent)' }} />
          <div className="relative"><Logo dark /></div>
          <div className="relative"><h2 className="display text-4xl !leading-[1.02]">Technology<br />for <span className="text-grad">Life.</span></h2><p className="mt-4 text-panel-ink/70">Đăng nhập để theo dõi đơn hàng, lưu sản phẩm yêu thích và nhận ưu đãi dành riêng cho bạn.</p></div>
          <p className="relative text-xs text-panel-ink/55">Demo — quản trị: admin@techstore.vn / Admin123!<br />Khách hàng: khach@techstore.vn / Khach123!</p>
        </div>
        <div className="p-6 sm:p-10">
          {sp.get('next') && <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-600">Vui lòng đăng nhập để tiếp tục.</p>}
          <div className="mb-6 grid grid-cols-2 rounded-full bg-subtle p-1" role="tablist">
            {([['login', 'Đăng nhập'], ['register', 'Tạo tài khoản']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setErr(''); setErrs({}) }} className={`h-10 rounded-full text-sm font-semibold transition-colors ${mode === k ? 'bg-surface shadow-sm' : 'text-ink-2'}`}>{l}</button>)}
          </div>
          <form onSubmit={submit} noValidate className="space-y-4">
            {err && <div className="flex items-center gap-2 rounded-xl bg-danger/15 p-3 text-sm text-danger" role="alert"><CircleAlert size={16} className="shrink-0" />{err}</div>}
            {mode === 'register' && <Field label="Họ tên" error={errs.name}><input className="input" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>}
            <Field label="Email" error={errs.email}><input type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
            <Field label="Mật khẩu" error={errs.password}>
              {(fp) => <div className="relative"><input {...fp} type={show ? 'text' : 'password'} className="input pr-11" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={show} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>}
            </Field>
            <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? <LoaderCircle size={18} className="animate-spin" /> : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
            {mode === 'login' && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={demo('khach@techstore.vn', 'Khach123!')}><Sparkles size={14} />Khách demo</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={demo('admin@techstore.vn', 'Admin123!')}><ShieldCheck size={14} />Quản trị demo</button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
