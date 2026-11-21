import mysql from 'mysql2/promise'
import { env } from './env.js'

/**
 * Kết nối MySQL/MariaDB của XAMPP.
 * - host mặc định là 127.0.0.1 (không dùng "localhost" vì Node 17+ có thể phân giải thành ::1 và bị từ chối).
 * - Mỗi kết nối được đặt múi giờ UTC để NOW() / TIMESTAMP nhất quán; trình duyệt tự đổi sang giờ địa phương khi hiển thị.
 */
const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  decimalNumbers: true,
})

;(pool.pool ?? pool).on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'")
})

export default pool
