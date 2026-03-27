import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: Request) {
  try {
    // 화면에서 보낸 꽃 데이터와 입력된 수량(items)을 받습니다.
    const { items } = await request.json();

    // DB에 업데이트할 형태로 데이터를 정리합니다.
    const updates = items.map((item: any) => ({
      variety_code: item.varietyCode,
      item_name: item.itemName,
      variety_name: item.varietyName,
      grade: item.grade,
      bid_price: item.bidPrice,
      auction_qty: item.unitQty,
      stock_qty: item.stockQty // 화면에서 새로 입력한 판매 가능 수량
    }));

    // Supabase의 products 테이블에 수량을 덮어씌웁니다.
    const { error } = await supabase
      .from('products')
      .upsert(updates, { onConflict: 'variety_code' });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, message: '수량이 성공적으로 저장되었습니다.' });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}