export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Không tìm thấy API được yêu cầu.' })
}

// Lỗi kết nối MySQL thường gặp khi dùng XAMPP -> trả thông báo dễ hiểu để biết cần làm gì.
const DB_HINTS = {
  ECONNREFUSED: 'Không kết nối được MySQL. Hãy mở XAMPP Control Panel và bấm Start ở dòng MySQL.',
  PROTOCOL_CONNECTION_LOST: 'Mất kết nối MySQL. Hãy kiểm tra MySQL trong XAMPP còn chạy không.',
  ER_ACCESS_DENIED_ERROR: 'MySQL từ chối đăng nhập. Kiểm tra DB_USER / DB_PASSWORD trong backend/.env (XAMPP mặc định: root, không mật khẩu).',
  ER_BAD_DB_ERROR: 'Chưa có database techstore_db. Hãy nhập file database/techstore.sql bằng phpMyAdmin hoặc chạy: npm run db:setup',
  ER_NO_SUCH_TABLE: 'Database chưa có bảng dữ liệu. Hãy nhập file database/techstore.sql bằng phpMyAdmin hoặc chạy: npm run db:setup',
}

export function errors(err, req, res, next) {
  if (res.headersSent) return next(err)
  const hint = DB_HINTS[err.code]
  if (hint) {
    console.error(`[DB] ${err.code}: ${hint}`)
    return res.status(503).json({ success: false, code: 'DB_UNAVAILABLE', message: hint })
  }
  const status = err.status || 500
  if (status >= 500) console.error(err)
  res.status(status).json({ success: false, message: status >= 500 ? 'Đã có lỗi máy chủ.' : err.message })
}
