// app/orders/page.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

export default function OrderManagement() {
  const [groupedOrders, setGroupedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    
    // 1. 회원들의 고유번호(member_no)를 미리 싹 가져옵니다.
    const { data: profilesData } = await supabase.from('profiles').select('id, member_no');
    const memberNoMap: Record<string, string> = {};
    profilesData?.forEach(p => {
      memberNoMap[p.id] = String(p.member_no || 0).padStart(6, '0');
    });

    // 2. 주문 내역을 가져옵니다. (user_id 추가)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, user_id, buyer_name, order_qty, status, created_at,
        products (item_name, variety_name, variety_code, bid_price, direct_price)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('주문 내역을 가져오지 못했습니다 😥');
      setLoading(false);
      return;
    }

    const groups = (data || []).reduce((acc: any, order: any) => {
      const dateKey = new Date(order.created_at).toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      const groupKey = `${dateKey}_${order.buyer_name}`;

      const product = order.products || { item_name: '알수없음', variety_name: '알수없음', variety_code: '-', direct_price: 0 };
      const price = product.direct_price * order.order_qty;

      // ✨ 아까 만든 맵에서 유저의 6자리 고유번호를 매칭시킵니다.
      const memberNumber = memberNoMap[order.user_id] || '000000';

      if (!acc[groupKey]) {
        acc[groupKey] = {
          idKey: groupKey,
          dateString: dateKey,
          buyerName: order.buyer_name,
          memberNo: memberNumber, // 그룹에 고유번호 저장
          status: order.status,
          totalPrice: 0,
          totalQty: 0,
          itemCount: 0,
          orderIds: [],
          items: []
        };
      }

      acc[groupKey].items.push({ ...order, product, price });
      acc[groupKey].totalPrice += price;
      acc[groupKey].totalQty += order.order_qty;
      acc[groupKey].itemCount += 1;
      acc[groupKey].orderIds.push(order.id);

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

  const updateOrderStatus = async (orderIds: string[], newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).in('id', orderIds);
    if (error) {
      toast.error('상태 업데이트에 실패했습니다.');
    } else {
      toast.success(`장바구니 전체가 '${newStatus}'(으)로 변경되었습니다 ✅`);
      fetchOrders(); 
    }
  };

  const downloadExcel = () => {
    const excelData: any[] = [];

    groupedOrders.forEach(group => {
      group.items.forEach((item: any) => {
        excelData.push({
          '주문일시': group.dateString,
          '회원번호': group.memberNo, // ✨ 엑셀에 6자리 고유번호 추가
          '주문자(상호명)': group.buyerName,
          '품목명': item.product.item_name,
          '품종명': item.product.variety_name,
          '품목코드': item.product.variety_code || '-',
          '직판단가(원)': item.product.direct_price,
          '주문수량(속)': item.order_qty,
          '상품합계(원)': item.price,
          '진행상태': group.status
        });
      });
    });
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "상세주문내역");
    XLSX.writeFile(workbook, `아빠의꽃_상세주문내역_${new Date().toLocaleDateString('ko-KR')}.xlsx`);
    toast.success('상세 엑셀 파일이 다운로드되었습니다 📥');
  };

  const chartData = groupedOrders.slice(0, 7).map(g => ({ name: g.buyerName, 매출액: g.totalPrice })).reverse();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <main className="max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-gray-800">📦 실시간 주문 관리 장부</h1>
          <div className="flex gap-3">
            <button onClick={downloadExcel} className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm">
              📥 상세 엑셀 다운로드
            </button>
            <button onClick={fetchOrders} className="text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-4 py-2 rounded-lg">
              🔄 새로고침
            </button>
          </div>
        </div>

        {!loading && groupedOrders.length > 0 && (
          <div className="mb-10 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner">
            <h2 className="text-lg font-bold text-gray-700 mb-4">📈 최근 주문 매출 추이</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#8884d8" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => `${(value / 10000)}만`} />
                  <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()}원`} />
                  <Bar dataKey="매출액" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-gray-500">주문 내역을 불러오는 중입니다...</div>
        ) : groupedOrders.length === 0 ? (
          <div className="text-center py-20 text-gray-500 border-2 border-dashed rounded-xl">
            아직 들어온 주문이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="p-4 rounded-tl-lg">주문일시</th>
                  <th className="p-4">주문자 정보</th>
                  <th className="p-4 text-center">주문 요약</th>
                  <th className="p-4 text-right">총 결제 금액</th>
                  <th className="p-4 text-center">진행 상태</th>
                  <th className="p-4 text-center rounded-tr-lg">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {groupedOrders.map((group) => {
                  const isExpanded = expandedGroups.includes(group.idKey);
                  const representativeItem = group.items[0].product.item_name;
                  const summaryText = group.itemCount > 1 ? `${representativeItem} 외 ${group.itemCount - 1}건` : representativeItem;

                  return (
                    <Fragment key={group.idKey}>
                      <tr className="hover:bg-blue-50 transition-colors cursor-pointer bg-white" onClick={() => toggleGroup(group.idKey)}>
                        <td className="p-4 text-sm text-gray-600 font-medium">
                          {isExpanded ? '🔽' : '▶️'} {group.dateString}
                        </td>
                        <td className="p-4">
                          {/* ✨ 화면에서도 6자리 회원번호를 띄워줍니다 */}
                          <div className="font-bold text-gray-900 text-lg">{group.buyerName}</div>
                          <div className="text-xs font-mono text-blue-600 font-bold">No. {group.memberNo}</div>
                        </td>
                        <td className="p-4 text-center text-gray-700 font-bold">{summaryText} <span className="text-sm font-normal text-gray-500">(총 {group.totalQty}속)</span></td>
                        <td className="p-4 text-right font-extrabold text-red-600 text-lg">{group.totalPrice.toLocaleString()}원</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${group.status === '입금대기' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{group.status}</span>
                        </td>
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          {group.status === '입금대기' ? (
                            <button onClick={() => updateOrderStatus(group.orderIds, '입금완료')} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-black text-sm font-bold shadow-md">입금 확인하기</button>
                          ) : (
                            <button onClick={() => updateOrderStatus(group.orderIds, '입금대기')} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm font-bold">대기로 돌리기</button>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="p-0 border-b border-gray-200 bg-gray-50">
                            <div className="p-4 pl-12">
                              <table className="w-full text-sm text-left text-gray-600 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-inner">
                                <thead className="bg-gray-100 border-b border-gray-200">
                                  <tr>
                                    <th className="p-2 pl-4 text-center text-xs text-gray-400">품목코드</th>
                                    <th className="p-2">품목명 (품종)</th>
                                    <th className="p-2 text-right">단가(직판가)</th>
                                    <th className="p-2 text-right">주문 수량</th>
                                    <th className="p-2 text-right pr-4">합계</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.items.map((item: any) => (
                                    <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-yellow-50">
                                      <td className="p-2 pl-4 text-center text-gray-400 font-mono text-xs">{item.product.variety_code || '-'}</td>
                                      <td className="p-2">
                                        <span className="font-bold text-gray-800">{item.product.item_name}</span> 
                                        <span className="ml-1 text-gray-500">({item.product.variety_name})</span>
                                      </td>
                                      <td className="p-2 text-right">{item.product.direct_price.toLocaleString()}원</td>
                                      <td className="p-2 text-right text-blue-600 font-bold">{item.order_qty} 속</td>
                                      <td className="p-2 text-right pr-4 font-bold">{item.price.toLocaleString()}원</td>
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
      </main>
    </div>
  );
}