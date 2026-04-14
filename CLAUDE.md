# 🌸 아빠의 꽃 - 플라워샵 직거래 플랫폼

## 프로젝트 개요
원예농업 생산자(아빠)가 플로리스트에게 경매가 기준으로 꽃을 직접 판매하는 B2B 플랫폼.
경매시장(https://flower.at.or.kr/yfmc/) 경매가를 기준으로 직판가를 책정하며,
경매 출하 수량과 별도로 직판 수량을 관리함.

## 기술 스택
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes + Supabase Edge Functions
- **DB**: Supabase (PostgreSQL) + RLS 적용
- **배포**: Vercel
- **결제**: 카카오페이 API
- **알림**: 카카오 알림톡 (카카오 비즈니스 API)
- **저장소**: GitHub (https://github.com/gusxo0508/my-flower-shop)

## DB 스키마 요약
- `profiles`: 회원 정보 (role: user / admin, member_no 자동증가)
- `products`: 상품 (bid_price=경매가, direct_price=직판가, stock_qty=직판재고, auction_qty=경매출하량)
- `orders`: 주문 (status: 입금대기 / 입금완료 / 배송중 / 배송완료 / 취소)
- `notices`: 공지사항
- `comments`: 댓글 (notices에 연결)

## 핵심 비즈니스 로직
1. 경매가 자동 수집 → flower.at.or.kr 크롤링 (min/max/avg_price 저장)
2. 직판가(direct_price) = 관리자가 경매가 기준으로 수동 조정
3. 직판 재고(stock_qty)는 경매 출하량(auction_qty)과 완전히 별도 관리
4. 구매 플로우: 상품선택 → 주문접수(입금대기) → 입금확인 → 알림톡 발송 → 송장등록 → 배송조회
   - 현재: 카카오페이 미연동, 주문 즉시 "입금대기" 상태로 처리 후 관리자가 수동 확인

## 코딩 컨벤션
- TypeScript strict 모드 사용
- 컴포넌트: PascalCase / 함수·변수: camelCase / 상수: UPPER_SNAKE_CASE
- Supabase 클라이언트: `/lib/supabase.ts` (서버용/클라이언트용 분리)
- 공통 타입 정의: `/types/index.ts`
- API 라우트: `/app/api/[기능]/route.ts`
- 공통 컴포넌트: `/components/ui/` / 페이지별 컴포넌트: `/components/[페이지명]/`

## 페이지 구조
| 경로 | 설명 | 접근 | 구현 |
|------|------|------|------|
| `/` | 메인 (경매가 vs 직판가 비교, 공지 미리보기) | 전체 | ✅ |
| `/login` | 로그인 / 회원가입 | 비로그인 | ✅ |
| `/shop` | 상품 목록 + 장바구니 + 주문 | 로그인 | ✅ |
| `/notices` | 공지사항 목록 | 전체 | ✅ |
| `/notices/[id]` | 공지사항 상세 + 댓글 | 전체 | ✅ |
| `/mypage` | 마이페이지 (구매내역) | 로그인 | ✅ |
| `/orders` | 관리자 주문 장부 | role=admin | ✅ |
| `/admin` | 관리자 재고/직판가 관리 | role=admin | ✅ |
| `/admin/members` | 관리자 회원 CRM | role=admin | ✅ |
| `/admin/notices` | 관리자 공지사항 작성/삭제 | role=admin | ✅ |
| `/products/[id]` | 상품 상세 페이지 | 전체 | ❌ |
| `/cart` | 독립 장바구니 페이지 | 로그인 | ❌ (shop 내 인라인 처리) |
| `/qna` | Q&A 게시판 | 로그인 | ❌ |

## 구현 현황 체크리스트
- [x] 회원가입 / 로그인 (Supabase Auth, Daum 주소 검색)
- [x] 상품 목록 페이지 (`/shop`)
- [x] 경매가 자동 수집 크롤러 (`/api/scrape`, `lib/scraper.ts`)
- [x] 경매가 vs 직판가 비교 UI (메인 페이지 + 관리자 페이지)
- [x] 장바구니 (shop 페이지 내 인라인 처리)
- [x] 카카오 알림톡 연동 (Solapi 코드 완성, API 키/채널ID/템플릿ID 설정 필요)
- [x] 마이페이지 (구매내역 그룹핑, 상세 펼침)
- [x] 관리자 페이지 - 재고 및 직판가 관리 (`/admin`)
- [x] 관리자 페이지 - 전체 주문 장부 (`/orders`, 상태 변경, Excel 다운로드)
- [x] 관리자 페이지 - 회원 CRM (`/admin/members`)
- [x] 공지사항 게시판 (`/notices`, `/notices/[id]`, 댓글 포함)
- [x] 관리자 공지사항 작성/삭제 (`/admin/notices`)
- [ ] 상품 상세 페이지 (`/products/[id]`)
- [ ] 카카오페이 결제 연동 (현재: 주문 즉시 입금대기 처리)
- [ ] Q&A 게시판 (DB 스키마 설계 완료)
- [ ] 송장 등록 / 배송 조회 (DB 스키마 설계 완료)
- [ ] 모바일 앱 연동 (API 설계)

## 역할별 상세 가이드 참조
각 역할로 작업 시 아래 파일을 @참조하여 시작하세요.
- PM: @docs/roles/pm.md
- DB 개발자: @docs/roles/db.md
- Backend 개발자: @docs/roles/backend.md
- Frontend 개발자: @docs/roles/frontend.md
- QA: @docs/roles/qa.md
- UX: @docs/roles/ux.md
- UI: @docs/roles/ui.md
- 전체 API 명세: @docs/API.md
- DB 스키마 상세: @docs/SCHEMA.md
