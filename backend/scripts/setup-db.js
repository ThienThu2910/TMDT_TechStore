// Tạo database + bảng + dữ liệu mẫu từ database/techstore.sql.
//   npm run db:setup   -> an toàn, chạy lại nhiều lần không ghi đè dữ liệu đang có
//   npm run db:reset   -> XÓA toàn bộ database techstore_db rồi tạo lại từ đầu
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { env } from '../src/config/env.js'

const sqlFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../database/techstore.sql')
const reset = process.argv.includes('--reset')
const DB = 'techstore_db' // trùng với tên trong file SQL

async function confirmReset() {
  if (process.argv.includes('--yes')) return true
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const a = await rl.question(`Thao tác này sẽ XÓA toàn bộ dữ liệu trong database "${DB}". Gõ "yes" để tiếp tục: `)
  rl.close()
  return a.trim().toLowerCase() === 'yes'
}

let conn
try {
  conn = await mysql.createConnection({
    host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password,
    multipleStatements: true, charset: 'utf8mb4',
  })
} catch (e) {
  console.error('\n[X] Không kết nối được MySQL:', e.code ?? e.message)
  if (e.code === 'ECONNREFUSED') console.error('    -> Mở XAMPP Control Panel và bấm Start ở dòng MySQL (chờ chữ MySQL chuyển nền xanh).')
  if (e.code === 'ER_ACCESS_DENIED_ERROR') console.error('    -> Sai DB_USER / DB_PASSWORD trong backend/.env (XAMPP mặc định: root, không mật khẩu).')
  process.exit(1)
}

try {
  if (reset) {
    if (!(await confirmReset())) { console.log('Đã hủy.'); process.exit(0) }
    await conn.query(`DROP DATABASE IF EXISTS \`${DB}\``)
    console.log(`Đã xóa database ${DB}.`)
  }
  await conn.query(fs.readFileSync(sqlFile, 'utf8'))
  const [[c]] = await conn.query(
    `SELECT (SELECT COUNT(*) FROM \`${DB}\`.products) AS products, (SELECT COUNT(*) FROM \`${DB}\`.users) AS users,
            (SELECT COUNT(*) FROM \`${DB}\`.orders) AS orders`)
  console.log(`\nDatabase "${DB}" sẵn sàng: ${c.products} sản phẩm, ${c.users} tài khoản, ${c.orders} đơn hàng.`)
  console.log('Tài khoản demo:  admin@techstore.vn / Admin123!   |   khach@techstore.vn / Khach123!\n')
} catch (e) {
  console.error('\n[X] Lỗi khi nhập dữ liệu:', e.sqlMessage ?? e.message)
  process.exitCode = 1
} finally {
  await conn.end()
}
