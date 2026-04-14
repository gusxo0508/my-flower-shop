// lib/scraper.ts
import { chromium, Browser, Page } from 'playwright';

export interface ScrapedAuction {
  panDate: string;
  itemName: string;
  varietyName: string;
  varietyCode: string;
  boxQty: number;
  unitQty: number;
  grade: string;
  bidPrice: number;
  result: string;
}

interface ScraperConfig {
  userId: string;
  userPw: string;
  chulCode: string;
  headless?: boolean;
  timeout?: number;
  retryCount?: number;
}

const DEFAULT_CONFIG: Partial<ScraperConfig> = {
  headless: true,
  timeout: 30000,
  retryCount: 3,
};

/**
 * 경매 페이지 로그인
 */
const loginToAuction = async (page: Page, config: ScraperConfig): Promise<void> => {
  console.log('📍 [1/4] 로그인 페이지 접속...');
  await page.goto('https://flower.at.or.kr/yfmc/front/login.do', {
    waitUntil: 'networkidle',
    timeout: config.timeout,
  });

  // 로그인 폼 요소 대기
  const idInput = page.getByPlaceholder('아이디를 입력해주세요.');
  const pwInput = page.getByPlaceholder('비밀번호를 입력해주세요.');

  await idInput.waitFor({ state: 'visible', timeout: config.timeout });
  console.log('✅ 로그인 폼 진입 성공');

  // 자격증명 입력
  console.log('📍 로그인 시도 중...');
  await idInput.click();
  await idInput.fill(config.userId);

  await pwInput.click();
  await pwInput.fill(config.userPw);

  // 로그인 버튼 또는 Enter로 제출
  await pwInput.press('Enter');

  // 로그인 완료 대기
  console.log('⏳ 서버 응답 대기 중...');
  await page.waitForTimeout(3000);

  // 로그인 실패 확인
  if (page.url().includes('login.do')) {
    await page.screenshot({ path: 'login-failed.png' });
    throw new Error('❌ 로그인 실패! login-failed.png 확인 후 자격증명 검증해주세요.');
  }

  console.log('✅ 로그인 성공!');
};

/**
 * 정산 내역 페이지에서 데이터 수집
 */
const scrapeAuctionData = async (
  page: Page,
  config: ScraperConfig,
  targetDate: string
): Promise<ScrapedAuction[]> => {
  console.log(`📍 [2/4] 정산 페이지 접속 (날짜: ${targetDate})...`);

  const url = `https://flower.at.or.kr/yfmc/front/stat/shprSaleCalcDetail.do?panDate=${targetDate}&chulCode=${config.chulCode}&bunChk=N`;
  await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: config.timeout,
  });

  // 결과 테이블 대기
  console.log('📍 결과 테이블 로드 대기...');
  try {
    await page.waitForSelector('#resultTbody', { timeout: config.timeout });
  } catch {
    console.warn('⚠️ 주어진 날짜의 데이터가 없을 수 있습니다.');
    return [];
  }

  console.log('📍 [3/4] 데이터 파싱 시작...');

  // 테이블 데이터 파싱
  const auctionData = await page.$$eval('#resultTbody tr', (rows) => {
    const parsedData: ScrapedAuction[] = [];

    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].querySelectorAll('td');
      if (cols.length < 10) continue;

      try {
        // 각 컬럼 데이터 추출
        const panDate = cols[0].textContent?.trim() || '';
        const itemName = cols[1].textContent?.trim() || '';
        const varietyName = cols[2].textContent?.trim() || '';
        const varietyCode = cols[3].textContent?.trim() || '';

        const boxQty = parseInt(
          cols[4].textContent?.replace(/,/g, '').trim() || '0',
          10
        );

        const unitQty = parseInt(
          cols[5].textContent?.replace(/,/g, '').trim() || '0',
          10
        );

        const grade = cols[6].textContent?.trim() || '';

        const bidPrice = parseInt(
          cols[7].textContent?.replace(/,/g, '').trim() || '0',
          10
        );

        const resultText = cols[9].textContent?.trim() || '';

        // 낙찰/선취만 필터링
        if (resultText === '낙찰' || resultText === '선취') {
          parsedData.push({
            panDate,
            itemName,
            varietyName,
            varietyCode,
            boxQty: isNaN(boxQty) ? 0 : boxQty,
            unitQty: isNaN(unitQty) ? 0 : unitQty,
            grade,
            bidPrice: isNaN(bidPrice) ? 0 : bidPrice,
            result: resultText,
          });
        }
      } catch (err) {
        console.error(`  ⚠️ 행 ${i} 파싱 중 오류:`, err);
        continue;
      }
    }

    return parsedData;
  });

  console.log(`✅ 총 ${auctionData.length}개 항목 추출됨`);
  return auctionData;
};

/**
 * 메인 크롤러 함수
 * @param targetDate 수집 대상 날짜 (YYYYMMDD 형식, 예: 20260414)
 * @returns 경매 데이터 배열
 */
export const scrapeAtAuction = async (targetDate?: string): Promise<ScrapedAuction[]> => {
  // 환경변수 검증
  const userId = process.env.FLOWER_USER_ID;
  const userPw = process.env.FLOWER_USER_PW;
  const chulCode = process.env.FLOWER_CHUL_CODE;

  if (!userId || !userPw || !chulCode) {
    throw new Error(
      '❌ 필수 환경변수 누락:\n' +
      `  - FLOWER_USER_ID: ${userId ? '✅' : '❌'}\n` +
      `  - FLOWER_USER_PW: ${userPw ? '✅' : '❌'}\n` +
      `  - FLOWER_CHUL_CODE: ${chulCode ? '✅' : '❌'}`
    );
  }

  // 날짜 처리 (미지정 시 오늘 날짜)
  const dateToScrape = targetDate || (() => {
    const today = new Date();
    return today.toISOString().split('T')[0].replace(/-/g, '');
  })();

  console.log('🌸 경매 데이터 수집 시작');
  console.log(`   타겟 날짜: ${dateToScrape}`);
  console.log(`   출하처 코드: ${chulCode}`);

  const config: ScraperConfig = {
    userId,
    userPw,
    chulCode,
    ...DEFAULT_CONFIG,
    headless: process.env.SCRAPER_HEADLESS !== 'false', // 로컬 디버그 시 false로 설정 가능
  };

  let browser: Browser | null = null;

  try {
    // 브라우저 실행
    console.log(`📍 [0/4] 브라우저 실행 (headless: ${config.headless})...`);
    browser = await chromium.launch({
      headless: config.headless,
      slowMo: config.headless ? 0 : 50, // 헤드리스 모드에서는 slowMo 비활성화
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // 로그인
    await loginToAuction(page, config);

    // 데이터 수집
    const auctionData = await scrapeAuctionData(page, config, dateToScrape);

    console.log(`📍 [4/4] 크롤링 완료`);
    console.log(`✅ 총 ${auctionData.length}개 항목 반환`);

    return auctionData;

  } catch (error) {
    console.error('❌ 크롤링 중 오류 발생:', error);
    throw error;
  } finally {
    if (browser) {
      console.log('🔌 브라우저 종료 중...');
      await browser.close();
    }
  }
};
