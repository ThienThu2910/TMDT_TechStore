import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgePercent, ShieldCheck, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import api from '../services/api';

const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

export default function CheckoutPage() {
  const { cart, setCart } = useStore();
  const navigate = useNavigate();
  const [authState, setAuthState] = useState('checking');
  const [form, setForm] = useState({ recipient_name: '', phone: '', address: '', note: '', payment_method: 'COD' });
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);
  const discount = appliedCoupon?.discount_amount || 0;
  const total = appliedCoupon?.total_amount ?? subtotal;

  useEffect(() => {
    if (!localStorage.getItem('techstore_token')) {
      setAuthState('signed_out');
      return;
    }
    api.get('/auth/me')
      .then(({ data }) => {
        setForm(current => ({
          ...current,
          recipient_name: data.data.name || current.recipient_name,
          phone: data.data.phone || current.phone,
        }));
        setAuthState('signed_in');
      })
      .catch(() => {
        localStorage.removeItem('techstore_token');
        localStorage.removeItem('techstore_user');
        setAuthState('signed_out');
      });
  }, []);

  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

  const applyCoupon = async () => {
    setCouponMessage('');
    setAppliedCoupon(null);
    if (!couponInput.trim()) {
      setCouponMessage('Nhập mã giảm giá trước khi áp dụng.');
      return;
    }
    try {
      const { data } = await api.post('/coupons/validate', {
        coupon_code: couponInput.trim(),
        items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
      });
      setAppliedCoupon(data.data);
      setCouponMessage('Đã áp dụng mã ' + data.data.coupon_code + '.');
    } catch (requestError) {
      setCouponMessage(requestError.response?.data?.message || 'Không thể kiểm tra mã giảm giá.');
    }
  };

  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/orders', {
        ...form,
        coupon_code: appliedCoupon?.coupon_code || '',
        items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
      });
      setCart([]);
      navigate('/orders/' + data.data.id);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
      setAppliedCoupon(null);
    } finally {
      setBusy(false);
    }
  };

  if (!cart.length) {
    return <main className="container checkout-page"><div className="empty-state"><b>Giỏ hàng đang trống</b><Link to="/products" className="primary-btn">Tiếp tục mua sắm <ArrowRight/></Link></div></main>;
  }

  return <main className="container checkout-page">
    <div className="breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><Link to="/cart">Giỏ hàng</Link><span>/</span> Thanh toán</div>
    <div className="page-intro checkout-intro"><span className="eyebrow muted">THANH TOÁN AN TOÀN</span><h1>Hoàn tất đơn hàng</h1><p>Máy chủ sẽ kiểm tra lại giá, mã giảm giá và tồn kho trước khi xác nhận đơn.</p></div>
    {authState === 'checking' && <div className="alert alert-info">Đang kiểm tra tài khoản…</div>}
    {authState === 'signed_out' && <div className="alert alert-warning">Bạn cần đăng nhập trước khi đặt hàng. <Link to="/account">Đăng nhập hoặc tạo tài khoản</Link></div>}
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    <div className="checkout-layout">
      <form onSubmit={submit} className="checkout-form">
        <h2>Thông tin người nhận</h2>
        <label>Họ và tên<input name="recipient_name" required minLength="2" maxLength="120" value={form.recipient_name} onChange={change} placeholder="Nguyễn Văn An"/></label>
        <label>Số điện thoại<input name="phone" required pattern="[+0-9 ()-]{9,20}" value={form.phone} onChange={change} placeholder="0901 234 567"/></label>
        <label>Địa chỉ giao hàng<input name="address" required minLength="5" maxLength="700" value={form.address} onChange={change} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"/></label>
        <label>Ghi chú<textarea name="note" rows="3" maxLength="1000" value={form.note} onChange={change} placeholder="Ghi chú cho người giao hàng"/></label>
        <h2>Phương thức thanh toán</h2>
        <label className="payment-choice"><input type="radio" name="payment_method" value="COD" checked={form.payment_method === 'COD'} onChange={change}/><span><b>Thanh toán khi nhận hàng (COD)</b><small>Thanh toán trực tiếp khi nhận sản phẩm.</small></span></label>
        <label className="payment-choice"><input type="radio" name="payment_method" value="SIMULATED" checked={form.payment_method === 'SIMULATED'} onChange={change}/><span><b>Thanh toán mô phỏng</b><small>Chỉ dùng cho mục đích trình diễn; chưa kết nối cổng thanh toán.</small></span></label>
        <button disabled={busy || authState !== 'signed_in'} className="primary-btn place-order-btn">{busy ? 'Đang xử lý…' : 'Đặt hàng · ' + money(total)} <ArrowRight size={17}/></button>
      </form>
      <aside className="summary checkout-summary">
        <h3>Đơn hàng của bạn</h3>
        <div className="checkout-items">{cart.map(item => <div className="checkout-item" key={item.id}><img src={item.image_url} alt=""/><span>{item.name} × {item.quantity}</span><b>{money(item.price * item.quantity)}</b></div>)}</div>
        <div className="coupon-entry"><label htmlFor="checkout-coupon">Mã giảm giá</label><div><input id="checkout-coupon" value={couponInput} onChange={event => setCouponInput(event.target.value)} placeholder="Nhập mã coupon"/><button type="button" onClick={applyCoupon}><BadgePercent size={15}/> Áp dụng</button></div>{couponMessage && <small className={appliedCoupon ? 'coupon-success' : 'coupon-error'} role="status">{couponMessage}</small>}</div>
        <div><span>Tạm tính</span><b>{money(appliedCoupon?.subtotal ?? subtotal)}</b></div>
        {appliedCoupon && <div><span>Giảm giá ({appliedCoupon.coupon_code})</span><b className="coupon-success">−{money(discount)}</b></div>}
        <div><span>Phí vận chuyển</span><b className="free">Miễn phí</b></div>
        <hr/>
        <div className="grand-total"><span>Tổng thanh toán</span><b>{money(total)}</b></div>
        <div className="checkout-assurances"><span><ShieldCheck/> Giá do máy chủ tính</span><span><Truck/> Kiểm tra tồn kho khi đặt</span></div>
        <Link to="/cart" className="checkout-back-link">Quay lại giỏ hàng</Link>
      </aside>
    </div>
  </main>;
}
