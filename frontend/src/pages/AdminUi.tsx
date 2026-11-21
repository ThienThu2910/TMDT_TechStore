/* Khối giao diện dùng chung trong trang quản trị: khung chờ tải và thông báo lỗi có nút thử lại. */
export function Loading({ rows = 4 }: { rows?: number }) {
  return <div className="card space-y-3 p-5" role="status" aria-label="Đang tải">{Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-9" />)}</div>
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="card p-8 text-center" role="alert"><p className="text-danger">{message}</p><button className="btn btn-secondary btn-sm mt-4" onClick={onRetry}>Thử lại</button></div>
}
