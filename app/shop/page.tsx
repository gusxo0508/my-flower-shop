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
  const [buyerName, setBuyerName] = useState(''); // DB에서 가져와서 고정할 이름
  const [cart, setCart] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    async function loadData() {
      // 1. 현재 로그인한 유저의 진짜 이름을 가져와서 고정합니다.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
        if (profile) setBuyerName(profile.name);
      } else {
        toast.error('로그인이 필요합니다.');
        window.location.href = '/login';
        return;
      }

      // 2. 공지사항 및 꽃 데이터 로드
      const { data: noticeData } = await supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(3);
      if (noticeData) setNotices(noticeData);

      const { data: productData, error } = await supabase.from('products').select('*').gt('stock_qty', 0).order('item_name', { ascending: true });
      if (error) {
        toast.error('꽃 데이터를 불러오지 못했습니다 😥');
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
      toast.error(`현재 최대 ${maxStock}속까지만 주문 가능합니다.`);
    }
    if (quantity < 0) newQuantity = 0;
    setCart(prev => ({ ...prev, [productId]: newQuantity }));
  };

  const handleOrder = async () => {
    if (!buyerName.trim()) {
      toast.error('주문자 정보가 확인되지 않습니다. 다시 로그인해주세요.');
      return;
    }

    const cartItems = Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const product = products.find(p => p.id === productId);
        return { productId: productId, quantity: qty, varietyName: product.variety_name };
      });

    if (cartItems.length === 0) {
      toast.error('주문할 꽃을 1개 이상 선택해주세요 🌻');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('주문을 처리하고 있습니다...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerName, cartItems, userId: user?.id })
      });
      
      const json = await res.json();
      toast.dismiss(loadingToast);

      if (json.success) {
        toast.success('🎉 주문이 완료되었습니다! 아버님께 알림이 발송됩니다.');
        setCart({});
        setTimeout(() => { window.location.reload(); }, 2000);
      } else {
        toast.error('주문 실패: ' + json.message);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('주문 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <header className="max-w-6xl mx-auto mb-10 pb-5 border-b border-gray-200">
        <h1 className="text-4xl font-extrabold text-green-800">플로리스트 전용 쇼핑몰</h1>
        <p className="text-gray-600 mt-2">오늘 새벽 경매 낙찰된 신선한 꽃들입니다. 품절되기 전에 서둘러주세요.</p>
      </header>

      <main className="max-w-6xl mx-auto">
        {notices.length > 0 && (
          <section className="bg-blue-50 p-6 rounded-2xl mb-10 border border-blue-100 shadow-sm">
            <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
              <span>📌</span> 아빠의 꽃 농장 소식
            </h2>
            <div className="space-y-3">
              {notices.map(notice => (
                <div key={notice.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                  <span className="font-bold text-gray-800">{notice.title}</span>
                  <span className="text-xs text-gray-400">{new Date(notice.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white p-6 rounded-2xl shadow-md mb-10 border border-green-100 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className='flex-1 w-full'>
                <label className="block text-sm font-bold text-gray-700 mb-2">주문자 성함 (수정 불가)</label>
                {/* ✨ 본인 이름 고정 및 수정 불가 처리 */}
                <input 
                    type="text" 
                    value={buyerName}
                    readOnly
                    className="w-full border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed rounded-lg p-3 text-lg font-bold focus:outline-none"
                />
            </div>
            <div className="text-right w-full md:w-auto">
                <p className="text-gray-500 text-sm">최종 주문 금액</p>
                <p className="text-3xl font-extrabold text-red-600">
                    {products.reduce((sum, p) => sum + (p.direct_price * (cart[p.id] || 0)), 0).toLocaleString()}원
                </p>
            </div>
        </section>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-bold">꽃 데이터를 신선하게 로딩 중입니다...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-500 border-2 border-dashed rounded-xl">오늘은 아직 판매 중인 꽃이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <div key={product.id} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col justify-between hover:shadow-xl transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">{product.item_name}</h2>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">{product.grade}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">품종: {product.variety_name} | 코드: {product.variety_code}</p>
                </div>
                <div className="mt-auto">
                  <div className="flex justify-between items-end mb-5">
                    <p className="text-gray-500 text-sm">도매 직판가(속)</p>
                    <p className="text-3xl font-extrabold text-gray-900">{product.direct_price.toLocaleString()}<span className='text-xl'>원</span></p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-sm font-medium text-gray-600">남은 재고</p>
                        <p className="text-lg font-bold text-green-700">{product.stock_qty} 속</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateCart(product.id, (cart[product.id] || 0) - 1, product.stock_qty)} className="bg-gray-200 text-gray-700 w-10 h-10 rounded-full font-bold text-xl hover:bg-gray-300">-</button>
                      <input type="number" min="0" max={product.stock_qty} value={cart[product.id] || ''} onChange={(e) => updateCart(product.id, parseInt(e.target.value) || 0, product.stock_qty)} placeholder="0" className="flex-1 border border-gray-300 rounded-lg p-2 text-center text-lg font-bold w-16" /> 속
                      <button onClick={() => updateCart(product.id, (cart[product.id] || 0) + 1, product.stock_qty)} className="bg-gray-200 text-gray-700 w-10 h-10 rounded-full font-bold text-xl hover:bg-gray-300">+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {products.length > 0 && (
            <div className="mt-16 mb-10 flex justify-center">
                <button onClick={handleOrder} disabled={submitting} className="bg-green-600 text-white px-16 py-4 rounded-2xl font-bold text-xl hover:bg-green-700 shadow-lg disabled:bg-gray-400 w-full md:w-auto">
                {submitting ? '주문을 처리 중입니다...' : '위의 내용으로 주문 완료하기'}
                </button>
            </div>
        )}
      </main>
    </div>
  );
}