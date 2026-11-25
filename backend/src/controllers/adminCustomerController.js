import pool from '../config/db.js';
import { ruleError } from '../utils/orderRules.js';

export async function list(req, res) {
  const q = String(req.query.q || '').trim();
  const where = q ? 'AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)' : '';
  const values = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
  const [customers] = await pool.execute(
    `SELECT u.id,u.name,u.email,u.phone,u.status,u.created_at,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) order_count,
      (SELECT COALESCE(SUM(o.total_amount),0) FROM orders o WHERE o.user_id=u.id AND o.status IN ('delivered','completed')) lifetime_revenue
      FROM users u WHERE u.role='customer' ${where} ORDER BY u.created_at DESC,u.id DESC LIMIT 500`,
    values,
  );
  return res.json({ success: true, data: customers });
}

export async function updateStatus(req, res) {
  const status = String(req.body.status || '');
  if (!['active', 'locked'].includes(status)) throw ruleError('Trạng thái tài khoản không hợp lệ.');
  if (Number(req.params.id) === Number(req.user.id)) throw ruleError('Không thể thay đổi trạng thái tài khoản đang đăng nhập.', 409);
  const [customers] = await pool.execute("SELECT id,role FROM users WHERE id=? AND role='customer'", [req.params.id]);
  if (!customers.length) throw ruleError('Không tìm thấy khách hàng.', 404);
  await pool.execute('UPDATE users SET status=? WHERE id=?', [status, req.params.id]);
  return res.json({ success: true, data: { id: Number(req.params.id), status }, message: status === 'locked' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.' });
}
