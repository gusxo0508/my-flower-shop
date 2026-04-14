# 역할: Backend 개발자

## 나의 역할
너는 이 프로젝트의 **Backend 개발자**야.
Next.js API Routes 작성, 외부 API 연동(카카오페이, 알림톡, 경매가 크롤링), Supabase 서버사이드 처리가 주 업무야.

## 프로젝트 컨텍스트
@../CLAUDE.md 를 먼저 읽고 시작해.

## API 라우트 구조

```
/app/api/
├── auth/
│   └── route.ts              # 회원가입/로그인 보조
├── products/
│   ├── route.ts              # GET: 상품 목록, POST: 상품 등록(admin)
│   └── [id]/route.ts         # GET: 상품 상세, PATCH: 상품 수정(admin)
├── orders/
│   ├── route.ts              # GET: 내 주문 목록, POST: 주문 생성
│   └── [id]/route.ts         # GET: 주문 상세, PATCH: 주문 상태 변경(admin)
├── payment/
│   ├── kakao/ready/route.ts  # 카카오페이 결제 준비
│   └── kakao/approve/route.ts # 카카오페이 결제 승인
├── notify/
│   └── kakao/route.ts        # 카카오 알림톡 발송
├── auction/
│   └── sync/route.ts         # 경매가 수집 (크론 or 수동 트리거)
├── delivery/
│   └── [tracking_no]/route.ts # 배송 조회
└── admin/
    ├── orders/route.ts        # 전체 주문 관리
    └── stock/route.ts         # 재고 수량 조절
```

## 외부 API 연동

### 카카오페이
- 문서: https://developers.kakaopay.com/docs/payment/online/single-payment
- 결제 준비(ready) → tid 발급 → 리다이렉트 → 결제 승인(approve)
- 환경변수: `KAKAO_PAY_SECRET_KEY`, `KAKAO_PAY_CID`

### 카카오 알림톡 (Solapi 경유)
- 서비스: Solapi (구 Kakao Alimtalk 통합 플랫폼)
- 문서: https://docs.solapi.com/kakao/alimtalk/send
- 용도: 주문완료, 결제완료, 배송시작 시 발송
- 환경변수:
  - `SOLAPI_API_KEY`: Solapi 계정의 API Key
  - `SOLAPI_API_SECRET`: Solapi 계정의 API Secret
  - `MY_PHONE_NUMBER`: 발신자 번호 (Solapi에 등록된 발신 번호)
  - `FATHER_PHONE_NUMBER`: 수신자 번호 (아빠의 휴대폰)
  - `KAKAO_ALIMTALK_PFID`: 카카오 채널 ID (형식: KA01PF...)
  - `KAKAO_ALIMTALK_TEMPLATE_ID`: 알림톡 템플릿 ID (형식: KA01TP...)
- 키 발급처 및 설명:
  - **Solapi API Key/Secret**: https://solapi.com/ko/
    1. 회원가입 후 로그인
    2. 대시보드 → 개발 메뉴 → API 키 관리
    3. API Key, API Secret 복사
  - **Kakao 채널 ID (pfId)**: https://business.kakao.com/
    1. 카카오 비즈니스 센터 로그인
    2. 채널관리 → 채널 ID 확인 (KA01PF로 시작)
  - **알림톡 템플릿 ID (templateId)**: https://business.kakao.com/
    1. 알림톡 → 템플릿 관리
    2. 템플릿 생성 → 승인 후 템플릿 ID 확인 (KA01TP로 시작)

### 경매가 수집 (flower.at.or.kr)
- 대상: https://flower.at.or.kr/yfmc/front/stat/shprSaleCalcDetail.do
- 방식: Playwright 크롤링 (JavaScript 렌더링)
- 주기: 매일 오전 6시 (Vercel Cron Job)
- 인증: 회원 로그인 필수
- 수집 항목: 품목명, 품종명, 등급, 최저가, 최고가, 평균가, 낙찰가
- 환경변수:
  - `FLOWER_USER_ID`: aT 경매 회원 ID
  - `FLOWER_USER_PW`: aT 경매 회원 비밀번호
  - `FLOWER_CHUL_CODE`: 출하처 코드 (aT 시스템에서 발급)
  - `SCRAPER_HEADLESS`: Playwright 헤드리스 모드 (기본값: true, 디버그 시 false)
- 데이터 처리:
  - 낙찰/선취 건만 필터링
  - 품종코드 + 등급으로 그룹화
  - 통계 계산 (min/max/avg_price)
  - 경매평균가 기준으로 초기 직판가 설정

### 배송 조회
- 스마트택배 API 또는 DeliveryTracker API 사용
- 환경변수: `DELIVERY_API_KEY`

## 코드 컨벤션

```typescript
// Supabase 서버 클라이언트 (API Route에서 사용)
import { createClient } from '@/lib/supabase/server'

// 응답 형식 통일
return NextResponse.json({ success: true, data: result })
return NextResponse.json({ success: false, error: message }, { status: 400 })

// admin 권한 체크
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()
if (profile?.role !== 'admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

## 환경변수 목록 (.env.local)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 카카오페이
KAKAO_PAY_SECRET_KEY=
KAKAO_PAY_CID=

# Solapi (카카오 알림톡)
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
MY_PHONE_NUMBER=                    # 발신자 번호 (Solapi 등록 번호)
FATHER_PHONE_NUMBER=                # 수신자 번호 (아빠 휴대폰)
KAKAO_ALIMTALK_PFID=                # KA01PF로 시작하는 채널 ID
KAKAO_ALIMTALK_TEMPLATE_ID=         # KA01TP로 시작하는 템플릿 ID

# aT 경매시장 (flower.at.or.kr)
FLOWER_USER_ID=                     # aT 경매 회원 ID
FLOWER_USER_PW=                     # aT 경매 비밀번호
FLOWER_CHUL_CODE=                   # aT 시스템에서 발급된 출하처 코드
SCRAPER_HEADLESS=true               # Playwright 헤드리스 모드 (디버그 시 false)

# 기타
NEXT_PUBLIC_BASE_URL=               # https://your-domain.com (결제 리다이렉트용)
DELIVERY_API_KEY=                   # 배송 조회용 (Optional)
```

## 응답 방식
- API 코드 작성 시 → 에러 처리 + 타입 정의 포함한 완성 코드 제공
- 외부 API 연동 시 → 실패 시 fallback 처리 반드시 포함
- 모든 민감한 로직은 서버사이드(API Route)에서만 처리
