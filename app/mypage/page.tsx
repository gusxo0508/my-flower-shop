// app/mypage/page.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [groupedOrders, setGroupedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    // 1. 프로필 정보 가져오기
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profileData) setProfile({ ...profileData, email: user.email });

    // 2. 내 주문 내역 가져오기
    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        id, order_qty, status, created_at,
        products (item_name, variety_name, variety_code, direct_price)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // 3. 주문 내역 그룹화 (같은 시간에 주문한 건들 묶기)
    const groups = (ordersData || []).reduce((acc: any, order: any) => {
      const dateKey = new Date(order.created_at).toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      const groupKey = dateKey;
      const product = order.products || { item_name: '알수없음', variety_name: '-', variety_code: '-', direct_price: 0 };
      const price = product.direct_price * order.order_qty;

      if (!acc[groupKey]) {
        acc[groupKey] = {
          idKey: groupKey, dateString: dateKey, status: order.status,
          totalPrice: 0, totalQty: 0, itemCount: 0, items: []
        };
      }

      acc[groupKey].items.push({ ...order, product, price });
      acc[groupKey].totalPrice += price;
      acc[groupKey].totalQty += order.order_qty;
      acc[groupKey].itemCount += 1;

      return acc;
    }, {});

    setGroupedOrders(Object.values(groups));
    setLoading(false);
  };

  const toggleGroup = (idKey: string) => {
    if (expandedGroups.includes(idKey)) {
      setExpandedGroups(expandedGroups.filter(key => key !== idKey));
    } else {
      setExpandedGroups([...expandedGroups, idKey]);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#FAFAFA] pt-32 flex justify-center text-stone-400 text-xs tracking-widest animate-pulse">LOADING PROFILE...</div>;
  }

  const formattedNo = String(profile?.member_no || 0).padStart(6, '0');

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-32 pb-20 px-6 md:px-10">
      <main className="max-w-5xl mx-auto">
        
        {/* 타이틀 */}
        <header className="mb-16 text-center">
          <h3 className="text-[10px] tracking-[0.3em] text-amber-700 mb-4 uppercase font-bold">Client Profile</h3>
          <h1 className="text-4xl font-serif text-stone-900 tracking-wide mb-6">마이페이지</h1>
          <div className="h-[1px] w-12 bg-stone-300 mx-auto"></div>
        </header>

        {/* 멤버십 카드 (프로필 정보) */}
        <section className="bg-white p-10 md:p-14 border border-stone-200 mb-16 shadow-2xl shadow-stone-200/40 relative overflow-hidden">
          {/* 장식용 배경 로고/패턴 느낌 */}
          <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none text-9xl font-serif">FF</div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 relative z-10">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-stone-400 uppercase mb-1">Membership No.</p>
                <p className="text-xl font-mono text-amber-700 tracking-widest">No. {formattedNo}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] text-stone-400 uppercase mb-1">Company / Name</p>
                <p className="text-2xl font-light text-stone-900">{profile?.name}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] text-stone-400 uppercase mb-1">Email / Account</p>
                <p className="text-sm font-light text-stone-600 tracking-wide">{profile?.email}</p>
              </div>
            </div>

            <div className="w-full md:w-1/2 border-t md:border-t-0 md:border-l border-stone-200 pt-8 md:pt-0 md:pl-10">
              <p className="text-[10px] tracking-[0.2em] text-stone-400 uppercase mb-2">Shipping Address</p>
              <p className="text-sm font-light text-stone-700 leading-relaxed mb-6">{profile?.address}</p>
              
              <div className="bg-stone-50 p-4 border border-stone-100 flex justify-between items-center">
                <span className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Joined</span>
                <span className="text-xs tracking-widest text-stone-800">{new Date(profile?.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 내 주문 내역 */}
        <section>
          <h2 className="text-sm font-serif text-stone-900 tracking-widest mb-8 border-b border-stone-200 pb-4 uppercase">
            Order History
          </h2>

          {groupedOrders.length === 0 ? (
            <div className="text-center py-24 text-stone-400 text-xs tracking-widest border border-stone-200 bg-white">
              아직 구매 내역이 없습니다.
            </div>
          ) : (
            <div className="bg-white border-t border-b border-stone-900 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="p-5 w-10 text-center font-medium text-stone-400 text-[10px] tracking-[0.2em]">+/-</th>
                    <th className="p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Order Date</th>
                    <th className="p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Summary</th>
                    <th className="p-5 text-right font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Total Amount</th>
                    <th className="p-5 text-center font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {groupedOrders.map((group) => {
                    const isExpanded = expandedGroups.includes(group.idKey);
                    const representativeItem = group.items[0].product.item_name;
                    const summaryText = group.itemCount > 1 ? `${representativeItem} 외 ${group.itemCount - 1}건` : representativeItem;

                    return (
                      <Fragment key={group.idKey}>
                        <tr className={`hover:bg-stone-50 transition-colors cursor-pointer ${isExpanded ? 'bg-stone-50' : 'bg-white'}`} onClick={() => toggleGroup(group.idKey)}>
                          <td className="p-5 text-center text-stone-400 text-lg font-light">{isExpanded ? '−' : '+'}</td>
                          <td className="p-5 text-sm font-light text-stone-600 tracking-wider">{group.dateString}</td>
                          <td className="p-5">
                            <span className="font-light text-stone-900">{summaryText}</span>
                            <span className="text-[10px] tracking-widest text-stone-400 ml-2">({group.totalQty} EA)</span>
                          </td>
                          <td className="p-5 text-right font-serif text-lg text-stone-900 tracking-wide">
                            {group.totalPrice.toLocaleString()} <span className="text-[10px] font-sans text-stone-400 ml-1">KRW</span>
                          </td>
                          <td className="p-5 text-center">
                            <span className={`px-3 py-1 text-[10px] tracking-widest uppercase border ${
                              group.status === '입금대기' ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-stone-800 text-stone-800 bg-transparent'
                            }`}>
                              {group.status}
                            </span>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="p-0 border-b border-stone-200 bg-[#FAFAFA]">
                              <div className="p-6 md:pl-20 md:pr-10 border-l-4 border-amber-700/50">
                                <table className="w-full text-left bg-white border border-stone-200">
                                  <thead>
                                    <tr className="bg-stone-50 border-b border-stone-200">
                                      <th className="p-3 pl-6 text-[10px] font-light tracking-[0.2em] text-stone-400 uppercase">Product</th>
                                      <th className="p-3 text-right text-[10px] font-light tracking-[0.2em] text-stone-400 uppercase">Price</th>
                                      <th className="p-3 text-right text-[10px] font-light tracking-[0.2em] text-stone-400 uppercase">Qty</th>
                                      <th className="p-3 pr-6 text-right text-[10px] font-light tracking-[0.2em] text-stone-900 uppercase">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-100">
                                    {group.items.map((item: any) => (
                                      <tr key={item.id} className="hover:bg-stone-50/50">
                                        <td className="p-3 pl-6">
                                          <span className="font-light text-stone-800 text-sm">{item.product.item_name}</span> 
                                          <span className="ml-2 text-[10px] tracking-wider text-stone-400 uppercase">({item.product.variety_name})</span>
                                        </td>
                                        <td className="p-3 text-right font-light text-stone-600 text-sm">{item.product.direct_price.toLocaleString()}</td>
                                        <td className="p-3 text-right font-medium text-stone-800 text-sm">{item.order_qty}</td>
                                        <td className="p-3 pr-6 text-right font-serif text-stone-900 tracking-wide">{item.price.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}