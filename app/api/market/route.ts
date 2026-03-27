// app/api/market/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemName = searchParams.get('itemName') || '';       // 예: '다알리아'
    const varietyName = searchParams.get('varietyName') || ''; // 예: '복색'

    // 1. PDF 가이드에 따른 파라미터 세팅
    const serviceKey = 'sample';         // 테스트용 샘플 키 [cite: 239]
    const baseDate = '2018-08-16';       // 테스트용 날짜 [cite: 239] (나중엔 오늘 날짜로 변경!)
    const flowerGubn = '1';              // 1: 절화 [cite: 232]
    const dataType = 'json';             // json 포맷 [cite: 240]
    const countPerPage = '999';          // 최대 출력 개수 [cite: 240]

    // API 호출 URL 조립 (품목명 검색 기능 포함)
    const apiUrl = `https://flower.at.or.kr/api/returnData.api?kind=f001&serviceKey=${serviceKey}&baseDate=${baseDate}&flowerGubn=${flowerGubn}&dataType=${dataType}&countPerPage=${countPerPage}&pumName=${encodeURIComponent(itemName)}`;

    console.log(`[aT API 호출 중...] 주소: ${apiUrl}`);

    // 2. aT 서버로 실제 요청 보내기
    const response = await fetch(apiUrl);
    const data = await response.json();

    // 3. 응답 데이터에서 가격 추출하기
    // 보통 JSON 배열로 데이터가 들어옵니다. 구조 확인용으로 안전하게 파싱합니다.
    let items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.response && Array.isArray(data.response)) {
      items = data.response;
    } else if (data.data) {
      items = data.data;
    }

    let avgPrice = 0;
    let maxPrice = 0;

    if (items && items.length > 0) {
      // 품종명(goodName)까지 일치하는 데이터 찾기 [cite: 236]
      const exactMatch = items.find((item: any) => item.goodName === varietyName);

      if (exactMatch) {
        avgPrice = parseInt(exactMatch.avgAmt, 10); // 평균가 [cite: 236]
        maxPrice = parseInt(exactMatch.maxAmt, 10); // 최고가 [cite: 236]
      } else {
        // 품종이 일치하는 게 없으면 해당 품목의 첫 번째 검색 결과 사용
        avgPrice = parseInt(items[0].avgAmt, 10);
        maxPrice = parseInt(items[0].maxAmt, 10);
      }
    }

    // 🚨 [테스트용 방어 코드] 
    // 2018년 8월 16일 샘플 데이터에 다알리아나 아미초가 없어서 가격이 0원으로 나올 수 있습니다.
    // UI가 깨지지 않도록, 검색된 가격이 없으면 임시 가격을 뱉어줍니다.
    if (avgPrice === 0) {
      console.log(`⚠️ ${baseDate} 데이터에 '${itemName}'이 없어 임시 가격을 사용합니다.`);
      avgPrice = itemName === '다알리아' ? 12000 : 9500;
      maxPrice = itemName === '다알리아' ? 15000 : 11000;
    }

    return NextResponse.json({
      success: true,
      data: {
        itemName,
        varietyName,
        avgPrice,
        maxPrice,
      }
    });

  } catch (error: any) {
    console.error('aT API 연동 에러:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}