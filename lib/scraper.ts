// lib/scraper.ts
import { chromium } from 'playwright';

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

export const scrapeAtAuction = async (targetDate: string): Promise<ScrapedAuction[]> => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log("1. 로그인 페이지로 이동합니다...");
    await page.goto('https://flower.at.or.kr/yfmc/front/login.do', { waitUntil: 'networkidle' });

    const idInput = page.getByPlaceholder('아이디를 입력해주세요.');
    const pwdInput = page.getByPlaceholder('비밀번호를 입력해주세요.');
    
    await idInput.waitFor({ state: 'visible', timeout: 15000 });
    console.log("✅ 로그인 화면 진입 성공.");

    console.log("2. 로그인을 시도합니다...");
    await idInput.click();
    await idInput.pressSequentially(process.env.AT_ID!, { delay: 100 });
    
    await pwdInput.click();
    await pwdInput.pressSequentially(process.env.AT_PWD!, { delay: 100 });
    
    await pwdInput.press('Enter');

    console.log("-> 서버 응답 대기 중...");
    await page.waitForTimeout(4000); 

    if (page.url().includes('login.do')) {
      await page.screenshot({ path: 'login-failed.png' });
      throw new Error("🚨 로그인 실패! 'login-failed.png'를 확인하세요.");
    }
    console.log("✅ 로그인 성공!");

    console.log(`3. [${targetDate}] 정산 내역 페이지를 불러옵니다...`);
    const url = `https://flower.at.or.kr/yfmc/front/stat/shprSaleCalcDetail.do?panDate=${targetDate}&chulCode=${process.env.AT_CHUL_CODE}&bunChk=N`;
    await page.goto(url, { waitUntil: 'networkidle' });

    await page.waitForSelector('#resultTbody', { timeout: 15000 });
    console.log("4. 데이터를 찾았습니다! 추출을 시작합니다...");

    // [핵심 변경] 브라우저가 오해하지 않도록 아주 단순한 반복문 형태로 파싱 로직 변경
    const auctionData = await page.$$eval('#resultTbody tr', (rows) => {
      const parsedData = [];
      
      for (let i = 0; i < rows.length; i++) {
        const cols = rows[i].querySelectorAll('td');
        if (cols.length < 10) continue;

        const panDate = cols[0].textContent ? cols[0].textContent.trim() : '';
        const itemName = cols[1].textContent ? cols[1].textContent.trim() : '';
        const varietyName = cols[2].textContent ? cols[2].textContent.trim() : '';
        const varietyCode = cols[3].textContent ? cols[3].textContent.trim() : '';
        
        const boxQtyStr = cols[4].textContent ? cols[4].textContent.replace(/,/g, '').trim() : '0';
        const boxQty = parseInt(boxQtyStr || '0', 10);
        
        const unitQtyStr = cols[5].textContent ? cols[5].textContent.replace(/,/g, '').trim() : '0';
        const unitQty = parseInt(unitQtyStr || '0', 10);
        
        const grade = cols[6].textContent ? cols[6].textContent.trim() : '';
        
        const bidPriceStr = cols[7].textContent ? cols[7].textContent.replace(/,/g, '').trim() : '0';
        const bidPrice = parseInt(bidPriceStr || '0', 10);
        
        const resultText = cols[9].textContent ? cols[9].textContent.trim() : '';

        if (resultText === '낙찰' || resultText === '선취') {
          parsedData.push({
            panDate: panDate,
            itemName: itemName,
            varietyName: varietyName,
            varietyCode: varietyCode,
            boxQty: boxQty,
            unitQty: unitQty,
            grade: grade,
            bidPrice: bidPrice,
            result: resultText
          });
        }
      }
      return parsedData;
    });

    return auctionData as ScrapedAuction[];

  } finally {
    console.log("5. 브라우저를 닫습니다.");
    await page.waitForTimeout(2000); 
    await browser.close();
  }
};