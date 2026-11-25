<<<<<<< HEAD
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { admin, auth } from '../middlewares/auth.js'
import { wrap } from '../utils/http.js'
import * as authC from '../controllers/auth.js'
import * as catalogC from '../controllers/catalog.js'
import * as ordersC from '../controllers/orders.js'
import * as wishlistC from '../controllers/wishlist.js'
import * as adminC from '../controllers/admin.js'

const r = Router()

// Chống dò mật khẩu: tối đa 40 lần đăng nhập / đăng ký trong 15 phút cho mỗi địa chỉ IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Bạn thử quá nhiều lần. Vui lòng quay lại sau ít phút.' },
})

/* Công khai */
r.get('/catalog', wrap(catalogC.catalog))
r.get('/products', wrap(catalogC.list))
r.get('/products/:id', wrap(catalogC.detail))
r.post('/newsletter', wrap(catalogC.subscribe))

/* Tài khoản */
r.post('/auth/register', authLimiter, wrap(authC.register))
r.post('/auth/login', authLimiter, wrap(authC.login))
r.get('/auth/me', auth, wrap(authC.me))
r.patch('/auth/me', auth, wrap(authC.updateMe))

/* Khách hàng đã đăng nhập */
r.post('/products/:id/reviews', auth, wrap(catalogC.addReview))
r.post('/coupons/validate', auth, wrap(catalogC.validateCoupon))
r.get('/wishlist', auth, wrap(wishlistC.list))
r.put('/wishlist', auth, wrap(wishlistC.merge))
r.put('/wishlist/:productId', auth, wrap(wishlistC.add))
r.delete('/wishlist/:productId', auth, wrap(wishlistC.remove))
r.post('/orders', auth, wrap(ordersC.create))
r.get('/orders', auth, wrap(ordersC.mine))
r.get('/orders/:id', auth, wrap(ordersC.detail))
r.post('/orders/:id/cancel', auth, wrap(ordersC.cancel))

/* Quản trị */
const a = Router()
a.use(auth, admin)
a.get('/dashboard', wrap(adminC.dashboard))
a.get('/orders', wrap(adminC.orders))
a.patch('/orders/:id/status', wrap(adminC.updateStatus))
a.get('/products', wrap(adminC.products))
a.post('/products', wrap(adminC.createProduct))
a.put('/products/:id', wrap(adminC.updateProduct))
a.delete('/products/:id', wrap(adminC.archiveProduct))
a.get('/customers', wrap(adminC.customers))
a.patch('/customers/:id', wrap(adminC.setCustomerStatus))
a.get('/coupons', wrap(adminC.coupons))
a.post('/coupons', wrap(adminC.createCoupon))
a.patch('/coupons/:id', wrap(adminC.setCouponStatus))
r.use('/admin', a)

export default r
=======
import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { wrap } from '../utils/async.js';
import { auth, admin } from '../middlewares/auth.js';
import * as authController from '../controllers/authController.js';
import * as productController from '../controllers/productController.js';
import * as orderController from '../controllers/orderController.js';
import * as adminController from '../controllers/adminController.js';
import * as adminCatalogController from '../controllers/adminCatalogController.js';
import * as adminCustomerController from '../controllers/adminCustomerController.js';

const router = Router();
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ.',
      details: errors.array(),
    });
  }
  return next();
};

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều lần thử. Vui lòng đợi 15 phút rồi thử lại.' },
});

router.post(
  '/auth/register',
  authRateLimit,
  [
    body('name').isString().trim().isLength({ min: 2, max: 120 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 8, max: 72 }),
    validate,
  ],
  wrap(authController.register),
);
router.post(
  '/auth/login',
  authRateLimit,
  [body('email').isEmail().normalizeEmail(), body('password').isString().notEmpty(), validate],
  wrap(authController.login),
);
router.get('/auth/me', auth, wrap(authController.me));

router.get('/products', wrap(productController.list));
router.get('/products/:id', [param('id').isInt({ min: 1 }), validate], wrap(productController.detail));

router.post('/coupons/validate', auth, wrap(orderController.validateCoupon));
router.post('/orders', auth, wrap(orderController.create));
router.get('/orders', auth, wrap(orderController.mine));
router.get('/orders/:id', auth, [param('id').isInt({ min: 1 }), validate], wrap(orderController.detail));
router.post('/orders/:id/cancel', auth, [param('id').isInt({ min: 1 }), validate], wrap(orderController.cancel));

router.get('/admin/dashboard', auth, admin, wrap(adminController.dashboard));
router.get('/admin/products/meta', auth, admin, wrap(adminCatalogController.metadata));
router.get('/admin/products', auth, admin, wrap(adminCatalogController.list));
router.get('/admin/products/:id', auth, admin, [param('id').isInt({ min: 1 }), validate], wrap(adminCatalogController.detail));
router.post('/admin/products', auth, admin, wrap(adminCatalogController.create));
router.patch('/admin/products/:id', auth, admin, [param('id').isInt({ min: 1 }), validate], wrap(adminCatalogController.update));
router.get('/admin/customers', auth, admin, wrap(adminCustomerController.list));
router.patch('/admin/customers/:id/status', auth, admin, [param('id').isInt({ min: 1 }), body('status').isIn(['active', 'locked']), validate], wrap(adminCustomerController.updateStatus));
router.get('/admin/orders', auth, admin, wrap(adminController.adminOrders));
router.patch(
  '/admin/orders/:id/status',
  auth,
  admin,
  [param('id').isInt({ min: 1 }), body('status').isIn(['pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled']), validate],
  wrap(adminController.updateStatus),
);

export default router;
>>>>>>> 7af6a08 (Cải thiện giao diện và hoàn thiện các chức năng website TECHSTORE)
