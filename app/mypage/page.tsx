// app/mypage/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function MyPage() {
  const [profile, setProfile] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyData = async () => {
      // 1. 현재 로그인한 내 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);

      // 2. 내 주문 내역만 가져오기 (user_id 필터링)
      const { data: orderData } = await supabase
        .from('orders')
        .select(`id, order_qty, status, created_at, products (item_name, variety_name, bid_price)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (orderData) setMyOrders(orderData);
      setLoading(false);
    };

    fetchMyData();
  }, []);

  if (loading) return <div className="text-center py-20">정보를 불러오는 중입니다...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">👤 마이페이지</h1>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-bold mb-4">내 정보</h2>
          <p><span className="text-gray-500 w-24 inline-block">상호명:</span> <span className="font-bold">{profile?.name}</span></p>
          <p><span className="text-gray-500 w-24 inline-block">이메일:</span> {profile?.email}</p>
          <p><span className="text-gray-500 w-24 inline-block">배송지:</span> {profile?.address}</p>
        </div>

        <h2 className="text-xl font-bold mb-4">최근 주문 내역</h2>
        {myOrders.length === 0 ? (
          <div className="bg-white p-10 text-center rounded-xl border border-gray-200 text-gray-500">
            아직 주문하신 내역이 없습니다.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4">주문일자</th>
                  <th className="p-4">상품명</th>
                  <th className="p-4 text-right">수량</th>
                  <th className="p-4 text-right">결제금액</th>
                  <th className="p-4 text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myOrders.map(order => {
                  const date = new Date(order.created_at).toLocaleDateString('ko-KR');
                  const product = order.products || {};
                  const price = (product.bid_price * order.order_qty).toLocaleString();
                  return (
                    <tr key={order.id}>
                      <td className="p-4 text-gray-500">{date}</td>
                      <td className="p-4 font-bold">{product.item_name} <span className="text-xs text-gray-400">({product.variety_name})</span></td>
                      <td className="p-4 text-right">{order.order_qty}속</td>
                      <td className="p-4 text-right font-bold text-red-600">{price}원</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${order.status === '입금완료' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}