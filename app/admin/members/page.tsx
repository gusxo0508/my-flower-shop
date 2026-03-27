// app/admin/members/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';

export default function MemberManagement() {
  const [allMembers, setAllMembers] = useState<any[]>([]); 
  const [displayedMembers, setDisplayedMembers] = useState<any[]>([]); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [loading, setLoading] = useState(true);
  
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [memberOrders, setMemberOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    fetchMembersAndSort();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setDisplayedMembers(allMembers);
    } else {
      const filtered = allMembers.filter(m => m.email.toLowerCase().includes(searchTerm.toLowerCase()));
      setDisplayedMembers(filtered);
    }
  }, [searchTerm, allMembers]);

  const fetchMembersAndSort = async () => {
    setLoading(true);
    const { data: users, error: userError } = await supabase.from('profiles').select('*').eq('role', 'user');
    const { data: orders, error: orderError } = await supabase.from('orders').select('user_id, created_at');

    if (userError || orderError) {
      toast.error('데이터를 불러오지 못했습니다.');
      setLoading(false);
      return;
    }

    const latestOrderMap: Record<string, string> = {};
    (orders || []).forEach(o => {
      if (!latestOrderMap[o.user_id] || new Date(o.created_at) > new Date(latestOrderMap[o.user_id])) {
        latestOrderMap[o.user_id] = o.created_at;
      }
    });

    const membersWithDates = (users || []).map(u => ({
      ...u,
      latestOrderDate: latestOrderMap[u.id] || '1970-01-01T00:00:00.000Z' 
    }));

    membersWithDates.sort((a, b) => {
      const dateA = new Date(a.latestOrderDate).getTime();
      const dateB = new Date(b.latestOrderDate).getTime();
      if (dateA !== dateB) return dateB - dateA; 
      return a.name.localeCompare(b.name); 
    });

    setAllMembers(membersWithDates);
    setDisplayedMembers(membersWithDates);
    setLoading(false);
  };

  const fetchMemberOrders = async (userId: string) => {
    if (selectedMember === userId) {
      setSelectedMember(null);
      setMemberOrders([]);
      return;
    }

    setLoadingOrders(true);
    setSelectedMember(userId);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_qty, status, created_at,
        products (item_name, variety_name, variety_code, bid_price, direct_price)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('상세 구매 내역을 불러오지 못했습니다.');
    } else if (data) {
      setMemberOrders(data);
    }
    setLoadingOrders(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-32 pb-20 px-6 md:px-10">
      <main className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-stone-200 pb-8">
          <div>
            <h3 className="text-[10px] tracking-[0.3em] text-amber-700 mb-2 uppercase font-bold">Admin Console</h3>
            <h1 className="text-3xl font-serif text-stone-900 tracking-wide">회원 관리 (CRM)</h1>
          </div>
          
          <div className="w-full md:w-80 relative flex items-center">
            <span className="text-[10px] tracking-[0.2em] text-stone-400 uppercase mr-4">Search</span>
            <input 
              type="text" 
              placeholder="이메일 검색" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-b border-stone-300 py-2 text-sm text-stone-800 font-light focus:outline-none focus:border-stone-900 transition-colors"
            />
          </div>
        </header>

        {loading ? (
          <div className="text-center py-32 text-stone-400 text-xs tracking-widest border border-stone-200 bg-white animate-pulse">LOADING DATA...</div>
        ) : displayedMembers.length === 0 ? (
          <div className="text-center py-32 text-stone-400 text-xs tracking-widest border border-stone-200 bg-white">NO MEMBERS FOUND</div>
        ) : (
          <div className="bg-white border-t border-b border-stone-900 overflow-hidden shadow-2xl shadow-stone-200/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">No. (Join Date)</th>
                    <th className="p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Name</th>
                    <th className="p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Last Order</th>
                    <th className="p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Email</th>
                    <th className="p-5 text-center font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {displayedMembers.map((member) => {
                    const hasOrder = member.latestOrderDate !== '1970-01-01T00:00:00.000Z';
                    const formattedNo = String(member.member_no || 0).padStart(6, '0');

                    return (
                      <div key={member.id} className="contents">
                        <tr className="hover:bg-stone-50/50 transition-colors">
                          <td className="p-5 text-sm font-light">
                            <span className="font-mono text-amber-700 tracking-widest">No. {formattedNo}</span>
                            <span className="text-[10px] tracking-widest text-stone-400 mt-1 block uppercase">Joined: {new Date(member.created_at).toLocaleDateString('ko-KR')}</span>
                          </td>
                          <td className="p-5 font-light text-stone-900 text-base">{member.name}</td>
                          <td className="p-5 text-sm font-light">
                            {hasOrder ? (
                              <span className="text-stone-800 tracking-wider">{new Date(member.latestOrderDate).toLocaleDateString('ko-KR')}</span>
                            ) : (
                              <span className="text-stone-300 tracking-widest text-xs uppercase">No Order</span>
                            )}
                          </td>
                          <td className="p-5 text-stone-600 font-light text-sm">{member.email}</td>
                          <td className="p-5 text-center">
                            <button 
                              onClick={() => fetchMemberOrders(member.id)}
                              className={`px-6 py-2 text-[10px] tracking-[0.2em] uppercase transition-colors border ${
                                selectedMember === member.id 
                                  ? 'bg-stone-900 text-white border-stone-900' 
                                  : 'bg-transparent text-stone-500 border-stone-300 hover:bg-stone-100 hover:text-stone-900'
                              }`}
                            >
                              {selectedMember === member.id ? 'Close' : 'View'}
                            </button>
                          </td>
                        </tr>

                        {selectedMember === member.id && (
                          <tr>
                            <td colSpan={5} className="p-0 border-b border-stone-200 bg-[#FAFAFA]">
                              <div className="p-8 md:pl-24 md:pr-12 border-l-4 border-amber-700/50">
                                <h3 className="font-serif text-stone-900 mb-6 tracking-wide flex items-center gap-3">
                                  <span className="text-amber-700 text-sm">✦</span> {member.name} 님의 구매 이력
                                </h3>
                                {loadingOrders ? (
                                  <p className="text-xs text-stone-400 tracking-widest uppercase">Loading...</p>
                                ) : memberOrders.length === 0 ? (
                                  <p className="text-xs text-stone-400 tracking-widest uppercase">No purchase history</p>
                                ) : (
                                  <div className="bg-white border border-stone-200 overflow-hidden shadow-inner">
                                    <table className="w-full text-left">
                                      <thead className="bg-stone-50 border-b border-stone-200">
                                        <tr>
                                          <th className="p-3 pl-6 text-[10px] font-light tracking-[0.2em] text-stone-500 uppercase">Date</th>
                                          <th className="p-3 text-[10px] font-light tracking-[0.2em] text-stone-500 uppercase">Code</th>
                                          <th className="p-3 text-[10px] font-light tracking-[0.2em] text-stone-500 uppercase">Product</th>
                                          <th className="p-3 text-right text-[10px] font-light tracking-[0.2em] text-stone-500 uppercase">Price</th>
                                          <th className="p-3 text-right text-[10px] font-light tracking-[0.2em] text-stone-900 uppercase">Qty</th>
                                          <th className="p-3 text-right text-[10px] font-light tracking-[0.2em] text-stone-900 uppercase">Subtotal</th>
                                          <th className="p-3 pr-6 text-center text-[10px] font-light tracking-[0.2em] text-stone-500 uppercase">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-stone-100">
                                        {memberOrders.map((order) => {
                                          const product = order.products || { item_name: '삭제됨', variety_name: '', variety_code: '-', direct_price: 0 };
                                          const totalPrice = product.direct_price * order.order_qty;

                                          return (
                                            <tr key={order.id} className="hover:bg-stone-50/50">
                                              <td className="p-3 pl-6 text-stone-400 text-xs tracking-wider">{new Date(order.created_at).toLocaleDateString('ko-KR')}</td>
                                              <td className="p-3 text-stone-400 font-mono text-[10px] tracking-widest">{product.variety_code}</td>
                                              <td className="p-3 text-sm font-light text-stone-800">
                                                {product.item_name} <span className="text-[10px] text-stone-400 uppercase tracking-widest">({product.variety_name})</span>
                                              </td>
                                              <td className="p-3 text-right text-stone-500 text-xs tracking-wider">{product.direct_price.toLocaleString()}</td>
                                              <td className="p-3 text-right text-stone-900 text-sm">{order.order_qty}</td>
                                              <td className="p-3 text-right font-serif text-stone-900 tracking-wide">{totalPrice.toLocaleString()}</td>
                                              <td className="p-3 pr-6 text-center">
                                                <span className={`px-2 py-1 text-[9px] font-bold tracking-widest uppercase border ${
                                                  order.status === '입금완료' ? 'text-stone-800 border-stone-800 bg-transparent' : 'text-amber-700 border-amber-300 bg-amber-50'
                                                }`}>
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
                              </div>
                            </td>
                          </tr>
                        )}
                      </div>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}