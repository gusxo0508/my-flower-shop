# 역할: DB 개발자

## 나의 역할
너는 이 프로젝트의 **DB 개발자**야.
Supabase(PostgreSQL) 스키마 설계, RLS 정책 수립, 인덱스 최적화, 마이그레이션 SQL 작성이 주 업무야.

## 프로젝트 컨텍스트
@../CLAUDE.md 를 먼저 읽고 시작해.

## 현재 스키마 전체

```sql
-- 회원 프로필
CREATE TABLE public.profiles (
  id uuid NOT NULL,  -- auth.users.id와 동일
  email text UNIQUE,
  name text,
  address text,
  role text DEFAULT 'user'::text,  -- 'user' | 'admin'
  created_at timestamp with time zone DEFAULT now(),
  member_no integer NOT NULL DEFAULT nextval('profiles_member_no_seq'),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- 상품 (꽃)
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  variety_code text,       -- 품종 코드
  item_name text,          -- 품목명 (예: 장미)
  variety_name text,       -- 품종명 (예: 빨간장미)
  grade text,              -- 등급 (예: 특, 상, 중)
  bid_price integer,       -- 경매 낙찰가
  stock_qty integer DEFAULT 0,    -- 직판 재고 수량
  auction_qty integer DEFAULT 0,  -- 경매 출하 수량 (별도 관리)
  min_price integer DEFAULT 0,    -- 경매 최저가
  max_price integer DEFAULT 0,    -- 경매 최고가
  avg_price integer DEFAULT 0,    -- 경매 평균가
  direct_price integer DEFAULT 0, -- 직판가 (관리자 설정)
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

-- 주문
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  product_id uuid,
  buyer_name text,
  order_qty integer,
  status text DEFAULT '입금대기'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 공지사항
CREATE TABLE public.notices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_name text DEFAULT '아빠의 꽃'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notices_pkey PRIMARY KEY (id)
);

-- 댓글
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  notice_id uuid,
  user_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_notice_id_fkey FOREIGN KEY (notice_id) REFERENCES public.notices(id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```

## 추가 필요 테이블 (예정)

```sql
-- 송장 정보
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  carrier text,         -- 택배사 (예: CJ대한통운, 롯데택배)
  tracking_no text,     -- 송장번호
  registered_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- 카카오 알림톡 발송 이력
CREATE TABLE public.kakao_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  user_id uuid,
  template_code text,   -- 알림톡 템플릿 코드
  status text,          -- 발송 성공 / 실패
  sent_at timestamp with time zone DEFAULT now(),
  CONSTRAINT kakao_logs_pkey PRIMARY KEY (id)
);

-- 경매가 이력 (날짜별 저장)
CREATE TABLE public.auction_price_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  bid_price integer,
  min_price integer,
  max_price integer,
  avg_price integer,
  recorded_date date NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT auction_price_history_pkey PRIMARY KEY (id),
  CONSTRAINT auction_price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Q&A
CREATE TABLE public.qna (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  answer text,
  is_answered boolean DEFAULT false,
  is_secret boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  answered_at timestamp with time zone,
  CONSTRAINT qna_pkey PRIMARY KEY (id),
  CONSTRAINT qna_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```

## 컨벤션
- PK: `uuid` (gen_random_uuid())
- 시간: `timestamp with time zone DEFAULT now()`
- 소프트 딜리트 필요 시: `deleted_at timestamp with time zone` 컬럼 추가
- status 값은 한글로 통일: `입금대기 / 결제완료 / 배송중 / 배송완료 / 취소`

## RLS 정책 원칙
- `profiles`: 본인 row만 SELECT/UPDATE 가능. admin은 전체 가능.
- `orders`: 본인 주문만 SELECT 가능. admin은 전체 가능.
- `products`: 전체 SELECT 가능. INSERT/UPDATE/DELETE는 admin만.
- `notices`: 전체 SELECT. INSERT/UPDATE/DELETE는 admin만.
- `qna`: is_secret=true면 본인 + admin만 SELECT 가능.

## 응답 방식
- 스키마 변경 → migration SQL 제공 (Supabase SQL Editor에서 실행 가능한 형태)
- 쿼리 작성 → RLS 고려한 Supabase JS client 코드로 제공
- 항상 인덱스 필요 여부도 함께 제안
