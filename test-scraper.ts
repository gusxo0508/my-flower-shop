// test-scraper.ts
import { scrapeAtAuction } from './lib/scraper';
import * as dotenv from 'dotenv';

// .env.local 파일에 적은 비밀번호들을 읽어옵니다.
dotenv.config({ path: '.env.local' });

async function runTest() {
  console.log("1. 테스트 시작 버튼을 눌렀습니다.");
  dotenv.config({ path: '.env.local' });
  console.log("2. 설정 파일을 읽어왔습니다.");
  
  const targetDate = "20260325"; 
  console.log(`3. ${targetDate} 날짜로 조회를 시도합니다...`);
  
  try {
    const data = await scrapeAtAuction(targetDate);
    
    console.log(`✅ 조회 성공! 총 ${data.length}개의 품목을 찾았습니다.`);
    console.table(data); // 표 형태로 결과를 보여줍니다.
  } catch (error) {
    console.error("❌ 에러 발생:", error);
  }
}

runTest();