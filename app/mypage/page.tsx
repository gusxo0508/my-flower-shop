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

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profileData) setProfile({ ...profileData, email: user.email });

    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        id, order_qty, status, created_at,
        products (item_name, variety_name, variety_code, direct_price)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

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
    <div className="min-h-screen bg-[#FAFAFA] pt-24 md:pt-32 pb-20 px-4 md:px-10">
      <main className="max-w-5xl mx-auto">
        
        <header className="mb-12 md:mb-16 text-center">
          <h3 className="text-[10px] tracking-[0.3em] text-amber-700 mb-4 uppercase font-bold">Client Profile</h3>
          <h1 className="text-3xl md:text-4xl font-serif text-stone-900 tracking-wide mb-6">마이페이지</h1>
          <div className="h-[1px] w-12 bg-stone-300 mx-auto"></div>
        </header>

        <section className="bg-white p-6 md:p-14 border border-stone-200 mb-12 md:mb-16 shadow-2xl shadow-stone-200/40 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none text-9xl font-serif">FF</div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 relative z-10">
            <div className="space-y-6 w-full">
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
                <p className="text-sm font-light text-stone-600 tracking-wide truncate">{profile?.email}</p>
              </div>
            </div>

            <div className="w-full md:w-1/2 border-t md:border-t-0 md:border-l border-stone-200 pt-8 md:pt-0 md:pl-10">
              <p className="text-[10px] tracking-[0.2em] text-stone-400 uppercase mb-2">Shipping Address</p>
              <p className="text-sm font-light text-stone-700 leading-relaxed mb-6 break-keep">{profile?.address}</p>
              
              <div className="bg-stone-50 p-4 border border-stone-100 flex justify-between items-center">
                <span className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Joined</span>
                <span className="text-xs tracking-widest text-stone-800">{new Date(profile?.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-serif text-stone-900 tracking-widest mb-6 border-b border-stone-200 pb-4 uppercase">
            Order History
          </h2>

          {groupedOrders.length === 0 ? (
            <div className="text-center py-24 text-stone-400 text-xs tracking-widest border border-stone-200 bg-white">
              아직 구매 내역이 없습니다.
            </div>
          ) : (
            <div className="bg-white border-t border-b border-stone-900 overflow-hidden relative">
              {/* ✨ 모바일 가로 스크롤 허용 */}
              <div className="overflow-x-auto pb-4 scrollbar-hide">
                <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="p-4 md:p-5 w-10 text-center font-medium text-stone-400 text-[10px] tracking-[0.2em]">+/-</th>
                      <th className="p-4 md:p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Order Date</th>
                      <th className="p-4 md:p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Summary</th>
                      <th className="p-4 md:p-5 text-right font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Total Amount</th>
                      <th className="p-4 md:p-5 text-center font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Status</th>
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
                            <td className="p-4 md:p-5 text-center text-stone-400 text-lg font-light">{isExpanded ? '−' : '+'}</td>
                            <td className="p-4 md:p-5 text-xs md:text-sm font-light text-stone-600 tracking-wider">{group.dateString}</td>
                            <td className="p-4 md:p-5">
                              <span className="font-light text-stone-900 text-sm md:text-base">{summaryText}</span>
                              <span className="text-[10px] tracking-widest text-stone-400 ml-2">({group.totalQty} EA)</span>
                            </td>
                            <td className="p-4 md:p-5 text-right font-serif text-base md:text-lg text-stone-900 tracking-wide">
                              {group.totalPrice.toLocaleString()} <span className="text-[10px] font-sans text-stone-400 ml-1">KRW</span>
                            </td>
                            <td className="p-4 md:p-5 text-center">
                              <span className={`px-2 md:px-3 py-1 text-[9px] md:text-[10px] tracking-widest border ${
                                group.status === '입금대기' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                                group.status === '입금완료' ? 'border-sky-300 text-sky-700 bg-sky-50' :
                                group.status === '배송중'   ? 'border-emerald-400 text-emerald-700 bg-emerald-50' :
                                group.status === '배송완료' ? 'border-stone-900 text-white bg-stone-900' :
                                group.status === '취소'     ? 'border-red-300 text-red-500 bg-red-50' :
                                'border-stone-300 text-stone-600 bg-transparent'
                              }`}>
                                {group.status}
                              </span>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan={5} className="p-0 border-b border-stone-200 bg-[#FAFAFA]">
                                <div className="p-4 md:p-6 md:pl-20 md:pr-10 border-l-4 border-amber-700/50 overflow-x-auto">
                                  <table className="w-full text-left bg-white border border-stone-200 whitespace-nowrap min-w-[500px]">
                                    <thead>
                                      <tr className="bg-stone-50 border-b border-stone-200">
                                        <th className="p-3 pl-4 md:pl-6 text-[10px] font-light tracking-[0.2em] text-stone-400 uppercase">Product</th>
                                        <th className="p-3 text-right text-[10px] font-light tracking-[0.2em] text-stone-400 uppercase">Price</th>
                                        <th className="p-3 text-right text-[10px] font-light tracking-[0.2em] text-stone-400 uppercase">Qty</th>
                                        <th className="p-3 pr-4 md:pr-6 text-right text-[10px] font-light tracking-[0.2em] text-stone-900 uppercase">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                      {group.items.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-stone-50/50">
                                          <td className="p-3 pl-4 md:pl-6">
                                            <span className="font-light text-stone-800 text-xs md:text-sm">{item.product.item_name}</span> 
                                            <span className="ml-2 text-[9px] md:text-[10px] tracking-wider text-stone-400 uppercase">({item.product.variety_name})</span>
                                          </td>
                                          <td className="p-3 text-right font-light text-stone-600 text-xs md:text-sm">{item.product.direct_price.toLocaleString()}</td>
                                          <td className="p-3 text-right font-medium text-stone-800 text-xs md:text-sm">{item.order_qty}</td>
                                          <td className="p-3 pr-4 md:pr-6 text-right font-serif text-stone-900 tracking-wide">{item.price.toLocaleString()}</td>
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
            </div>
          )}
        </section>

      </main>
    </div>
  );
}