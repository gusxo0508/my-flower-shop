// app/shop/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function Shop() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [buyerName, setBuyerName] = useState('');
  const [cart, setCart] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
        if (profile) setBuyerName(profile.name);
      } else {
        toast.error('로그인이 필요합니다.');
        window.location.href = '/login';
        return;
      }

      const { data: noticeData } = await supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(3);
      if (noticeData) setNotices(noticeData);

      const { data: productData, error } = await supabase.from('products').select('*').gt('stock_qty', 0).order('item_name', { ascending: true });
      if (error) {
        toast.error('데이터를 불러오지 못했습니다.');
      } else {
        setProducts(productData || []);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const updateCart = (productId: string, quantity: number, maxStock: number) => {
    let newQuantity = quantity;
    if (quantity > maxStock) {
      newQuantity = maxStock;
      toast.error(`최대 ${maxStock}속까지만 주문 가능합니다.`);
    }
    if (quantity < 0) newQuantity = 0;
    setCart(prev => ({ ...prev, [productId]: newQuantity }));
  };

  const handleOrder = async () => {
    if (!buyerName.trim()) {
      toast.error('주문자 정보가 확인되지 않습니다.');
      return;
    }

    const cartItems = Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const product = products.find(p => p.id === productId);
        return {
          productId,
          quantity: qty,
          varietyName: product.variety_name,
          unitPrice: product.direct_price,
        };
      });

    if (cartItems.length === 0) {
      toast.error('상품을 1개 이상 선택해주세요.');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('결제를 준비하고 있습니다...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/payment/kakao/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerName, cartItems, userId: user?.id }),
      });

      const json = await res.json();
      toast.dismiss(loadingToast);

      if (json.success) {
        // approve 단계에서 tid를 복원하기 위해 sessionStorage에 저장
        sessionStorage.setItem('kakao_tid', json.tid);
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        window.location.href = isMobile ? json.redirect_mobile_url : json.redirect_pc_url;
        // 리다이렉트 후 setSubmitting(false) 불필요 (페이지 전환)
      } else {
        toast.error('결제 준비 실패: ' + json.message);
        setSubmitting(false);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('오류가 발생했습니다.');
      setSubmitting(false);
    }
  };

  const totalPrice = products.reduce((sum, p) => sum + (p.direct_price * (cart[p.id] || 0)), 0);

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-32 pb-20 px-6 md:px-10">
      
      {/* 타이틀 영역 */}
      <header className="max-w-6xl mx-auto mb-16 text-center">
        <h3 className="text-xs tracking-[0.3em] text-amber-700 mb-4 uppercase font-bold">Exclusive Market</h3>
        <h1 className="text-4xl font-serif text-stone-900 tracking-wide mb-6">프라이빗 플라워 마켓</h1>
        <div className="h-[1px] w-12 bg-stone-300 mx-auto"></div>
      </header>

      <main className="max-w-6xl mx-auto">
        
        {/* 미니멀 공지사항 */}
        {notices.length > 0 && (
          <section className="bg-white border border-stone-200 px-8 py-6 mb-16 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div className="flex items-center gap-4">
              <span className="text-xs tracking-[0.2em] font-bold text-stone-400 uppercase">Notice</span>
              <div className="w-[1px] h-4 bg-stone-300"></div>
              <span onClick={() => router.push(`/notices/${notices[0].id}`)} className="text-sm font-light text-stone-800 hover:text-amber-700 cursor-pointer transition-colors truncate max-w-md">
                {notices[0].title}
              </span>
            </div>
            <button onClick={() => router.push('/notices')} className="text-xs tracking-widest text-stone-400 hover:text-stone-800 uppercase transition-colors">
              View All
            </button>
          </section>
        )}

        {/* 주문자 및 총액 서머리 바 */}
        <section className="bg-stone-900 text-white p-8 mb-16 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-stone-900/10">
            <div className='flex-1 w-full'>
                <label className="block text-xs font-light tracking-[0.2em] text-stone-400 mb-3 uppercase">Order Name</label>
                <input 
                    type="text" 
                    value={buyerName}
                    readOnly
                    className="w-full bg-transparent border-b border-stone-600 text-stone-100 p-2 text-lg font-light focus:outline-none cursor-not-allowed"
                />
            </div>
            <div className="text-right w-full md:w-auto border-t md:border-t-0 md:border-l border-stone-700 pt-6 md:pt-0 md:pl-8">
                <p className="text-xs font-light tracking-[0.2em] text-stone-400 mb-2 uppercase">Total Amount</p>
                <p className="text-3xl font-serif tracking-wider">
                    {totalPrice.toLocaleString()} <span className="text-lg font-light text-stone-400">KRW</span>
                </p>
            </div>
        </section>

        {loading ? (
          <div className="text-center py-32 text-stone-400 font-light tracking-[0.2em] text-sm animate-pulse">LOADING INVENTORY...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-32 text-stone-400 font-light tracking-widest border border-stone-200 bg-white">SOLD OUT TODAY</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {products.map((product) => (
              <div key={product.id} className="bg-white border border-stone-200 group hover:border-stone-400 transition-colors duration-500 flex flex-col h-full">
                
                {/* 카드 상단: 정보 */}
                <div className="p-8 border-b border-stone-100 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-light text-stone-900 mb-2">{product.item_name}</h2>
                      <p className="text-sm font-light text-stone-500">{product.variety_name}</p>
                    </div>
                    <span className="border border-stone-300 text-stone-500 px-2 py-1 text-[10px] tracking-widest uppercase">{product.grade}</span>
                  </div>
                  
                  <div className="mt-8">
                    <p className="text-[10px] tracking-[0.2em] text-stone-400 uppercase mb-1">Direct Price</p>
                    <p className="text-2xl font-serif text-stone-900 tracking-wide">{product.direct_price.toLocaleString()}<span className='text-sm font-light text-stone-500 ml-1'>KRW</span></p>
                  </div>
                </div>

                {/* 카드 하단: 컨트롤러 */}
                <div className="p-6 bg-[#FAFAFA] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] tracking-[0.2em] text-stone-400 uppercase mb-1">Stock</span>
                    <span className="text-sm font-medium text-stone-800">{product.stock_qty} EA</span>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white border border-stone-200 p-1">
                    <button onClick={() => updateCart(product.id, (cart[product.id] || 0) - 1, product.stock_qty)} className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-colors">-</button>
                    <input type="number" min="0" max={product.stock_qty} value={cart[product.id] || ''} onChange={(e) => updateCart(product.id, parseInt(e.target.value) || 0, product.stock_qty)} placeholder="0" className="w-10 text-center text-sm font-medium focus:outline-none bg-transparent" />
                    <button onClick={() => updateCart(product.id, (cart[product.id] || 0) + 1, product.stock_qty)} className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-colors">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {products.length > 0 && (
            <div className="mt-20 pt-10 border-t border-stone-200 flex justify-center">
                <button onClick={handleOrder} disabled={submitting || totalPrice === 0} className="bg-stone-900 text-white px-16 py-5 text-sm tracking-[0.2em] uppercase hover:bg-stone-800 disabled:bg-stone-300 disabled:text-stone-500 transition-colors w-full md:w-auto shadow-xl">
                {submitting ? 'Processing...' : 'Complete Order'}
                </button>
            </div>
        )}
      </main>
    </div>
  );
}