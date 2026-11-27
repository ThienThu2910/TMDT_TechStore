import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { fail } from '../utils/http.js'

export function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return next(fail(401, 'Vui lòng đăng nhập.'))
  try {
    req.user = jwt.verify(token, env.jwtSecret)
    next()
  } catch {
    next(fail(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'))
  }
}

export function admin(req, res, next) {
  if (req.user?.role !== 'admin') return next(fail(403, 'Bạn không có quyền thực hiện thao tác này.'))
  next()
}
