import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, hasToken, setAuthLostHandler, setToken, type ApiUser, type OrderInput } from './api'
import { categoryIcon, type Category, type LatestReview, type Order, type PaymentMethod, type Product } from './data'
import { BootScreen } from './boot'

export type CartLine = { id: number; qty: number }
export type User = ApiUser
type Toast = { id: number; msg: string; kind: 'ok' | 'err' }
export type PlaceOrderInput = { customer: string; phone: string; address: string; note: string; payment: PaymentMethod; coupon?: string }

type Store = {
  /* danh mục hàng hóa — tải từ MySQL qua API */
  products: Product[]
  categories: Category[]
  brands: string[]
  latestReviews: LatestReview[]
  catName: (slug: string) => string
  refreshCatalog: () => Promise<void>
  /* giỏ hàng (lưu trong trình duyệt, giá và tồn kho luôn được máy chủ kiểm tra lại khi đặt hàng) */
  cart: CartLine[]
  addToCart: (id: number, qty?: number) => boolean
  setQty: (id: number, qty: number) => void
  removeFromCart: (id: number) => void
  restoreToCart: (line: CartLine) => void
  clearCart: () => void
  cartCount: number
  /* yêu thích (đồng bộ vào tài khoản khi đã đăng nhập) */
  wishlist: number[]
  toggleWish: (id: number) => void
  /* tài khoản */
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (name: string, phone: string) => Promise<void>
  /* đơn hàng của chính người dùng */
  orders: Order[]
  ordersReady: boolean
  refreshOrders: () => Promise<void>
  placeOrder: (o: PlaceOrderInput) => Promise<Order>
  cancelOrder: (id: string) => Promise<void>
  /* thông báo nhanh */
  toasts: Toast[]
  toast: (msg: string, kind?: 'ok' | 'err') => void
}

const Ctx = createContext<Store>(null as never)
export const useStore = () => useContext(Ctx)

