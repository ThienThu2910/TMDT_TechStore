import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import pool from './config/db.js'
import routes from './routes/index.js'
import { errors, notFound } from './middlewares/errors.js'

const app = express()
app.disable('x-powered-by')

// CSP cho phép phông Google Fonts và ảnh https (Unsplash) mà giao diện sử dụng.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(cors({ origin: env.frontendOrigins }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    const [[row]] = await pool.query('SELECT COUNT(*) AS products FROM products')
    res.json({ success: true, message: 'TECHSTORE API đang hoạt động', db: 'connected', products: row.products })
  } catch (e) {
    res.status(503).json({ success: false, db: 'unavailable', code: e.code, message: 'API chạy nhưng chưa kết nối được MySQL / chưa có dữ liệu.' })
  }
})

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false }), routes)
app.use('/api', notFound)

// Chế độ production (npm run build && npm start): Express phục vụ luôn giao diện đã build, chỉ cần một cổng.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist')
const hasBuild = fs.existsSync(path.join(dist, 'index.html'))
if (hasBuild) {
  app.use(express.static(dist, { maxAge: '1h', index: false }))
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.use(errors)

app.listen(env.port, '0.0.0.0', async () => {
  console.log(`\n  TECHSTORE API  ->  http://localhost:${env.port}/api/health`)
  if (hasBuild) console.log(`  Giao diện      ->  http://localhost:${env.port}`)
  else console.log('  Giao diện      ->  http://localhost:5173  (chạy bằng: npm run dev)')
  if (env.usingDefaultSecret) console.warn('  [!] Đang dùng JWT_SECRET mặc định. Hãy đặt giá trị riêng trong backend/.env trước khi triển khai thật.')
  try {
    await pool.query('SELECT 1')
    console.log(`  MySQL          ->  đã kết nối (${env.db.host}:${env.db.port}, database ${env.db.database})\n`)
  } catch (e) {
    console.error(`\n  [X] Chưa kết nối được MySQL (${e.code ?? e.message}).`)
    console.error('      -> Mở XAMPP Control Panel và bấm Start ở dòng MySQL, rồi nhập database/techstore.sql (hoặc chạy: npm run db:setup).\n')
  }
})
