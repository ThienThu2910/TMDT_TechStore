import { useLayoutEffect, useRef } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Footer, Header, ToastHost, EmptyState } from './components'
import { Link } from './nav'
import { StoreProvider } from './store'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderDetail from './pages/OrderDetail'
import Account from './pages/Account'
import Admin from './pages/Admin'
import { Compass } from 'lucide-react'
import { resolveNav, useRipple } from './hooks'

function Shell() {
  const { pathname, key } = useLocation()
  const prev = useRef(pathname)
  // Chạy ở layout effect (trước khi vẽ): cuộn lên đầu trang rồi báo cho View Transition biết trang mới đã sẵn sàng.
  useLayoutEffect(() => {
    if (prev.current !== pathname) { window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }); prev.current = pathname }
    resolveNav()
  }, [key, pathname])
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-full focus:bg-surface-2 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold">Bỏ qua đến nội dung chính</a>
      <Header /><main id="main" className="min-h-[60vh]"><Outlet /></main><Footer />
    </>
  )
}

function Frame() {
  useRipple() // gợn sóng khi bấm nút / chip trên toàn site
  return (
    <>
      <div className="aurora" aria-hidden />
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="account" element={<Account />} />
          <Route path="*" element={<div className="container-x py-16"><EmptyState icon={<Compass size={30} />} title="404 — Không tìm thấy trang." action={<Link to="/" className="btn btn-primary">Về trang chủ</Link>} /></div>} />
        </Route>
        <Route path="admin" element={<Admin />} />
      </Routes>
      <ToastHost />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <Frame />
      </StoreProvider>
    </BrowserRouter>
  )
}
