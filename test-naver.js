// 올리브영 건강기능식품 상품으로 cursor API 구조 파악
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function testOliveyoungHealth() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

  let cursorBody = null;
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url.includes('reviews/cursor')) {
      cursorBody = req.postData();
      console.log('[cursor 요청 body]', cursorBody);
    }
    req.continue();
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('reviews/cursor')) {
      const data = await res.json().catch(() => null);
      if (data?.data?.goodsReviewList) {
        const reviews = data.data.goodsReviewList;
        console.log('\n=== cursor 응답 ===');
        console.log('리뷰 수:', reviews.length);
        console.log('nextCursor:', data.data.nextCursor);
        console.log('hasNext:', data.data.hasNext);
        console.log('\n첫 리뷰 샘플:');
        console.log(JSON.stringify(reviews[0], null, 2));
      }
    }
    if (url.includes('reviews/stats')) {
      const data = await res.json().catch(() => null);
      if (data?.data) {
        console.log('\n=== stats ===');
        console.log('총 리뷰:', data.data.reviewCount);
        console.log('평균 별점:', data.data.ratingDistribution?.averageRating);
      }
    }
  });

  // 고려은단 비타민C1000 (리뷰 많은 건강기능식품)
  const testUrl = 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000002944';
  console.log('건강기능식품 상품 접근:', testUrl);

  await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('제목:', await page.title());

  // 리뷰 탭 클릭
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(el => el.textContent.includes('리뷰'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 5000));

  await browser.close();
}

testOliveyoungHealth().catch(console.error);
