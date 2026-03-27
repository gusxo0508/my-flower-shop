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
    // ✨ profiles 데이터에서 member_no를 함께 불러옵니다.
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
    <div className="min-h-screen bg-gray-100 p-8">
      <main className="max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-gray-200 pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">👥 단골 플로리스트 관리</h1>
            <p className="text-gray-600 mt-2">최신 구매일이 높은 회원 순으로 자동 정렬됩니다.</p>
          </div>
          
          <div className="w-full md:w-72 relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="이메일 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">회원 목록을 분석 중입니다...</div>
        ) : displayedMembers.length === 0 ? (
          <div className="text-center py-20 text-gray-500 border-2 border-dashed rounded-xl">해당하는 회원이 없습니다.</div>
        ) : (
          <div className="overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="p-4">고유번호 (가입일)</th>
                  <th className="p-4">상호명 (이름)</th>
                  <th className="p-4">최신 구매일</th>
                  <th className="p-4">아이디(이메일)</th>
                  <th className="p-4 text-center">상세 로그</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayedMembers.map((member) => {
                  const hasOrder = member.latestOrderDate !== '1970-01-01T00:00:00.000Z';
                  // ✨ 6자리 고유번호 포맷팅 (예: 1 -> 000001)
                  const formattedNo = String(member.member_no || 0).padStart(6, '0');

                  return (
                    <div key={member.id} className="contents">
                      <tr className="hover:bg-blue-50 transition-colors">
                        <td className="p-4 text-sm font-mono">
                          <span className="font-extrabold text-blue-800 bg-blue-100 px-2 py-1 rounded">No. {formattedNo}</span>
                          <span className="text-xs text-gray-400 mt-2 block">가입: {new Date(member.created_at).toLocaleDateString('ko-KR')}</span>
                        </td>
                        <td className="p-4 font-bold text-gray-900 text-lg">{member.name}</td>
                        <td className="p-4 text-sm">
                          {hasOrder ? (
                            <span className="font-bold text-gray-700">{new Date(member.latestOrderDate).toLocaleDateString('ko-KR')}</span>
                          ) : (
                            <span className="text-gray-400">구매이력 없음</span>
                          )}
                        </td>
                        <td className="p-4 text-gray-600 font-medium">{member.email}</td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => fetchMemberOrders(member.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                              selectedMember === member.id ? 'bg-gray-800 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                          >
                            {selectedMember === member.id ? '내역 닫기' : '상세 내역'}
                          </button>
                        </td>
                      </tr>

                      {selectedMember === member.id && (
                        <tr>
                          <td colSpan={5} className="bg-gray-50 p-6 border-b border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-4">🛒 [{member.name}] 님의 낱건 구매 상세 로그</h3>
                            {loadingOrders ? (
                              <p className="text-sm text-gray-500">로그를 불러오는 중입니다...</p>
                            ) : memberOrders.length === 0 ? (
                              <p className="text-sm text-gray-500">아직 구매 내역이 없습니다.</p>
                            ) : (
                              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-inner">
                                <table className="w-full text-sm text-left text-gray-700">
                                  <thead className="bg-gray-100 border-b border-gray-200">
                                    <tr>
                                      <th className="p-3 pl-4">주문 일시</th>
                                      <th className="p-3 text-center text-xs text-gray-400">품목코드</th>
                                      <th className="p-3">품목명 (품종)</th>
                                      <th className="p-3 text-right">직판단가</th>
                                      <th className="p-3 text-right text-blue-600 font-bold">주문 수량</th>
                                      <th className="p-3 text-right">총 결제금액</th>
                                      <th className="p-3 text-center">진행 상태</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {memberOrders.map((order) => {
                                      const date = new Date(order.created_at).toLocaleString('ko-KR');
                                      const product = order.products || { item_name: '삭제됨', variety_name: '', variety_code: '-', direct_price: 0 };
                                      const totalPrice = product.direct_price * order.order_qty;

                                      return (
                                        <tr key={order.id} className="hover:bg-yellow-50">
                                          <td className="p-3 pl-4 text-gray-500">{date}</td>
                                          <td className="p-3 text-center text-gray-400 font-mono text-xs">{product.variety_code}</td>
                                          <td className="p-3 font-bold text-gray-900">
                                            {product.item_name} <span className="text-xs text-gray-500 font-normal">({product.variety_name})</span>
                                          </td>
                                          <td className="p-3 text-right text-gray-600">{product.direct_price.toLocaleString()}원</td>
                                          <td className="p-3 text-right font-extrabold text-blue-700 text-base">{order.order_qty} 속</td>
                                          <td className="p-3 text-right font-bold text-red-600">{totalPrice.toLocaleString()}원</td>
                                          <td className="p-3 text-center">
                                            <span className={`px-2 py-1 text-xs font-bold rounded ${
                                              order.status === '입금완료' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
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
                          </td>
                        </tr>
                      )}
                    </div>
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