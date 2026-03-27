// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flowers, setFlowers] = useState<any[]>([]);

  useEffect(() => { fetchExistingProducts(); }, []);

  const fetchExistingProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('item_name', { ascending: true });
    if (data) setFlowers(data);
  };

  const fetchFlowers = async () => {
    setLoading(true);
    const loadingToast = toast.loading('데이터 동기화 중입니다...');
    try {
      const res = await fetch('/api/scrape');
      const json = await res.json();
      toast.dismiss(loadingToast);

      if (json.success) {
        toast.success('경매 데이터가 업데이트 되었습니다.');
        fetchExistingProducts();
      } else {
        toast.error('동기화 실패: ' + json.message);
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('오류가 발생했습니다.');
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
    const savingToast = toast.loading('저장 중입니다...');
    try {
      const updates = flowers.map(f => ({
        id: f.id, variety_code: f.variety_code, item_name: f.item_name, variety_name: f.variety_name, grade: f.grade, stock_qty: f.stock_qty, direct_price: f.direct_price
      }));

      const { error } = await supabase.from('products').upsert(updates, { onConflict: 'variety_code, grade' });
      if (error) throw new Error(error.message);
      
      toast.dismiss(savingToast);
      toast.success('성공적으로 반영되었습니다.');
    } catch (error: any) {
      toast.dismiss(savingToast);
      toast.error('저장 실패: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-32 pb-20 px-6 md:px-10">
      <main className="max-w-7xl mx-auto">
        <header className="mb-16 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-stone-200 pb-8">
          <div>
            <h3 className="text-[10px] tracking-[0.3em] text-amber-700 mb-2 uppercase font-bold">Admin Console</h3>
            <h1 className="text-3xl font-serif text-stone-900 tracking-wide">재고 및 직판가 관리</h1>
          </div>
          <button onClick={fetchFlowers} disabled={loading || saving} className="border border-stone-900 text-stone-900 px-8 py-3 text-xs tracking-[0.2em] uppercase hover:bg-stone-900 hover:text-white transition-all disabled:border-stone-300 disabled:text-stone-300">
            {loading ? 'Syncing...' : 'Sync Auction Data'}
          </button>
        </header>

        {flowers.length === 0 && !loading ? (
          <div className="text-center py-32 text-stone-400 text-xs tracking-widest border border-stone-200 bg-white">
            상단 버튼을 눌러 데이터를 동기화해주세요.
          </div>
        ) : (
          <div className="bg-white border-t border-b border-stone-900 overflow-hidden shadow-2xl shadow-stone-200/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Item</th>
                    <th className="p-5 font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Variety (Grade)</th>
                    <th className="p-5 text-right font-medium text-stone-500 text-[10px] tracking-[0.2em] uppercase">Avg Price</th>
                    <th className="p-5 text-center font-medium text-stone-900 text-[10px] tracking-[0.2em] uppercase bg-stone-100">Set Price (KRW)</th>
                    <th className="p-5 text-center font-medium text-stone-900 text-[10px] tracking-[0.2em] uppercase bg-stone-100 border-l border-white">Stock (EA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {flowers.map((flower, index) => (
                    <tr key={index} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-5 font-light text-stone-900 text-base">{flower.item_name}</td>
                      <td className="p-5 text-stone-600 font-light text-sm">
                        {flower.variety_name} <span className="ml-2 text-[9px] border border-stone-300 px-1.5 py-0.5 text-stone-500 uppercase">{flower.grade}</span>
                      </td>
                      <td className="p-5 text-right text-stone-500 font-light">
                        <span className="text-base text-stone-800">{flower.avg_price?.toLocaleString()}</span>
                        <div className="text-[10px] tracking-wider mt-1 text-stone-400">
                          {flower.max_price?.toLocaleString()} / {flower.min_price?.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-5 text-center bg-stone-50/30">
                        <input type="number" value={flower.direct_price || 0} onChange={(e) => handleInputChange(index, 'direct_price', e.target.value)} className="bg-transparent border-b border-stone-300 p-2 w-28 text-center font-serif text-lg text-stone-900 focus:outline-none focus:border-stone-900 transition-colors" />
                      </td>
                      <td className="p-5 text-center bg-stone-50/30">
                        <input type="number" value={flower.stock_qty || 0} onChange={(e) => handleInputChange(index, 'stock_qty', e.target.value)} className="bg-transparent border-b border-stone-300 p-2 w-20 text-center font-serif text-lg text-amber-700 focus:outline-none focus:border-amber-700 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-8 bg-stone-50 flex justify-end border-t border-stone-200">
              <button onClick={saveInventory} disabled={saving} className="bg-stone-900 text-white px-12 py-4 text-xs tracking-[0.2em] font-light hover:bg-stone-800 transition-colors disabled:bg-stone-300 uppercase shadow-lg">
                {saving ? 'Saving...' : 'Save & Open Market'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}