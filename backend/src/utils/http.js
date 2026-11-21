export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/** Tạo lỗi HTTP: throw fail(404, 'Không tìm thấy.') */
export const fail = (status, message) => new HttpError(status, message)

/** Bọc controller async để lỗi được chuyển sang middleware xử lý lỗi. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export const ok = (res, data, status = 200) => res.status(status).json({ success: true, data })

/** Chuỗi bắt buộc, cắt khoảng trắng, kiểm tra độ dài. */
export function str(value, label, { min = 1, max = 255 } = {}) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (v.length < min) throw fail(400, `${label} là bắt buộc${min > 1 ? ` (tối thiểu ${min} ký tự)` : ''}.`)
  if (v.length > max) throw fail(400, `${label} quá dài (tối đa ${max} ký tự).`)
  return v
}

/** Số nguyên không âm trong khoảng cho phép. */
export function int(value, label, { min = 0, max = 2_000_000_000 } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) throw fail(400, `${label} không hợp lệ.`)
  return n
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_RE = /^(0|\+84)\d{9}$/

/** Bỏ dấu tiếng Việt, tạo slug dùng cho URL. */
export function slugify(text) {
  return String(text)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'san-pham'
}

export const orderCode = (id) => `TS${10000 + Number(id)}`
