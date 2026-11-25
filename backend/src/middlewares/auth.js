<<<<<<< HEAD
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
=======
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export async function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }

  try {
    const userId = Number(claims.id);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }
    const [rows] = await pool.execute(
      "SELECT id,role,status FROM users WHERE id=?",
      [userId],
    );
    const user = rows[0];
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Tài khoản không hoạt động.' });
    }
    req.user = { id: user.id, role: user.role };
    return next();
  } catch (error) {
    return next(error);
>>>>>>> 7af6a08 (Cải thiện giao diện và hoàn thiện các chức năng website TECHSTORE)
  }
}

export function admin(req, res, next) {
<<<<<<< HEAD
  if (req.user?.role !== 'admin') return next(fail(403, 'Bạn không có quyền thực hiện thao tác này.'))
  next()
=======
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này.' });
  }
  return next();
>>>>>>> 7af6a08 (Cải thiện giao diện và hoàn thiện các chức năng website TECHSTORE)
}
