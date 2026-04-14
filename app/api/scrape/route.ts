// app/api/scrape/route.ts
import { NextResponse } from 'next/server';
import { scrapeAtAuction } from '../../../lib/scraper';
import { supabase } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    // 오늘 날짜로 경매 데이터 수집 (YYYYMMDD 형식)
    const today = new Date();
    const targetDate = today.toISOString().split('T')[0].replace(/-/g, '');
    console.log(`📊 경매 데이터 동기화 시작 (날짜: ${targetDate})`);

    const data = await scrapeAtAuction(targetDate);

    if (!data || data.length === 0) {
      console.warn('⚠️ 수집된 데이터가 없습니다. 경매가 진행되지 않았을 수 있습니다.');
      return NextResponse.json({
        success: true,
        message: '수집된 데이터가 없습니다.',
        itemCount: 0,
      });
    }

    // 품종코드 + 등급으로 그룹화
    const groupedData: Record<string, any> = {};
    data.forEach((item) => {
      const key = `${item.varietyCode}_${item.grade}`;
      if (!groupedData[key]) {
        groupedData[key] = {
          variety_code: item.varietyCode,
          item_name: item.itemName,
          variety_name: item.varietyName,
          grade: item.grade,
          prices: [item.bidPrice],
          total_qty: item.unitQty,
        };
      } else {
        groupedData[key].prices.push(item.bidPrice);
        groupedData[key].total_qty += item.unitQty;
      }
    });

    // 통계 계산 및 DB 저장용 포맷 변환
    const productsToSave = Object.values(groupedData).map((group) => {
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
        direct_price: avgPrice, // 초기값: 경매 평균가
        updated_at: new Date().toISOString(),
      };
    });

    // DB에 upsert (variety_code, grade 기준으로 중복 업데이트)
    console.log(`💾 ${productsToSave.length}개 상품을 DB에 저장 중...`);
    const { error } = await supabase
      .from('products')
      .upsert(productsToSave, { onConflict: 'variety_code, grade' });

    if (error) throw new Error(`Supabase 저장 실패: ${error.message}`);

    console.log(`✅ 경매 데이터 동기화 완료! (${productsToSave.length}개 항목)`);

    return NextResponse.json({
      success: true,
      message: `${productsToSave.length}개 상품 데이터가 업데이트되었습니다.`,
      itemCount: productsToSave.length,
      date: targetDate,
    });
  } catch (error: any) {
    console.error('❌ 크롤링 오류:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || '데이터 수집 중 오류가 발생했습니다.',
        error: error.toString(),
      },
      { status: 500 }
    );
  }
}
