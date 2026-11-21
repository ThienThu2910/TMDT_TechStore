import { DatabaseZap, LoaderCircle, RefreshCw } from 'lucide-react'

/**
 * Màn hình chờ khi tải dữ liệu cửa hàng từ API / MySQL lần đầu.
 * Nếu backend hoặc MySQL (XAMPP) chưa chạy, hiện hướng dẫn cụ thể thay vì một trang trắng.
 */
export function BootScreen({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="font-display text-3xl font-bold tracking-tight"><span className="text-ink">TECH</span><span className="text-grad">STORE</span></div>
        {!error ? (
          <div className="mt-8" role="status" aria-live="polite">
            <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-subtle"><div className="skeleton h-full w-full !rounded-full" /></div>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-ink-2"><LoaderCircle size={16} className="animate-spin" />Đang tải cửa hàng...</p>
          </div>
        ) : (
          <div className="card mt-8 p-6 text-left" role="alert">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger/15 text-danger"><DatabaseZap size={22} /></span>
              <h1 className="font-display text-lg font-bold leading-tight">Chưa kết nối được dữ liệu cửa hàng</h1>
            </div>
            <p className="mt-4 text-sm text-ink-2">{error}</p>
            <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-ink-2">
              <li>Mở <b className="text-ink">XAMPP Control Panel</b> và bấm <b className="text-ink">Start</b> ở dòng <b className="text-ink">MySQL</b>.</li>
              <li>Nhập <code className="rounded bg-subtle px-1.5 py-0.5 text-xs">database/techstore.sql</code> bằng phpMyAdmin, hoặc chạy <code className="rounded bg-subtle px-1.5 py-0.5 text-xs">npm run db:setup</code>.</li>
              <li>Chạy <code className="rounded bg-subtle px-1.5 py-0.5 text-xs">npm run dev</code> ở thư mục gốc dự án.</li>
            </ol>
            <button className="btn btn-primary mt-5 w-full" onClick={onRetry}><RefreshCw size={16} />Thử lại</button>
          </div>
        )}
      </div>
    </div>
  )
}
