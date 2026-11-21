import 'dotenv/config'

const DEFAULT_SECRET = 'techstore-dev-secret-hay-doi-trong-file-env'

export const env = {
  port: Number(process.env.PORT || 5000),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'techstore_db',
  },
  jwtSecret: process.env.JWT_SECRET || DEFAULT_SECRET,
  usingDefaultSecret: !process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendOrigins: (process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((s) => s.trim()).filter(Boolean),
}
