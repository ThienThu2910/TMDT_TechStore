/* Kiểu dữ liệu + hàm tiện ích dùng chung. Dữ liệu thật (sản phẩm, đơn hàng...) đến từ API / MySQL, xem api.ts và store.tsx. */

export type Category = { id?: number; slug: string; name: string; icon: string }

/** Biểu tượng cho từng danh mục (danh mục mới do quản trị thêm sẽ dùng biểu tượng hộp). */
export const categoryIcon: Record<string, string> = {
  laptop: 'Laptop', 'dien-thoai': 'Smartphone', 'may-tinh-bang': 'Tablet', 'man-hinh': 'Monitor', 'phu-kien': 'Headphones',
}

export type Product = {
  id: number
  name: string
  brand: string
  category: string // slug danh mục
  price: number
  originalPrice?: number
  stock: number
  rating: number
  reviews: number
  isNew?: boolean
  isFeatured?: boolean
  sold: number
  images: string[]
  description: string
  specs: [string, string][]
  status?: 'active' | 'draft' | 'archived'
}

/** Bỏ dấu tiếng Việt + hạ chữ thường để "dien thoai" tìm được "Điện thoại". */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
/** Tên ngắn gọn (3 từ đầu) dùng cho nhãn, tiêu đề bảng so sánh. */
export const shortName = (name: string) => name.split(' ').slice(0, 3).join(' ')
/** Ngưỡng miễn phí vận chuyển, dùng chung cho thanh tiến trình ở giỏ hàng / mini-cart. */
export const FREE_SHIP = 5_000_000
export const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN') + '₫'
export const discountPct = (p: Pick<Product, 'price' | 'originalPrice'>) => (p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0)

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled'
export const statusLabel: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy',
}
export const statusStyle: Record<OrderStatus, string> = {
  pending: 'bg-warn/15 text-warn', confirmed: 'bg-brand-50 text-brand-600', shipping: 'bg-accent-2/15 text-accent-2',
  delivered: 'bg-ok/15 text-ok', cancelled: 'bg-danger/15 text-danger',
}
/** Trạng thái tiếp theo mà quản trị viên được phép chuyển (trùng với máy chủ). */
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'], confirmed: ['shipping', 'cancelled'], shipping: ['delivered'], delivered: [], cancelled: [],
}

export type PaymentMethod = 'COD' | 'SIMULATED'
export const paymentLabel: Record<PaymentMethod, string> = { COD: 'Thanh toán khi nhận hàng (COD)', SIMULATED: 'Chuyển khoản ngân hàng (mô phỏng)' }

export type OrderItem = { id: number; productId: number | null; name: string; price: number; qty: number; image: string }
export type Order = {
  id: string // mã số trong database, dùng trong đường dẫn /orders/:id
  code: string // mã hiển thị, ví dụ TS10015
  createdAt: string
  status: OrderStatus
  customer: string
  phone: string
  address: string
  note?: string
  payment: PaymentMethod
  subtotal: number
  discount: number
  total: number
  items: OrderItem[]
  account?: { name: string; email: string } // chỉ có trong trang quản trị
}

export type Review = { id: number; rating: number; comment: string; customer: string; createdAt: string }
export type LatestReview = { id: number; rating: number; comment: string; customer: string; product: string; createdAt: string }
