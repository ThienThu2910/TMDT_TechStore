import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/db.js'
import { env } from '../config/env.js'
import { EMAIL_RE, PHONE_RE, fail, ok, str } from '../utils/http.js'

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone ?? undefined, role: u.role })
const issue = (res, u, status = 200) => {
  const token = jwt.sign({ id: u.id, role: u.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn })
  return ok(res, { token, user: publicUser(u) }, status)
}

export async function register(req, res) {
  const name = str(req.body.name, 'Họ tên', { min: 2, max: 120 })
  const email = str(req.body.email, 'Email', { max: 190 }).toLowerCase()
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  if (!EMAIL_RE.test(email)) throw fail(400, 'Email không hợp lệ.')
  if (password.length < 8) throw fail(400, 'Mật khẩu tối thiểu 8 ký tự.')
  if (password.length > 72) throw fail(400, 'Mật khẩu tối đa 72 ký tự.')

  const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
  if (exists.length) throw fail(409, 'Email này đã được đăng ký.')
  const hash = await bcrypt.hash(password, 10)
  const [r] = await pool.query("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'customer')", [name, email, hash])
  return issue(res, { id: r.insertId, name, email, role: 'customer' }, 201)
}

export async function login(req, res) {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  const [rows] = await pool.query('SELECT id, name, email, phone, password_hash, role, status FROM users WHERE email = ?', [email])
  const u = rows[0]
  if (!u || !(await bcrypt.compare(password, u.password_hash))) throw fail(401, 'Email hoặc mật khẩu không chính xác.')
  if (u.status !== 'active') throw fail(403, 'Tài khoản đã bị khóa. Vui lòng liên hệ cửa hàng.')
  return issue(res, u)
}

export async function me(req, res) {
  const [rows] = await pool.query("SELECT id, name, email, phone, role FROM users WHERE id = ? AND status = 'active'", [req.user.id])
  if (!rows[0]) throw fail(401, 'Tài khoản không còn hoạt động.')
  return ok(res, publicUser(rows[0]))
}

export async function updateMe(req, res) {
  const name = str(req.body.name, 'Họ tên', { min: 2, max: 120 })
  const phoneRaw = typeof req.body.phone === 'string' ? req.body.phone.replace(/\s/g, '') : ''
  if (phoneRaw && !PHONE_RE.test(phoneRaw)) throw fail(400, 'Số điện thoại không hợp lệ.')
  await pool.query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phoneRaw || null, req.user.id])
  return me(req, res)
}
