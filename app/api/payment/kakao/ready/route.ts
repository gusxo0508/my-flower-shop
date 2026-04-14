// app/api/payment/kakao/ready/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const { cartItems, buyerName, userId } = await request.json();

    if (!cartItems?.length || !buyerName || !userId) {
      return NextResponse.json({ success: false, message: '주문 정보가 부족합니다.' }, { status: 400 });
    }

    const totalAmount = cartItems.reduce(
      (sum: number, item: any) => sum + item.unitPrice * item.quantity, 0
    );
    const totalQty = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const itemName =
      cartItems.length > 1
        ? `${cartItems[0].varietyName} 외 ${cartItems.length - 1}건`
        : cartItems[0].varietyName;
    const partnerOrderId = `order_${Date.now()}_${userId.slice(0, 8)}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    // 1. 카카오페이 결제 준비 요청
    const readyRes = await fetch('https://open-api.kakaopay.com/online/v1/payment/ready', {
      method: 'POST',
      headers: {
        Authorization: `SECRET_KEY ${process.env.KAKAO_PAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cid: process.env.KAKAO_PAY_CID,
        partner_order_id: partnerOrderId,
        partner_user_id: userId,
        item_name: itemName,
        quantity: totalQty,
        total_amount: totalAmount,
        vat_amount: 0,
        tax_free_amount: 0,
        approval_url: `${baseUrl}/payment/success`,
        fail_url: `${baseUrl}/payment/fail`,
        cancel_url: `${baseUrl}/payment/fail`,
      }),
    });

    const readyData = await readyRes.json();
    if (!readyRes.ok) throw new Error(readyData.msg || '카카오페이 결제 준비 실패');

    const { tid, next_redirect_pc_url, next_redirect_mobile_url } = readyData;

    // 2. 결제 세션 저장 (approve 시 cart 복원용)
    // Supabase에 payment_sessions 테이블이 필요합니다. docs/SCHEMA.md 참조
    const { error: sessionError } = await supabaseAdmin.from('payment_sessions').insert({
      tid,
      partner_order_id: partnerOrderId,
      user_id: userId,
      buyer_name: buyerName,
      cart_items: cartItems,
    });
    if (sessionError) throw new Error('결제 세션 저장 실패: ' + sessionError.message);

    return NextResponse.json({
      success: true,
      tid,
      redirect_pc_url: next_redirect_pc_url,
      redirect_mobile_url: next_redirect_mobile_url,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
