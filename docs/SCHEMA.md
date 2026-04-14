# DB 스키마 상세 문서

## Supabase 프로젝트 정보
- DB: PostgreSQL (Supabase 관리형)
- 인증: Supabase Auth (auth.users 테이블 자동 관리)
- RLS: 전 테이블 활성화

---

## 현재 테이블

### profiles
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | auth.users.id와 동일 (PK) |
| email | text | 이메일 (UNIQUE) |
| name | text | 이름 |
| address | text | 배송지 주소 |
| role | text | 'user' or 'admin' (기본: 'user') |
| member_no | integer | 자동증가 회원번호 |
| created_at | timestamptz | 가입일 |

### products
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| variety_code | text | 품종 코드 |
| item_name | text | 품목명 (예: 장미) |
| variety_name | text | 품종명 (예: 빨간장미) |
| grade | text | 등급 (특/상/중) |
| bid_price | integer | 경매 낙찰가 (원) |
| stock_qty | integer | 직판 재고 수량 |
| auction_qty | integer | 경매 출하 수량 |
| min_price | integer | 경매 최저가 |
| max_price | integer | 경매 최고가 |
| avg_price | integer | 경매 평균가 |
| direct_price | integer | 직판가 (관리자 설정) |
| updated_at | timestamptz | 마지막 갱신일 |

### orders
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | auth.users.id 참조 |
| product_id | uuid | products.id 참조 |
| buyer_name | text | 구매자명 |
| order_qty | integer | 주문 수량 |
| status | text | 입금대기/결제완료/배송중/배송완료/취소 |
| created_at | timestamptz | 주문일 |

### notices
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| title | text | 제목 |
| content | text | 내용 |
| author_name | text | 작성자명 (기본: '아빠의 꽃') |
| created_at | timestamptz | 작성일 |

### comments
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| notice_id | uuid | notices.id 참조 |
| user_id | uuid | profiles.id 참조 |
| content | text | 댓글 내용 |
| created_at | timestamptz | 작성일 |

---

## 추가된 테이블

### payment_sessions (카카오페이 결제 세션)
결제 ready → approve 사이의 cart 데이터를 보관. approve 완료 후 즉시 삭제.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| tid | text | 카카오페이 거래 ID (UNIQUE) |
| partner_order_id | text | 내부 주문 ID |
| user_id | uuid | auth.users.id 참조 |
| buyer_name | text | 주문자명 |
| cart_items | jsonb | `[{ productId, quantity, varietyName, unitPrice }]` |
| created_at | timestamptz | 생성일 |

**DDL (Supabase SQL Editor에서 실행)**
```sql
CREATE TABLE payment_sessions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tid              text NOT NULL UNIQUE,
  partner_order_id text NOT NULL,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_name       text NOT NULL,
  cart_items       jsonb NOT NULL,
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
-- API Route는 service role key(supabaseAdmin)로만 접근 — 공개 정책 불필요
```

---

## 추가 예정 테이블

### invoices (송장)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| order_id | uuid | orders.id 참조 |
| carrier | text | 택배사명 |
| tracking_no | text | 송장번호 |
| registered_at | timestamptz | 송장 등록일 |

### kakao_logs (알림톡 발송 이력)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| order_id | uuid | 관련 주문 |
| user_id | uuid | 수신자 |
| template_code | text | 템플릿 코드 |
| status | text | 발송성공/발송실패 |
| sent_at | timestamptz | 발송일시 |

### auction_price_history (경매가 이력)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| product_id | uuid | products.id 참조 |
| bid_price | integer | 낙찰가 |
| min_price | integer | 최저가 |
| max_price | integer | 최고가 |
| avg_price | integer | 평균가 |
| recorded_date | date | 수집 날짜 |

### qna (Q&A)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | 작성자 |
| title | text | 제목 |
| content | text | 내용 |
| answer | text | 관리자 답변 |
| is_answered | boolean | 답변 여부 |
| is_secret | boolean | 비밀글 여부 |
| created_at | timestamptz | 작성일 |
| answered_at | timestamptz | 답변일 |

---

## RLS 정책 요약
| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| profiles | 본인만 | auth trigger | 본인만 | X |
| products | 전체 | admin | admin | admin |
| orders | 본인만 (admin 전체) | 로그인 | admin | X |
| notices | 전체 | admin | admin | admin |
| comments | 전체 | 로그인 | 본인 | 본인/admin |
| qna | 본인+admin (비밀글) | 로그인 | admin(답변) | 본인/admin |
