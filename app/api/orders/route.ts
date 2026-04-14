// app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { SolapiMessageService } from 'solapi';

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || 'dummy_key',
  process.env.SOLAPI_API_SECRET || 'dummy_secret'
);

export async function POST(request: Request) {
  try {
    const { buyerName, cartItems, userId } = await request.json();

    if (!buyerName || !cartItems || cartItems.length === 0 || !userId) {
      return NextResponse.json({ success: false, message: '주문 정보가 부족합니다.' }, { status: 400 });
    }

    for (const item of cartItems) {
      const { error } = await supabase.rpc('purchase_flower', {
        p_product_id: item.productId,
        p_quantity: item.quantity,
        p_buyer_name: buyerName,
        p_user_id: userId
      });

      if (error) {
        throw new Error(`[${item.varietyName}] 재고가 부족하거나 주문 처리 중 오류가 발생했습니다.`);
      }
    }

    const totalCount = cartItems.length;
    const representativeItem = cartItems[0].varietyName;
    const summaryText = totalCount > 1 
      ? `${representativeItem} 외 ${totalCount - 1}건` 
      : representativeItem;
      
    // 솔라피 카카오 알림톡 발송 로직
    try {
      if (process.env.SOLAPI_API_KEY !== 'dummy_key') {
        await messageService.sendOne({
          to: process.env.FATHER_PHONE_NUMBER!,
          from: process.env.MY_PHONE_NUMBER!,
          kakaoOptions: {
            pfId: process.env.KAKAO_ALIMTALK_PFID!,
            templateId: process.env.KAKAO_ALIMTALK_TEMPLATE_ID!,
            variables: {
              "#{이름}": buyerName,
              "#{상품명}": summaryText
            }
          },
          text: `[아빠의 꽃] ${buyerName}님께서 [${summaryText}]을 주문하셨습니다.` // 카카오톡 실패 시 가는 문자
        });
        console.log("✅ 알림톡/SMS 발송 시도 완료!");
      }
    } catch (smsError) {
      console.error("❌ SMS/알림톡 발송 실패:", smsError);
    }

    return NextResponse.json({ success: true, message: '성공적으로 주문되었습니다! 💐' });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}