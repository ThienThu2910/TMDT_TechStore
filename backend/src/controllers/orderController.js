import pool from '../config/db.js';
import {
  calculateDiscountCents,
  fromCents,
  normalizeOrderItems,
  ruleError,
  toCents,
} from '../utils/orderRules.js';

const PAYMENT_METHODS = new Set(['COD', 'SIMULATED']);

export async function create(req, res) {
  const items = normalizeOrderItems(req.body.items);
  const recipientName = String(req.body.recipient_name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const address = String(req.body.address || '').trim();
  const note = String(req.body.note || '').trim();
  const paymentMethod = String(req.body.payment_method || 'COD').trim().toUpperCase();
  const couponCode = String(req.body.coupon_code || '').trim().toUpperCase();

  if (recipientName.length < 2 || recipientName.length > 120) {
    throw ruleError('Họ tên người nhận phải có từ 2 đến 120 ký tự.');
  }
  if (!/^\+?[0-9 ()-]{9,20}$/.test(phone)) throw ruleError('Số điện thoại không hợp lệ.');
  if (address.length < 5 || address.length > 700) throw ruleError('Địa chỉ giao hàng không hợp lệ.');
  if (note.length > 1000) throw ruleError('Ghi chú tối đa 1.000 ký tự.');
  if (!PAYMENT_METHODS.has(paymentMethod)) throw ruleError('Phương thức thanh toán không hợp lệ.');
  if (couponCode.length > 50) throw ruleError('Mã giảm giá không hợp lệ.');

  const connection = await pool.getConnection();
  let transactionOpen = false;
  try {
    await connection.beginTransaction();
    transactionOpen = true;

    const [users] = await connection.execute(
      "SELECT id FROM users WHERE id=? AND status='active' FOR UPDATE",
      [req.user.id],
    );
    if (!users.length) throw ruleError('Tài khoản không hoạt động.', 403);

    const ids = items.map(item => item.product_id);
    const placeholders = ids.map(() => '?').join(',');
    const [products] = await connection.execute(
      "SELECT id,name,price,stock,status FROM products WHERE id IN (" + placeholders + ") ORDER BY id FOR UPDATE",
      ids,
    );
    const productById = new Map(products.map(product => [Number(product.id), product]));
    if (productById.size !== items.length) throw ruleError('Một hoặc nhiều sản phẩm không còn kinh doanh.', 409);

    let subtotalCents = 0;
    const resolved = items.map(item => {
      const product = productById.get(item.product_id);
      if (!product || product.status !== 'active') {
        throw ruleError('Sản phẩm không còn kinh doanh.', 409);
      }
      if (Number(product.stock) < item.quantity) {
        throw ruleError('Sản phẩm ' + product.name + ' không đủ tồn kho.', 409);
      }
      const unitPriceCents = toCents(product.price);
      subtotalCents += unitPriceCents * item.quantity;
      return { product, quantity: item.quantity, unitPriceCents };
    });

    let discountCents = 0;
    let couponId = null;
    if (couponCode) {
      const [coupons] = await connection.execute(
        "SELECT id,discount_type,discount_value,maximum_discount,minimum_order FROM coupons WHERE code=? AND status='active' AND starts_at<=NOW() AND ends_at>=NOW() AND used_count<usage_limit FOR UPDATE",
        [couponCode],
      );
      const coupon = coupons[0];
      if (!coupon) throw ruleError('Mã giảm giá không hợp lệ hoặc đã hết lượt sử dụng.');
      discountCents = calculateDiscountCents(coupon, subtotalCents);
      couponId = coupon.id;
    }

    const totalCents = Math.max(0, subtotalCents - discountCents);
    const [order] = await connection.execute(
      "INSERT INTO orders(user_id,status,subtotal,discount_amount,total_amount,recipient_name,recipient_phone,shipping_address,note,payment_method) VALUES(?,'pending',?,?,?,?,?,?,?,?)",
      [
        req.user.id,
        fromCents(subtotalCents),
        fromCents(discountCents),
        fromCents(totalCents),
        recipientName,
        phone,
        address,
        note || null,
        paymentMethod,
      ],
    );

    for (const item of resolved) {
      const { product, quantity, unitPriceCents } = item;
      const [stockUpdate] = await connection.execute(
        'UPDATE products SET stock=stock-?,sales_count=sales_count+? WHERE id=? AND status=\'active\' AND stock>=?',
        [quantity, quantity, product.id, quantity],
      );
      if (stockUpdate.affectedRows !== 1) {
        throw ruleError('Tồn kho vừa thay đổi. Vui lòng kiểm tra lại giỏ hàng.', 409);
      }
      await connection.execute(
        'INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?)',
        [
          order.insertId,
          product.id,
          product.name,
          quantity,
          fromCents(unitPriceCents),
          fromCents(unitPriceCents * quantity),
        ],
      );
      await connection.execute(
        "INSERT INTO inventory_transactions(product_id,order_id,quantity_change,type,note,created_by) VALUES(?,?,-?,'sale','Đặt hàng',?)",
        [product.id, order.insertId, quantity, req.user.id],
      );
    }

    await connection.execute(
      'INSERT INTO payments(order_id,method,amount,status) VALUES(?,?,?,?)',
      [order.insertId, paymentMethod, fromCents(totalCents), paymentMethod === 'COD' ? 'pending' : 'simulated'],
    );
    await connection.execute(
      "INSERT INTO order_status_history(order_id,status,note,changed_by) VALUES(?,'pending','Đơn hàng được tạo',?)",
      [order.insertId, req.user.id],
    );
    if (couponId) {
      await connection.execute(
        'INSERT INTO coupon_usages(coupon_id,user_id,order_id,discount_amount) VALUES(?,?,?,?)',
        [couponId, req.user.id, order.insertId, fromCents(discountCents)],
      );
      await connection.execute('UPDATE coupons SET used_count=used_count+1 WHERE id=?', [couponId]);
    }

    await connection.commit();
    transactionOpen = false;
    return res.status(201).json({
      success: true,
      data: {
        id: order.insertId,
        subtotal: fromCents(subtotalCents),
        discount_amount: fromCents(discountCents),
        total_amount: fromCents(totalCents),
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'COD' ? 'pending' : 'simulated',
        status: 'pending',
      },
    });
  } catch (error) {
    if (transactionOpen) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function validateCoupon(req, res) {
  const items = normalizeOrderItems(req.body.items);
  const couponCode = String(req.body.coupon_code || '').trim().toUpperCase();
  if (!couponCode || couponCode.length > 50) throw ruleError('Vui lòng nhập mã giảm giá hợp lệ.');

  const ids = items.map(item => item.product_id);
  const placeholders = ids.map(() => '?').join(',');
  const [products] = await pool.execute(
    "SELECT id,name,price,stock,status FROM products WHERE id IN (" + placeholders + ")",
    ids,
  );
  const productById = new Map(products.map(product => [Number(product.id), product]));
  if (productById.size !== items.length) throw ruleError('Một hoặc nhiều sản phẩm không còn kinh doanh.', 409);

  let subtotalCents = 0;
  for (const item of items) {
    const product = productById.get(item.product_id);
    if (!product || product.status !== 'active') throw ruleError('Sản phẩm không còn kinh doanh.', 409);
    if (Number(product.stock) < item.quantity) throw ruleError('Sản phẩm ' + product.name + ' không đủ tồn kho.', 409);
    subtotalCents += toCents(product.price) * item.quantity;
  }

  const [coupons] = await pool.execute(
    "SELECT discount_type,discount_value,maximum_discount,minimum_order FROM coupons WHERE code=? AND status='active' AND starts_at<=NOW() AND ends_at>=NOW() AND used_count<usage_limit",
    [couponCode],
  );
  const coupon = coupons[0];
  if (!coupon) throw ruleError('Mã giảm giá không hợp lệ hoặc đã hết lượt sử dụng.');
  const discountCents = calculateDiscountCents(coupon, subtotalCents);
  return res.json({
    success: true,
    data: {
      coupon_code: couponCode,
      subtotal: fromCents(subtotalCents),
      discount_amount: fromCents(discountCents),
      total_amount: fromCents(subtotalCents - discountCents),
    },
  });
}

export async function mine(req, res) {
  const [orders] = await pool.execute(
    'SELECT id,status,subtotal,discount_amount,total_amount,recipient_name,payment_method,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC',
    [req.user.id],
  );
  return res.json({ success: true, data: orders });
}

export async function detail(req, res) {
  const [orders] = await pool.execute(
    'SELECT * FROM orders WHERE id=? AND user_id=?',
    [req.params.id, req.user.id],
  );
  if (!orders.length) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
  const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id=?', [req.params.id]);
  const [history] = await pool.execute(
    'SELECT status,note,created_at FROM order_status_history WHERE order_id=? ORDER BY created_at,id',
    [req.params.id],
  );
  return res.json({ success: true, data: { ...orders[0], items, history } });
}

export async function restoreOrderStockAndCoupon(connection, order, changedBy, reason) {
  const [items] = await connection.execute(
    'SELECT product_id,quantity FROM order_items WHERE order_id=? ORDER BY product_id FOR UPDATE',
    [order.id],
  );
  for (const item of items) {
    if (item.product_id == null) continue;
    await connection.execute('UPDATE products SET stock=stock+? WHERE id=?', [item.quantity, item.product_id]);
    await connection.execute(
      "INSERT INTO inventory_transactions(product_id,order_id,quantity_change,type,note,created_by) VALUES(?, ?, ?,'return',?,?)",
      [item.product_id, order.id, item.quantity, reason, changedBy],
    );
  }

  const [couponUsages] = await connection.execute(
    'SELECT coupon_id FROM coupon_usages WHERE order_id=? FOR UPDATE',
    [order.id],
  );
  for (const usage of couponUsages) {
    await connection.execute(
      'UPDATE coupons SET used_count=GREATEST(used_count-1,0) WHERE id=?',
      [usage.coupon_id],
    );
  }
  if (couponUsages.length) await connection.execute('DELETE FROM coupon_usages WHERE order_id=?', [order.id]);
}

export async function cancel(req, res) {
  const connection = await pool.getConnection();
  let transactionOpen = false;
  try {
    await connection.beginTransaction();
    transactionOpen = true;
    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE id=? AND user_id=? FOR UPDATE',
      [req.params.id, req.user.id],
    );
    const order = orders[0];
    if (!order) throw ruleError('Không tìm thấy đơn hàng.', 404);
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw ruleError('Không thể hủy đơn hàng ở trạng thái hiện tại.', 409);
    }

    await restoreOrderStockAndCoupon(connection, order, req.user.id, 'Hoàn kho do khách hủy đơn');
    await connection.execute(
      "UPDATE orders SET status='cancelled',cancelled_at=NOW() WHERE id=?",
      [order.id],
    );
    await connection.execute("UPDATE payments SET status='cancelled' WHERE order_id=?", [order.id]);
    await connection.execute(
      "INSERT INTO order_status_history(order_id,status,note,changed_by) VALUES(?,'cancelled','Khách hàng hủy đơn',?)",
      [order.id, req.user.id],
    );

    await connection.commit();
    transactionOpen = false;
    return res.json({ success: true, message: 'Đã hủy đơn hàng.' });
  } catch (error) {
    if (transactionOpen) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
