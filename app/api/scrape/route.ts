// app/api/scrape/route.ts
import { NextResponse } from 'next/server';
import { scrapeAtAuction } from '../../../lib/scraper';
import { supabase } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const data = await scrapeAtAuction('20260325'); // 테스트 날짜
    
    const groupedData: Record<string, any> = {};

    // 1. [핵심] 품종코드와 등급을 합쳐서 고유 키로 사용합니다. (예: 10330000_특2)
    data.forEach(item => {
      const key = `${item.varietyCode}_${item.grade}`; 
      if (!groupedData[key]) {
        groupedData[key] = {
          variety_code: item.varietyCode,
          item_name: item.itemName,
          variety_name: item.varietyName,
          grade: item.grade,
          prices: [item.bidPrice],
          total_qty: item.unitQty
        };
      } else {
        groupedData[key].prices.push(item.bidPrice);
        groupedData[key].total_qty += item.unitQty;
      }
    });

    const productsToSave = Object.values(groupedData).map(group => {
      const minPrice = Math.min(...group.prices);
      const maxPrice = Math.max(...group.prices);
      const sumPrice = group.prices.reduce((a: number, b: number) => a + b, 0);
      const avgPrice = Math.round(sumPrice / group.prices.length);

      return {
        variety_code: group.variety_code,
        item_name: group.item_name,
        variety_name: group.variety_name,
        grade: group.grade,
        auction_qty: group.total_qty,
        min_price: minPrice,
        max_price: maxPrice,
        avg_price: avgPrice,
        direct_price: avgPrice // 스크래핑 시 직판가는 우선 평균가로 기본 세팅해 둡니다.
      };
    });

    // 2. 바뀐 기준(variety_code, grade)으로 DB에 저장합니다.
    const { error } = await supabase
      .from('products')
      .upsert(productsToSave, { onConflict: 'variety_code, grade' });

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, message: '경매 통계 저장 완료!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}