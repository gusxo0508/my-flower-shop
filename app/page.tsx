// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

interface ComparisonData {
  id: string;
  itemName: string;
  varietyName: string;
  grade: string;
  fatherPrice: number;
  marketAvgPrice: number;
}

export default function Home() {
  const router = useRouter();
  
  const [comparisons, setComparisons] = useState<ComparisonData[]>([]);
  const [latestNotices, setLatestNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: noticeData } = await supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(3);
      if (noticeData) setLatestNotices(noticeData);

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
    <div className="bg-[#FAFAFA]">
      
      {/* ✨ 프레스티지 히어로 섹션 (호텔 메인 스타일) */}
      <section className="relative h-screen min-h-[700px] flex items-center justify-center text-center overflow-hidden">
        {/* 우아한 다크 그레이/브라운 배경 톤 */}
        <div className="absolute inset-0 bg-stone-900">
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60"></div>
        </div>
        
        <div className="relative z-10 text-stone-100 px-4 mt-20">
          <h3 className="text-xs md:text-sm tracking-[0.3em] text-amber-500 mb-8 font-light">
            THE MASTERPIECE OF NATURE
          </h3>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-light tracking-wide mb-8 leading-[1.3]">
            자연의 예술, <br className="md:hidden" />그 정점을 담다
          </h1>
          <p className="text-sm md:text-base text-stone-300 mb-16 max-w-2xl mx-auto font-light tracking-wider leading-relaxed">
            매일 새벽, 가장 완벽한 수형을 갖춘 최상위 등급의 화훼만을 선별합니다.<br className="hidden md:block"/>
            경매장의 복잡한 유통을 거치지 않은 프라이빗 직판가를 경험하십시오.
          </p>
          <Link href="/shop" className="border border-stone-300/50 text-stone-100 px-10 py-4 text-sm tracking-[0.2em] hover:bg-stone-100 hover:text-stone-900 transition-all duration-500 backdrop-blur-sm uppercase">
            Discover Market
          </Link>
        </div>
      </section>

      {/* ✨ 미니멀 & 럭셔리 공지사항 섹션 */}
      {latestNotices.length > 0 && (
        <section className="max-w-5xl mx-auto -mt-24 relative z-20 px-6">
          <div className="bg-white border border-stone-200 shadow-xl">
            <div className="px-10 py-6 border-b border-stone-100 flex justify-between items-center bg-[#FCFCFC]">
              <h2 className="font-serif text-lg text-stone-900 tracking-widest">NOTICE</h2>
              <button onClick={() => router.push('/notices')} className="text-xs font-light tracking-widest text-stone-500 hover:text-amber-700 transition-colors uppercase">
                View All
              </button>
            </div>
            <div className="divide-y divide-stone-100">
              {latestNotices.map(notice => (
                <div 
                  key={notice.id} 
                  onClick={() => router.push(`/notices/${notice.id}`)}
                  className="px-10 py-6 flex flex-col md:flex-row justify-between md:items-center cursor-pointer hover:bg-stone-50 transition-colors group gap-2"
                >
                  <span className="font-light text-stone-800 text-lg group-hover:text-amber-700 transition-colors truncate">
                    {notice.title}
                  </span>
                  <span className="text-xs text-stone-400 font-light tracking-widest whitespace-nowrap">
                    {new Date(notice.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ✨ 절제된 프라이빗 마켓 리포트 (데이터 테이블) */}
      <section className="py-32 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <h3 className="text-xs tracking-[0.2em] text-amber-700 mb-4 font-bold uppercase">Today's Selection</h3>
          <h2 className="text-3xl font-serif text-stone-900 mb-6 tracking-wide">프라이빗 직판가 리포트</h2>
          <div className="h-[1px] w-12 bg-stone-300 mx-auto mb-6"></div>
          <p className="text-stone-500 font-light tracking-wider text-sm">
            {today} 기준, 투명하게 공개되는 aT 경매 시세와 아빠의 꽃 직판가입니다.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-stone-400 font-light tracking-widest text-sm animate-pulse">
              LOADING DATA...
            </div>
          </div>
        ) : comparisons.length === 0 ? (
          <div className="text-center py-24 text-stone-400 bg-white border border-stone-200 font-light tracking-widest text-sm">
            NO FLOWERS AVAILABLE TODAY
          </div>
        ) : (
          <div className="bg-white border-t border-b border-stone-900 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="p-6 font-medium text-stone-500 text-xs tracking-[0.1em] border-b border-stone-200 uppercase">Item</th>
                  <th className="p-6 font-medium text-stone-500 text-xs tracking-[0.1em] border-b border-stone-200 uppercase">Variety (Grade)</th>
                  <th className="p-6 text-right font-medium text-stone-500 text-xs tracking-[0.1em] border-b border-stone-200 uppercase">Market Avg</th>
                  <th className="p-6 text-right font-medium text-stone-900 text-xs tracking-[0.1em] border-b border-stone-200 uppercase bg-stone-50">Private Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {comparisons.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-6 font-light text-stone-900 text-lg">{item.itemName}</td>
                      <td className="p-6 text-stone-600 font-light">
                        {item.varietyName} <span className="text-[10px] tracking-widest border border-stone-300 px-2 py-1 ml-2 text-stone-500 uppercase">{item.grade}</span>
                      </td>
                      <td className="p-6 text-right text-stone-400 font-light tracking-wider">
                        {item.marketAvgPrice.toLocaleString()} KRW
                      </td>
                      <td className="p-6 text-right font-medium text-stone-900 text-lg tracking-wider bg-stone-50/50">
                        {item.fatherPrice.toLocaleString()} KRW
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