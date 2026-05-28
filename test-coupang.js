const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function testOliveyoung() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

  // 리뷰 API 요청 전체 URL 캡처
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('m.oliveyoung.co.kr/review')) {
      console.log('[요청] METHOD:', req.method());
      console.log('[요청] URL:', url);
      console.log('[요청] HEADERS:', JSON.stringify(req.headers()).slice(0, 300));
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('m.oliveyoung.co.kr/review/api/v2/reviews/cursor')) {
      try {
        const data = await res.json();
        console.log('\n[cursor API 응답]');
        console.log(JSON.stringify(data).slice(0, 1000));
      } catch (e) {}
    }
  });

  const testUrl = 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000168836';
  await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('제목:', await page.title());

  // 리뷰 탭 클릭
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button'))
      .find(el => el.textContent.includes('리뷰'));
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 5000));

  await browser.close();
}

testOliveyoung().catch(console.error);
