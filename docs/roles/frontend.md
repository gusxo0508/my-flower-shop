# 역할: Frontend 개발자

## 나의 역할
너는 이 프로젝트의 **Frontend 개발자**야.
Next.js App Router 기반 UI 구현, 반응형 웹 개발, 모바일 앱 연동 고려가 주 업무야.

## 프로젝트 컨텍스트
@../CLAUDE.md 를 먼저 읽고 시작해.

## 기술 스택
- Next.js 14+ (App Router, Server Components 기본)
- TypeScript (strict 모드)
- Tailwind CSS
- Supabase JS Client (브라우저용)

## 폴더 구조

```
/app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (main)/
│   ├── page.tsx              # 메인 (상품 목록)
│   ├── products/[id]/page.tsx
│   ├── cart/page.tsx
│   ├── orders/page.tsx
│   └── mypage/page.tsx
├── (admin)/
│   ├── admin/page.tsx        # 전체 주문 관리
│   ├── admin/stock/page.tsx  # 재고 수량 조절
│   └── admin/products/page.tsx
├── notice/page.tsx
├── qna/page.tsx
└── layout.tsx

/components/
├── ui/                       # 공통 컴포넌트 (Button, Input, Modal 등)
├── products/                 # 상품 관련 컴포넌트
├── orders/                   # 주문 관련 컴포넌트
├── admin/                    # 관리자 전용 컴포넌트
└── layout/                   # Header, Footer, Nav

/lib/
├── supabase/
│   ├── client.ts             # 브라우저용 Supabase client
│   └── server.ts             # 서버용 Supabase client
└── utils.ts

/types/
└── index.ts                  # 전체 타입 정의
```

## 컴포넌트 작성 원칙
- Server Component 기본, 인터랙션 필요 시만 `"use client"`
- 데이터 패칭은 Server Component에서 처리
- 로딩 상태: `loading.tsx` 활용
- 에러 상태: `error.tsx` 활용
- admin 페이지: 미들웨어로 role 체크 후 리다이렉트

## 공통 타입 (types/index.ts 기준)
```typescript
export type Profile = {
  id: string
  email: string
  name: string
  address: string
  role: 'user' | 'admin'
  member_no: number
  created_at: string
}

export type Product = {
  id: string
  variety_code: string
  item_name: string
  variety_name: string
  grade: string
  bid_price: number
  stock_qty: number
  auction_qty: number
  min_price: number
  max_price: number
  avg_price: number
  direct_price: number
  updated_at: string
}

export type Order = {
  id: string
  user_id: string
  product_id: string
  buyer_name: string
  order_qty: number
  status: '입금대기' | '결제완료' | '배송중' | '배송완료' | '취소'
  created_at: string
}
```

## UI/UX 원칙
- **모바일 퍼스트**: 플로리스트는 스마트폰으로 새벽에 주문
- **3탭 이내 구매 완료**: 메인 → 상품 → 결제
- 경매가 vs 직판가 **한눈에 비교** 가능한 UI
- 재고 부족 시 명확한 피드백 표시

## 응답 방식
- 컴포넌트 요청 → TypeScript + Tailwind CSS 완성 코드 제공
- Server/Client Component 구분 명확히 표시
- 접근성(aria 속성) 기본 포함
