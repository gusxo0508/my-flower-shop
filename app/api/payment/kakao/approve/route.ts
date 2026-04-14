// app/api/payment/kakao/approve/route.ts
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../../lib/supabase';
import { SolapiMessageService } from 'solapi';

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || 'dummy_key',
  process.env.SOLAPI_API_SECRET || 'dummy_secret'
);

export async function POST(request: Request) {
  try {
    const { tid, pg_token } = await request.json();
    if (!tid || !pg_token) {
      return NextResponse.json({ success: false, message: '결제 정보가 부족합니다.' }, { status: 400 });
    }

    // 1. 결제 세션 조회
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('tid', tid)
      .single();
    if (sessionError || !session) throw new Error('결제 세션을 찾을 수 없습니다.');

    // 2. 카카오페이 결제 승인 요청
    const approveRes = await fetch('https://open-api.kakaopay.com/online/v1/payment/approve', {
      method: 'POST',
      headers: {
        Authorization: `SECRET_KEY ${process.env.KAKAO_PAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cid: process.env.KAKAO_PAY_CID,
        tid,
        partner_order_id: session.partner_order_id,
        partner_user_id: session.user_id,
        pg_token,
      }),
    });

    const approveData = await approveRes.json();
    if (!approveRes.ok) throw new Error(approveData.msg || '카카오페이 결제 승인 실패');

    // 3. 주문 생성 (purchase_flower RPC: 재고 차감 + 주문 insert, 초기 상태 '입금대기')
    const beforeTime = new Date().toISOString();
    for (const item of session.cart_items) {
      const { error } = await supabase.rpc('purchase_flower', {
        p_product_id: item.productId,
        p_quantity: item.quantity,
        p_buyer_name: session.buyer_name,
        p_user_id: session.user_id,
      });
      if (error) throw new Error(`[${item.varietyName}] 재고 부족 또는 처리 오류`);
    }

    // 4. 카카오페이 승인 완료 → 상태를 '입금완료'로 갱신
    await supabaseAdmin
      .from('orders')
      .update({ status: '입금완료' })
      .eq('user_id', session.user_id)
      .eq('status', '입금대기')
      .gte('created_at', beforeTime);

    // 5. 결제 세션 삭제
    await supabaseAdmin.from('payment_sessions').delete().eq('tid', tid);

    // 6. 알림톡 발송
    try {
      if (process.env.SOLAPI_API_KEY !== 'dummy_key') {
        const summaryText =
          session.cart_items.length > 1
            ? `${session.cart_items[0].varietyName} 외 ${session.cart_items.length - 1}건`
            : session.cart_items[0].varietyName;
        await messageService.sendOne({
          to: process.env.FATHER_PHONE_NUMBER!,
          from: process.env.MY_PHONE_NUMBER!,
          kakaoOptions: {
            pfId: process.env.KAKAO_ALIMTALK_PFID!,
            templateId: process.env.KAKAO_ALIMTALK_TEMPLATE_ID!,
            variables: {
              '#{이름}': session.buyer_name,
              '#{상품명}': summaryText,
            },
          },
          text: `[아빠의 꽃] ${session.buyer_name}님의 [${summaryText}] 결제가 완료되었습니다.`,
        });
      }
    } catch (smsError) {
      console.error('알림톡 발송 실패:', smsError);
    }

    return NextResponse.json({ success: true, buyerName: session.buyer_name });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
