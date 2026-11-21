/* Lớp gọi API duy nhất của giao diện. Mọi dữ liệu cửa hàng đều đi qua đây tới backend Express + MySQL (XAMPP). */
import type { Category, LatestReview, Order, OrderStatus, PaymentMethod, Product, Review } from './data'

const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '/api').replace(/\/$/, '')
const TOKEN_KEY = 'ts-token'

let token: string | null = (() => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } })()
export const hasToken = () => !!token
export function setToken(t: string | null) {
  token = t
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY) } catch { /* bỏ qua */ }
}

/** Store đăng ký hàm này để tự đăng xuất khi máy chủ báo token hết hạn. */
let onAuthLost: (() => void) | null = null
export const setAuthLostHandler = (fn: (() => void) | null) => { onAuthLost = fn }

export class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code }
}

async function request<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? 'GET',
      headers: { ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError('Không kết nối được máy chủ API. Hãy chắc chắn backend đang chạy (npm run dev).', 0, 'NETWORK')
  }
  let json: { success?: boolean; data?: unknown; message?: string; code?: string } | null = null
  try { json = await res.json() } catch { /* phản hồi không phải JSON */ }

  if (!res.ok || json?.success === false) {
    if (res.status === 401 && token && !path.startsWith('/auth/login')) onAuthLost?.()
    // Vite proxy trả 500/502/504 không có nội dung khi backend chưa chạy
    if (!json && res.status >= 500) throw new ApiError('Không kết nối được máy chủ API. Hãy chắc chắn backend đang chạy (npm run dev).', res.status, 'NETWORK')
    throw new ApiError(json?.message ?? `Lỗi máy chủ (${res.status}).`, res.status, json?.code)
  }
  return json?.data as T
}

const get = <T>(path: string) => request<T>(path)
const call = <T>(method: string, path: string, body?: unknown) => request<T>(path, { method, body })

export type ApiUser = { id: number; name: string; email: string; phone?: string; role: 'customer' | 'admin' }
export type Catalog = { categories: Omit<Category, 'icon'>[]; products: Product[]; latestReviews: LatestReview[] }
export type ProductDetailData = Product & { reviewList: Review[] }
export type OrderInput = {
  items: { productId: number; qty: number }[]
  customer: string; phone: string; address: string; note: string; payment: PaymentMethod; coupon?: string
}
export type CouponCheck = { code: string; description: string; discount: number }

export type Dashboard = {
  kpis: { revenue: number; orders: number; customers: number; products: number; pending: number }
  statusCounts: Record<OrderStatus, number>
  series: { week: { labels: string[]; values: number[] }; month: { labels: string[]; values: number[] } }
  recent: Order[]
}
export type AdminCustomer = { id: number; name: string; email: string; phone: string; status: 'active' | 'locked'; createdAt: string; orders: number; spent: number }
export type AdminCoupon = {
  id: number; code: string; description: string; type: 'percent' | 'fixed'; value: number; maxDiscount: number | null
  minOrder: number; limit: number; used: number; startsAt: string; endsAt: string; status: 'active' | 'inactive'
}
export type ProductInput = {
  name: string; brand: string; categoryId: number; price: number; originalPrice: number | null; stock: number
  description: string; images: string[]; specs: [string, string][]; isNew: boolean; isFeatured: boolean; status: 'active' | 'draft' | 'archived'
}
export type CouponInput = { code: string; description: string; type: 'percent' | 'fixed'; value: number; minOrder: number; maxDiscount: number | null; limit: number; days: number }

export const api = {
  health: () => fetch(BASE + '/health').then((r) => r.json() as Promise<{ success: boolean; db?: string; message?: string }>).catch(() => null),
  catalog: () => get<Catalog>('/catalog'),
  product: (id: number) => get<ProductDetailData>(`/products/${id}`),
  addReview: (id: number, rating: number, comment: string) => call<ProductDetailData>('POST', `/products/${id}/reviews`, { rating, comment }),
  subscribe: (email: string) => call<{ email: string }>('POST', '/newsletter', { email }),

  login: (email: string, password: string) => call<{ token: string; user: ApiUser }>('POST', '/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => call<{ token: string; user: ApiUser }>('POST', '/auth/register', { name, email, password }),
  me: () => get<ApiUser>('/auth/me'),
  updateMe: (name: string, phone: string) => call<ApiUser>('PATCH', '/auth/me', { name, phone }),

  wishlist: () => get<number[]>('/wishlist'),
  mergeWishlist: (ids: number[]) => call<number[]>('PUT', '/wishlist', { ids }),
  addWish: (id: number) => call<number[]>('PUT', `/wishlist/${id}`),
  removeWish: (id: number) => call<number[]>('DELETE', `/wishlist/${id}`),

  myOrders: () => get<Order[]>('/orders'),
  createOrder: (o: OrderInput) => call<Order>('POST', '/orders', o),
  cancelOrder: (id: string) => call<Order>('POST', `/orders/${id}/cancel`),
  checkCoupon: (code: string, subtotal: number) => call<CouponCheck>('POST', '/coupons/validate', { code, subtotal }),

  admin: {
    dashboard: () => get<Dashboard>('/admin/dashboard'),
    orders: () => get<Order[]>('/admin/orders'),
    setOrderStatus: (id: string, status: OrderStatus) => call<Order>('PATCH', `/admin/orders/${id}/status`, { status }),
    products: () => get<{ products: Product[]; categories: { id: number; name: string; slug: string }[]; brands: { id: number; name: string }[] }>('/admin/products'),
    createProduct: (p: ProductInput) => call<Product>('POST', '/admin/products', p),
    updateProduct: (id: number, p: ProductInput) => call<Product>('PUT', `/admin/products/${id}`, p),
    archiveProduct: (id: number) => call<Product>('DELETE', `/admin/products/${id}`),
    customers: () => get<AdminCustomer[]>('/admin/customers'),
    setCustomerStatus: (id: number, status: 'active' | 'locked') => call<{ id: number; status: string }>('PATCH', `/admin/customers/${id}`, { status }),
    coupons: () => get<AdminCoupon[]>('/admin/coupons'),
    createCoupon: (c: CouponInput) => call<AdminCoupon>('POST', '/admin/coupons', c),
    setCouponStatus: (id: number, status: 'active' | 'inactive') => call<AdminCoupon>('PATCH', `/admin/coupons/${id}`, { status }),
  },
}
