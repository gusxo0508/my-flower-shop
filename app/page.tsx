// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation'; // ✨ 라우터 추가

interface ComparisonData {
  id: string;
  itemName: string;
  varietyName: string;
  grade: string;
  fatherPrice: number;
  marketAvgPrice: number;
}

export default function Home() {
  const router = useRouter(); // ✨ 라우터 선언
  
  const [comparisons, setComparisons] = useState<ComparisonData[]>([]);
  const [latestNotices, setLatestNotices] = useState<any[]>([]); // ✨ 최신 공지 3개 담을 배열
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. 최신 공지사항 3개 가져오기
      const { data: noticeData } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (noticeData) setLatestNotices(noticeData);

      // 2. 아빠 꽃 비교 데이터 가져오기
      const { data: fatherProducts } = await supabase.from('products').select('*').gt('stock_qty', 0).order('item_name', { ascending: true }); 

      if (!fatherProducts || fatherProducts.length === 0) {
        setLoading(false);
        return;
      }

      const combinedData: ComparisonData[] = await Promise.all(
        fatherProducts.map(async (product) => {
          const res = await fetch(`/api/market?itemName=${encodeURIComponent(product.item_name)}&varietyName=${encodeURIComponent(product.variety_name)}`);
          const json = await res.json();
          return {
            id: product.id,
            itemName: product.item_name,
            varietyName: product.variety_name,
            grade: product.grade,
            fatherPrice: product.direct_price,
            marketAvgPrice: json.success ? json.data.avgPrice : Math.floor(product.direct_price * 1.3), 
          };
        })
      );

      setComparisons(combinedData);
      setLoading(false);
    };

    fetchData();
  }, []);

  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-green-800 text-white py-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
          오늘 aT 경매 최고가를 찍은 그 꽃,<br/>중간 마진 없이 직배송합니다.
        </h1>
        <p className="text-lg md:text-xl text-green-100 mb-10 max-w-2xl mx-auto font-light">
          아빠가 직접 키워 시장 점유율 1위를 달성한 최상급 화훼.<br/>
          시중 도매가보다 합리적인 '아빠의 직판가'로 플로리스트 여러분을 모십니다.
        </p>
        <Link href="/shop" className="bg-yellow-400 text-green-900 px-10 py-4 rounded-full font-bold text-xl hover:bg-yellow-300 shadow-lg inline-block transition-transform hover:scale-105">
          오늘의 꽃 구매하기
        </Link>
      </section>

      {/* 📢 최신 공지사항 3개 리스트 (클릭 시 상세 이동) */}
      {latestNotices.length > 0 && (
        <section className="max-w-5xl mx-auto mt-[-2rem] relative z-10 px-4">
          <div className="bg-white border-t-4 border-yellow-400 shadow-lg rounded-xl overflow-hidden">
            <div className="bg-yellow-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-yellow-800 flex items-center gap-2"><span>📌</span> 농장 최신 소식</h2>
              <button onClick={() => router.push('/notices')} className="text-sm font-bold text-gray-500 hover:text-gray-800">전체보기 →</button>
            </div>
            <div className="divide-y divide-gray-100">
              {latestNotices.map(notice => (
                <div 
                  key={notice.id} 
                  onClick={() => router.push(`/notices/${notice.id}`)} // ✨ 상세 페이지로 라우팅
                  className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors group"
                >
                  <span className="font-bold text-gray-800 group-hover:text-green-700 transition-colors">{notice.title}</span>
                  <span className="text-sm text-gray-400">{new Date(notice.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 압도적 가치 증명 테이블 섹션 */}
      <section className="py-20 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">📊 {today} 아빠꽃 경매 성적 & 직판가 비교</h2>
          <p className="text-gray-600">오늘 새벽 aT 공판장에서 검증된 품질. 중도매인 마진(약 30%)을 뺀 가격을 확인하세요.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-bold bg-white rounded-2xl shadow-sm border border-gray-200">
            실시간 유통공사 시세를 분석하고 있습니다...
          </div>
        ) : comparisons.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-200">
            현재 판매 중인 꽃이 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden bg-white rounded-2xl shadow-md border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="p-4 font-bold rounded-tl-lg">품목명</th>
                  <th className="p-4 font-bold">품종 (등급)</th>
                  <th className="p-4 text-right font-bold text-gray-300">aT 평균 시세</th>
                  <th className="p-4 text-right font-bold text-green-300">🌻 아빠의 직판가</th>
                  <th className="p-4 text-right font-bold rounded-tr-lg">절약 금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparisons.map((item) => {
                  const saveAmount = item.marketAvgPrice - item.fatherPrice;
                  const isCheaper = saveAmount > 0;
                  const savePercent = isCheaper ? Math.round((saveAmount / item.marketAvgPrice) * 100) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-green-50 transition-colors">
                      <td className="p-4 font-bold text-gray-900">{item.itemName}</td>
                      <td className="p-4 text-gray-700">
                        {item.varietyName} <span className="text-xs text-gray-400">({item.grade})</span>
                      </td>
                      <td className="p-4 text-right text-gray-400 line-through">
                        {item.marketAvgPrice.toLocaleString()}원
                      </td>
                      <td className="p-4 text-right font-extrabold text-green-700 text-lg">
                        {item.fatherPrice.toLocaleString()}원
                      </td>
                      <td className="p-4 text-right font-bold">
                        {isCheaper ? (
                          <div className="flex items-center justify-end gap-2 text-blue-600">
                            <span>{saveAmount.toLocaleString()}원</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{savePercent}% ↓</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}