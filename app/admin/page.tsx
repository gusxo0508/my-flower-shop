// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast'; // ✨ 토스트 추가

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flowers, setFlowers] = useState<any[]>([]);

  useEffect(() => {
    fetchExistingProducts();
  }, []);

  const fetchExistingProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('item_name', { ascending: true });
    if (data) setFlowers(data);
  };

  const fetchFlowers = async () => {
    setLoading(true);
    const loadingToast = toast.loading('aT 공판장 데이터를 분석 중입니다... 🌻'); // ✨ 로딩 알림
    try {
      const res = await fetch('/api/scrape');
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         throw new Error("서버 에러가 발생했습니다. 터미널 창을 확인해주세요.");
      }

      const json = await res.json();
      toast.dismiss(loadingToast); // ✨ 로딩 알림 끄기

      if (json.success) {
        toast.success('✅ 최신 경매 데이터를 성공적으로 가져왔습니다!');
        fetchExistingProducts();
      } else {
        toast.error('데이터 가져오기 실패: ' + json.message);
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('오류가 발생했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index: number, field: string, value: string) => {
    const newFlowers = [...flowers];
    newFlowers[index][field] = parseInt(value) || 0;
    setFlowers(newFlowers);
  };

  const saveInventory = async () => {
    setSaving(true);
    const savingToast = toast.loading('쇼핑몰에 직판가를 반영하고 있습니다...');
    try {
      const updates = flowers.map(f => ({
        id: f.id,
        variety_code: f.variety_code,
        item_name: f.item_name,
        variety_name: f.variety_name,
        grade: f.grade,
        stock_qty: f.stock_qty,
        direct_price: f.direct_price
      }));

      const { error } = await supabase
        .from('products')
        .upsert(updates, { onConflict: 'variety_code, grade' });

      if (error) throw new Error(error.message);
      
      toast.dismiss(savingToast);
      toast.success('🎉 성공적으로 재고와 직판가가 쇼핑몰에 반영되었습니다!');
    } catch (error: any) {
      toast.dismiss(savingToast);
      toast.error('저장 실패: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <main className="max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-green-700">🌻 아빠의 꽃 재고 및 직판가 관리</h1>
          <button
            onClick={fetchFlowers}
            disabled={loading || saving}
            className="bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-black disabled:bg-gray-400 shadow-md"
          >
            {loading ? '브라우저 띄워 데이터 분석 중...' : '오늘의 경매 데이터 불러오기'}
          </button>
        </div>

        {flowers.length === 0 && !loading ? (
          <div className="text-center py-20 text-gray-500">우측 상단의 데이터 불러오기 버튼을 눌러주세요.</div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-sm">
                  <th className="p-4">품목명</th>
                  <th className="p-4">품종명 (등급)</th>
                  <th className="p-4 text-right">경매 평균가<br/><span className="text-xs font-normal text-gray-500">(최고 / 최저)</span></th>
                  <th className="p-4 text-right">총 낙찰수량</th>
                  <th className="p-4 text-center text-blue-700 font-bold">판매할 직판가(원)</th>
                  <th className="p-4 text-center text-green-700 font-bold">판매할 수량(속)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {flowers.map((flower, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{flower.item_name}</td>
                    <td className="p-4 text-gray-600">
                      {flower.variety_name} <br/><span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mt-1">{flower.grade}</span>
                    </td>
                    <td className="p-4 text-right text-sm">
                      <span className="font-bold text-gray-800 text-base">{flower.avg_price?.toLocaleString()}원</span>
                      <br/>
                      <span className="text-xs font-bold text-red-500">{flower.max_price?.toLocaleString()}</span> 
                      <span className="text-xs text-gray-400"> / </span> 
                      <span className="text-xs font-bold text-blue-500">{flower.min_price?.toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-right font-semibold text-gray-600">{flower.auction_qty || 0}속</td>
                    <td className="p-4 text-center">
                      <input 
                        type="number" 
                        value={flower.direct_price || 0}
                        onChange={(e) => handleInputChange(index, 'direct_price', e.target.value)}
                        className="border border-gray-300 rounded p-2 w-28 text-right font-bold text-blue-700 focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <input 
                        type="number" 
                        value={flower.stock_qty || 0}
                        onChange={(e) => handleInputChange(index, 'stock_qty', e.target.value)}
                        className="border border-gray-300 rounded p-2 w-20 text-right font-bold text-green-700 focus:ring-2 focus:ring-green-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="p-6 bg-gray-50 flex justify-end">
              <button 
                onClick={saveInventory}
                disabled={saving}
                className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg disabled:bg-gray-400"
              >
                {saving ? '저장 중입니다...' : '위의 가격과 수량으로 쇼핑몰 오픈하기!'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}