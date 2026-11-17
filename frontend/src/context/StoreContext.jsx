import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
const StoreContext = createContext(null);
export function StoreProvider({ children }) {
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('techstore_cart') || '[]'));
  const [products, setProducts] = useState([]); const [categories, setCategories] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/products?limit=24').then(({data}) => { setProducts(data.data || []); setCategories(data.meta?.categories || []); }).catch(() => {}).finally(() => setLoading(false)); }, []);
  useEffect(() => localStorage.setItem('techstore_cart', JSON.stringify(cart)), [cart]);
  const add = (product) => setCart((items) => { const found=items.find(i=>i.id===product.id); return found ? items.map(i=>i.id===product.id?{...i,quantity:Math.min(i.quantity+1,product.stock)}:i) : [...items,{...product,quantity:1}]; });
  const update = (id, delta) => setCart(items=>items.map(i=>i.id===id?{...i,quantity:Math.max(1,Math.min(i.quantity+delta,i.stock))}:i));
  const remove = (id) => setCart(items=>items.filter(i=>i.id!==id));
  const value = useMemo(()=>({cart,add,update,remove,products,categories,loading,setCart}),[cart,products,categories,loading]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export const useStore = () => useContext(StoreContext);
