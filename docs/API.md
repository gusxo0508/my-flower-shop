# API 명세서

## 공통 응답 형식
```json
// 성공
{ "success": true, "data": { ... } }

// 실패
{ "success": false, "error": "에러 메시지" }
```

## 인증
- Supabase Auth 사용 (JWT Bearer Token)
- 로그인 필요 API: `Authorization: Bearer <token>` 헤더 필요
- admin 전용 API: profiles.role = 'admin' 체크

---

## 상품 API

### GET /api/products
상품 목록 조회
- 인증: 불필요
- Query: `?grade=특&item_name=장미`
- Response: `Product[]`

### GET /api/products/[id]
상품 상세 조회
- 인증: 불필요
- Response: `Product`

### POST /api/products
상품 등록 (admin)
- 인증: admin
- Body: `{ item_name, variety_name, grade, direct_price, stock_qty }`

### PATCH /api/products/[id]
상품 수정 (admin) - 재고, 직판가 조절 포함
- 인증: admin
- Body: `{ direct_price?, stock_qty?, auction_qty? }`

---

## 주문 API

### GET /api/orders
내 주문 목록
- 인증: 로그인 필요
- Response: `Order[]`

### POST /api/orders
주문 생성
- 인증: 로그인 필요
- Body: `{ product_id, order_qty }`
- 재고 확인 후 차감 처리

### PATCH /api/orders/[id]
주문 상태 변경 (admin)
- 인증: admin
- Body: `{ status: '결제완료' | '배송중' | '배송완료' | '취소' }`

---

## 결제 API

### POST /api/payment/kakao/ready
카카오페이 결제 준비
- 인증: 로그인 필요
- Body: `{ order_id, amount, item_name }`
- Response: `{ tid, next_redirect_app_url, next_redirect_mobile_url }`

### GET /api/payment/kakao/approve
카카오페이 결제 승인 (카카오 리다이렉트)
- Query: `?pg_token=...&order_id=...`
- 승인 후 주문 status '결제완료'로 업데이트

---

## 알림 API

### POST /api/notify/kakao
카카오 알림톡 발송
- 인증: 서버 내부 호출
- Body: `{ order_id, template_code }`
- 템플릿: `ORDER_COMPLETE`, `DELIVERY_START`, `DELIVERY_COMPLETE`

---

## 경매가 API

### POST /api/auction/sync
경매가 수집 트리거 (admin or cron)
- 인증: admin 또는 cron secret
- flower.at.or.kr 크롤링 후 products 테이블 업데이트

---

## 배송 API

### GET /api/delivery/[tracking_no]
배송 조회
- 인증: 로그인 필요
- Query: `?carrier=CJ대한통운`
- Response: `{ status, steps: [{ time, location, description }] }`

---

## 관리자 API

### GET /api/admin/orders
전체 주문 목록 (admin)
- 인증: admin
- Query: `?status=입금대기&date=2024-01-01`

### PATCH /api/admin/stock
재고 일괄 조절 (admin)
- 인증: admin
- Body: `{ product_id, stock_qty }`
