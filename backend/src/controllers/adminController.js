import pool from '../config/db.js';
import { canTransitionOrder, ruleError } from '../utils/orderRules.js';
import { restoreOrderStockAndCoupon } from './orderController.js';

export async function dashboard(req, res) {
  const [[revenue]] = await pool.execute(
    "SELECT COALESCE(SUM(total_amount),0) revenue FROM orders WHERE status IN ('delivered','completed')",
  );
  const [[orders]] = await pool.execute('SELECT COUNT(*) total FROM orders');
  const [[customers]] = await pool.execute("SELECT COUNT(*) total FROM users WHERE role='customer'");
  const [[products]] = await pool.execute("SELECT COUNT(*) total FROM products WHERE status='active'");
  const [[pending]] = await pool.execute("SELECT COUNT(*) total FROM orders WHERE status='pending'");
  const [[lowStock]] = await pool.execute("SELECT COUNT(*) total FROM products WHERE status='active' AND stock<=5");
  const [monthlyRevenue] = await pool.execute(
    "SELECT DATE_FORMAT(MIN(created_at),'%b') month,COALESCE(SUM(total_amount),0) revenue FROM orders WHERE created_at>=DATE_SUB(CURDATE(),INTERVAL 6 MONTH) AND status IN ('delivered','completed') GROUP BY YEAR(created_at),MONTH(created_at) ORDER BY YEAR(created_at),MONTH(created_at)",
  );
  const [monthlyOrders] = await pool.execute(
    "SELECT DATE_FORMAT(MIN(created_at),'%b') month,COUNT(*) orders FROM orders WHERE created_at>=DATE_SUB(CURDATE(),INTERVAL 6 MONTH) GROUP BY YEAR(created_at),MONTH(created_at) ORDER BY YEAR(created_at),MONTH(created_at)",
  );
  const maxRevenue = Math.max(1, ...monthlyRevenue.map(row => Number(row.revenue)));
  const maxOrders = Math.max(1, ...monthlyOrders.map(row => Number(row.orders)));
  const [recentOrders] = await pool.execute(
    'SELECT o.id,o.total_amount,o.status,o.created_at,u.name customer_name FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 8',
  );
  return res.json({
    success: true,
    data: {
      revenue: revenue.revenue,
      orders: orders.total,
      customers: customers.total,
      products: products.total,
      pending: pending.total,
      low_stock: lowStock.total,
      monthly_revenue: monthlyRevenue,
      max_revenue: maxRevenue,
      monthly_orders: monthlyOrders,
      max_orders: maxOrders,
      recent_orders: recentOrders,
    },
  });
}

export async function adminOrders(req, res) {
  const [orders] = await pool.execute(
    'SELECT o.*,u.name customer_name,u.email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 200',
  );
  return res.json({ success: true, data: orders });
}

export async function updateStatus(req, res) {
  const nextStatus = String(req.body.status || '').trim();
  const connection = await pool.getConnection();
  let transactionOpen = false;
  try {
    await connection.beginTransaction();
    transactionOpen = true;
    const [rows] = await connection.execute('SELECT * FROM orders WHERE id=? FOR UPDATE', [req.params.id]);
    const order = rows[0];
    if (!order) throw ruleError('Không tìm thấy đơn hàng.', 404);
    if (!canTransitionOrder(order.status, nextStatus)) {
      throw ruleError('Không thể chuyển đơn từ trạng thái ' + order.status + ' sang ' + nextStatus + '.', 409);
    }
    if (order.status === nextStatus) {
      await connection.commit();
      transactionOpen = false;
      return res.json({ success: true, message: 'Đơn hàng đã ở trạng thái này.', data: { status: nextStatus } });
    }

    if (nextStatus === 'cancelled') {
      await restoreOrderStockAndCoupon(connection, order, req.user.id, 'Hoàn kho do quản trị viên hủy đơn');
      await connection.execute("UPDATE payments SET status='cancelled' WHERE order_id=?", [order.id]);
      await connection.execute("UPDATE orders SET status='cancelled',cancelled_at=NOW() WHERE id=?", [order.id]);
    } else {
      await connection.execute('UPDATE orders SET status=? WHERE id=?', [nextStatus, order.id]);
    }
    await connection.execute(
      'INSERT INTO order_status_history(order_id,status,note,changed_by) VALUES(?,?,?,?)',
      [order.id, nextStatus, 'Cập nhật bởi quản trị viên', req.user.id],
    );

    await connection.commit();
    transactionOpen = false;
    return res.json({ success: true, message: 'Đã cập nhật trạng thái.', data: { status: nextStatus } });
  } catch (error) {
    if (transactionOpen) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