function usePersisted<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : init } catch { return init }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* bỏ qua */ } }, [key, v])
  return [v, setV] as const
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [latestReviews, setLatest] = useState<LatestReview[]>([])
  const [catalogReady, setCatalogReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)

  const [cart, setCart] = usePersisted<CartLine[]>('ts-cart', [])
  const [wishlist, setWishlist] = usePersisted<number[]>('ts-wish', [])
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!hasToken())
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersReady, setOrdersReady] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const wishRef = useRef(wishlist)
  wishRef.current = wishlist

  const toast = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  /* ---------- danh mục hàng hóa ---------- */
  const refreshCatalog = useCallback(async () => {
    const d = await api.catalog()
    setProducts(d.products)
    setCategories(d.categories.map((c) => ({ ...c, icon: categoryIcon[c.slug] ?? 'Box' })))
    setLatest(d.latestReviews)
  }, [])

  useEffect(() => {
    refreshCatalog().then(() => setCatalogReady(true)).catch((e: Error) => setBootError(e.message))
  }, [refreshCatalog])

  // Giỏ hàng luôn khớp với kho: bỏ sản phẩm đã ngừng bán / hết hàng, hạ số lượng nếu vượt tồn kho.
  useEffect(() => {
    if (!catalogReady) return
    setCart((c) => {
      const next = c.flatMap((l) => {
        const p = products.find((x) => x.id === l.id)
        return p && p.stock > 0 ? [{ id: l.id, qty: Math.max(1, Math.min(l.qty, p.stock)) }] : []
      })
      return next.length === c.length && next.every((l, i) => l.id === c[i].id && l.qty === c[i].qty) ? c : next
    })
  }, [products, catalogReady, setCart])

  /* ---------- tài khoản ---------- */
  const refreshOrders = useCallback(async () => {
    setOrders(await api.myOrders())
    setOrdersReady(true)
  }, [])

  // Sau khi đăng nhập: gộp yêu thích của khách vào tài khoản và tải đơn hàng.
  const syncAccount = useCallback(async () => {
    try { setWishlist(await api.mergeWishlist(wishRef.current)) } catch { /* không chặn đăng nhập */ }
    try { await refreshOrders() } catch { /* không chặn đăng nhập */ }
  }, [refreshOrders, setWishlist])

  const logout = useCallback(() => {
    setToken(null); setUser(null); setOrders([]); setOrdersReady(false); setWishlist([])
  }, [setWishlist])

  useEffect(() => {
    setAuthLostHandler(() => { logout(); toast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 'err') })
    return () => setAuthLostHandler(null)
  }, [logout, toast])

  useEffect(() => {
    if (!hasToken()) return
    api.me()
      .then(async (u) => { setUser(u); await syncAccount() })
      .catch((e) => { if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setToken(null) })
      .finally(() => setAuthReady(true))
  }, [syncAccount])

  const startSession = async (r: { token: string; user: User }) => {
    setToken(r.token); setUser(r.user)
    await syncAccount()
  }
  const login = async (email: string, password: string) => startSession(await api.login(email, password))
  const register = async (name: string, email: string, password: string) => startSession(await api.register(name, email, password))
  const updateProfile = async (name: string, phone: string) => setUser(await api.updateMe(name, phone))

  /* ---------- giỏ hàng ---------- */
  const addToCart = (id: number, qty = 1) => {
    const p = products.find((x) => x.id === id)
    if (!p) { toast('Sản phẩm không còn kinh doanh.', 'err'); return false }
    const cur = cart.find((c) => c.id === id)?.qty ?? 0
    if (p.stock === 0) { toast('Sản phẩm đã hết hàng.', 'err'); return false }
    if (cur + qty > p.stock) { toast(`Chỉ còn ${p.stock} sản phẩm trong kho.`, 'err'); return false }
    setCart((c) => (c.some((x) => x.id === id) ? c.map((x) => (x.id === id ? { ...x, qty: x.qty + qty } : x)) : [...c, { id, qty }]))
    toast('Đã thêm vào giỏ hàng.')
    return true
  }
  const setQty = (id: number, qty: number) => {
    const p = products.find((x) => x.id === id)
    if (!p) return
    if (qty > p.stock) return toast(`Chỉ còn ${p.stock} sản phẩm trong kho.`, 'err')
    if (qty < 1) return
    setCart((c) => c.map((x) => (x.id === id ? { ...x, qty } : x)))
  }
  // Hoàn tác khi lỡ xoá: gộp lại số lượng nếu sản phẩm đã được thêm lại, luôn tôn trọng tồn kho.
  const restoreToCart = (line: CartLine) => setCart((c) => {
    const p = products.find((x) => x.id === line.id)
    if (!p || p.stock === 0) return c
    const cur = c.find((x) => x.id === line.id)?.qty ?? 0
    const qty = Math.min(p.stock, cur + line.qty)
    return c.some((x) => x.id === line.id) ? c.map((x) => (x.id === line.id ? { ...x, qty } : x)) : [...c, { id: line.id, qty }]
  })

  /* ---------- yêu thích ---------- */
  const toggleWish = (id: number) => {
    const has = wishlist.includes(id)
    setWishlist((w) => (has ? w.filter((x) => x !== id) : [...w, id]))
    if (!user) return
    ;(has ? api.removeWish(id) : api.addWish(id)).catch(() => {
      setWishlist((w) => (has ? [...w, id] : w.filter((x) => x !== id)))
      toast('Chưa cập nhật được danh sách yêu thích.', 'err')
    })
  }

  /* ---------- đặt hàng ---------- */
  const placeOrder = async (info: PlaceOrderInput) => {
    const input: OrderInput = { ...info, items: cart.map((c) => ({ productId: c.id, qty: c.qty })) }
    try {
      const order = await api.createOrder(input)
      setCart([])
      await Promise.allSettled([refreshOrders(), refreshCatalog()])
      return order
    } catch (e) {
      await refreshCatalog().catch(() => { /* giữ nguyên dữ liệu cũ */ }) // tồn kho có thể đã đổi
      throw e
    }
  }
  const cancelOrder = async (id: string) => {
    const o = await api.cancelOrder(id)
    setOrders((list) => list.map((x) => (x.id === o.id ? o : x)))
    refreshCatalog().catch(() => { /* kho đã được hoàn, lần tải sau sẽ cập nhật */ })
  }

  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products])

  const value = useMemo<Store>(() => ({
    products, categories, brands, latestReviews, refreshCatalog,
    catName: (slug) => categories.find((c) => c.slug === slug)?.name ?? slug,
    cart, addToCart, setQty, removeFromCart: (id) => setCart((c) => c.filter((x) => x.id !== id)), restoreToCart,
    clearCart: () => setCart([]), cartCount: cart.reduce((s, c) => s + c.qty, 0),
    wishlist, toggleWish,
    user, login, register, logout, updateProfile,
    orders, ordersReady, refreshOrders, placeOrder, cancelOrder,
    toasts, toast,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [products, categories, brands, latestReviews, cart, wishlist, user, orders, ordersReady, toasts])

  return <Ctx.Provider value={value}>{catalogReady && authReady ? children : <BootScreen error={bootError} onRetry={() => window.location.reload()} />}</Ctx.Provider>
}
