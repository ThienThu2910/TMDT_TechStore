import express, { Router } from 'express'
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
a.post('/product-images', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }), wrap(adminC.uploadProductImage))
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
