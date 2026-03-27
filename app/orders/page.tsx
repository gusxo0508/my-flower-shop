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

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data: profilesData } = await supabase.from('profiles').select('id, member_no');
    const memberNoMap: Record<string, string> = {};
    profilesData?.forEach(p => { memberNoMap[p.id] = String(p.member_no || 0).padStart(6, '0'); });

    const { data, error } = await supabase
      .from('orders')
      .select(`id, user_id, buyer_name, order_qty, status, created_at, products (item_name, variety_name, variety_code, bid_price, direct_price)`)
      .order('created_at', { ascending: false });

    if (error) { toast.error('주문 내역 로딩 실패'); setLoading(false); return; }

    const groups = (data || []).reduce((acc: any, order: any) => {
      const dateKey = new Date(order.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      const groupKey = `${dateKey}_${order.buyer_name}`;
      const product = order.products || { item_name: '알수없음', variety_name: '-', variety_code: '-', direct_price: 0 };
      const price = product.direct_price * order.order_qty;
      const memberNumber = memberNoMap[order.user_id] || '000000';

      if (!acc[groupKey]) {
        acc[groupKey] = { idKey: groupKey, dateString: dateKey, buyerName: order.buyer_name, memberNo: memberNumber, status: order.status, totalPrice: 0, totalQty: 0, itemCount: 0, orderIds: [], items: [] };
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
    if (expandedGroups.includes(idKey)) setExpandedGroups(expandedGroups.filter(key => key !== idKey));
    else setExpandedGroups([...expandedGroups, idKey]);
  };

  const updateOrderStatus = async (orderIds: string[], newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).in('id', orderIds);
    if (error) toast.error('상태 변경 실패');
    else { toast.success(`'${newStatus}' 처리 완료`); fetchOrders(); }
  };

  const downloadExcel = () => {
    const excelData: any[] = [];
    groupedOrders.forEach(group => {
      group.items.forEach((item: any) => {
        excelData.push({ '주문일시': group.dateString, '회원번호': group.memberNo, '주문자(상호명)': group.buyerName, '품목명': item.product.item_name, '품종명': item.product.variety_name, '품목코드': item.product.variety_code || '-', '직판단가(원)': item.product.direct_price, '주문수량(속)': item.order_qty, '상품합계(원)': item.price, '진행상태': group.status });
      });
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "상세주문내역");
    XLSX.writeFile(workbook, `아빠의꽃_주문내역_${new Date().toLocaleDateString('ko-KR')}.xlsx`);
  };

  const chartData = groupedOrders.slice(0, 7).map(g => ({ name: g.buyerName, 매출액: g.totalPrice })).reverse();

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-32 pb-20 px-6 md:px-10">
      <main className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-stone-200 pb-8">
          <div>
            <h3 className="text-[10px] tracking-[0.3em] text-amber-700 mb-2 uppercase font-bold">Admin Console</h3>
            <h1 className="text-3xl font-serif text-stone-900 tracking-wide">실시간 주문 장부</h1>
          </div>
          <div className="flex gap-4">
            <button onClick={downloadExcel} className="border border-stone-900 text-stone-900 px-6 py-2.5 text-[10px] tracking-[0.2em] uppercase hover:bg-stone-900 hover:text-white transition-all">Download Excel</button>
            <button onClick={fetchOrders} className="bg-stone-100 text-stone-600 px-6 py-2.5 text-[10px] tracking-[0.2em] uppercase hover:bg-stone-200 transition-all">Refresh</button>
          </div>
        </header>

        {!loading && groupedOrders.length > 0 && (
          <div className="mb-16 bg-white p-10 border border-stone-200 shadow-xl shadow-stone-200/20">
            <h2 className="text-xs font-bold text-stone-400 tracking-[0.2em] uppercase mb-8">Sales Trend (Last 7 Orders)</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#a8a29e" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a8a29e" fontSize={10} tickFormatter={(value) => `${(value / 10000)}만`} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f5f5f4'}} contentStyle={{ backgroundColor: '#1c1917', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' }} formatter={(value: any) => `${Number(value).toLocaleString()} KRW`} />
                  <Bar dataKey="매출액" fill="#065f46" radius={[2, 2, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {loading ? (
           <div className="text-center py-32 text-stone-400 text-xs tracking-widest bg-white border border-stone-200">LOADING...</div>
        ) : groupedOrders.length === 0 ? (
          <div className="text-center py-32 text-stone-400 text-xs tracking-widest border border-stone-200 bg-white">NO ORDERS YET</div>
        ) : (
          <div className="bg-white border-t border-b border-stone-900 overflow-x-auto shadow-2xl shadow-stone-200/40">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase w-10 text-center">+/-</th>
                  <th className="p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Date</th>
                  <th className="p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Buyer Info</th>
                  <th className="p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase text-center">Summary</th>
                  <th className="p-5 text-right font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Total Amount</th>
                  <th className="p-5 text-center font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Status</th>
                  <th className="p-5 text-center font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {groupedOrders.map((group) => {
                  const isExpanded = expandedGroups.includes(group.idKey);
                  const representativeItem = group.items[0].product.item_name;
                  const summaryText = group.itemCount > 1 ? `${representativeItem} +${group.itemCount - 1}` : representativeItem;

                  return (
                    <Fragment key={group.idKey}>
                      <tr className={`hover:bg-stone-50 transition-colors cursor-pointer ${isExpanded ? 'bg-stone-50' : 'bg-white'}`} onClick={() => toggleGroup(group.idKey)}>
                        <td className="p-5 text-center text-stone-400 text-lg font-light">{isExpanded ? '−' : '+'}</td>
                        <td className="p-5 text-xs text-stone-500 tracking-wider font-light">{group.dateString}</td>
                        <td className="p-5">
                          <div className="font-medium text-stone-900 text-sm tracking-wide">{group.buyerName}</div>
                          <div className="text-[10px] font-mono text-amber-700 tracking-widest mt-1">NO. {group.memberNo}</div>
                        </td>
                        <td className="p-5 text-center text-stone-700 text-sm font-light">{summaryText} <span className="text-[10px] text-stone-400 ml-1">({group.totalQty} EA)</span></td>
                        <td className="p-5 text-right font-serif text-lg text-stone-900 tracking-wide">{group.totalPrice.toLocaleString()}<span className="text-[10px] text-stone-400 ml-1">KRW</span></td>
                        <td className="p-5 text-center">
                          <span className={`px-3 py-1 text-[10px] tracking-widest uppercase border ${group.status === '입금대기' ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-stone-800 text-stone-800 bg-transparent'}`}>{group.status}</span>
                        </td>
                        <td className="p-5 text-center" onClick={(e) => e.stopPropagation()}>
                          {group.status === '입금대기' ? (
                            <button onClick={() => updateOrderStatus(group.orderIds, '입금완료')} className="bg-stone-900 text-white px-4 py-2 text-[10px] tracking-widest uppercase hover:bg-stone-800 transition-colors">Confirm</button>
                          ) : (
                            <button onClick={() => updateOrderStatus(group.orderIds, '입금대기')} className="border border-stone-300 text-stone-500 px-4 py-2 text-[10px] tracking-widest uppercase hover:bg-stone-100 transition-colors">Undo</button>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-stone-200 bg-[#FAFAFA]">
                            <div className="p-6 md:pl-20 md:pr-10">
                              <table className="w-full text-left bg-white border border-stone-200">
                                <thead>
                                  <tr className="bg-stone-50 border-b border-stone-200">
                                    <th className="p-3 pl-6 text-xs font-light tracking-[0.2em] text-stone-400 uppercase">Code</th>
                                    <th className="p-3 text-xs font-light tracking-[0.2em] text-stone-400 uppercase">Product</th>
                                    <th className="p-3 text-right text-xs font-light tracking-[0.2em] text-stone-400 uppercase">Unit Price</th>
                                    <th className="p-3 text-right text-xs font-light tracking-[0.2em] text-stone-400 uppercase">Qty</th>
                                    <th className="p-3 pr-6 text-right text-xs font-light tracking-[0.2em] text-stone-400 uppercase">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                  {group.items.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-stone-50">
                                      <td className="p-3 pl-6 text-stone-400 font-mono text-[10px] tracking-widest">{item.product.variety_code || '-'}</td>
                                      <td className="p-3">
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
      </main>
    </div>
  );
}