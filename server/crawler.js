// crawler.js — 올리브영 건강기능식품 리뷰 크롤러
// Puppeteer로 페이지 세션 확보 후, 브라우저 내부 fetch로 리뷰 API 호출

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const REVIEW_API = 'https://m.oliveyoung.co.kr/review/api/v2/reviews/cursor';

// 로컬(Windows)은 설치된 Chrome, Railway는 nixpacks로 설치된 Chromium 사용
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH ||
  (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : null);

// 브라우저 싱글턴 — 매 요청마다 Chrome 재시작 방지
let browserInstance = null;

async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) return browserInstance;
  const launchOptions = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  };
  if (CHROME_PATH) launchOptions.executablePath = CHROME_PATH;
  browserInstance = await puppeteer.launch(launchOptions);
  return browserInstance;
}

/**
 * 올리브영 URL에서 goodsNo 추출
 * 예: https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000002944
 */
function extractGoodsNo(url) {
  const match = url.match(/goodsNo=([A-Z0-9]+)/i);
  if (!match) throw new Error('올바른 올리브영 상품 URL을 입력해주세요. (예: https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000002944)');
  return match[1];
}

/**
 * Puppeteer로 페이지를 로드해 세션 확보 후,
 * 브라우저 내부 fetch로 리뷰 최대 150개 수집
 */
async function fetchReviewsViaOliveyoung(productUrl, goodsNo) {
  const browser = await getBrowser();
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    console.log(`[Crawler] 올리브영 페이지 로드: ${productUrl}`);
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const pageTitle = await page.title();
    const productName = pageTitle.replace(' | 올리브영', '').trim();

    // 커서 기반 순차 페이지네이션 — 최대 150개 또는 더 이상 없을 때까지
    const reviews = await page.evaluate(async (goodsNo, reviewApi) => {
      const MAX = 150;
      const all = [];
      let cursorId = null;
      let cursorScore = null;

      while (all.length < MAX) {
        const body = {
          goodsNumber: goodsNo,
          size: 20,
          sortType: 'USEFUL_SCORE_DESC',
          reviewType: 'ALL',
        };
        if (cursorId != null) {
          body.cursorId = cursorId;
          body.cursorScore = cursorScore;
        }

        let data;
        try {
          const res = await fetch(reviewApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          data = await res.json();
        } catch { break; }

        const list = data?.data?.goodsReviewList || [];
        if (list.length === 0) break;

        all.push(...list);

        const hasNext = data?.data?.hasNext;
        if (!hasNext) break;

        const nextId = data?.data?.nextCursorId;
        const nextScore = data?.data?.nextCursorScore;
        if (nextId == null || nextId === cursorId) break;
        cursorId = nextId;
        cursorScore = nextScore;
      }

      // 중복 제거
      const seen = new Set();
      return all.filter(r => {
        const id = r.reviewNo || r.reviewId || (r.content + r.createdDateTime);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }, goodsNo, REVIEW_API);

    if (!reviews || reviews.length === 0) return null;

    console.log(`[Crawler] 올리브영 리뷰 ${reviews.length}개 수집 완료`);

    const normalized = reviews.map(r => ({
      rating: r.reviewScore,
      content: r.content || '',
      date: r.createdDateTime || '',
      author: r.profileDto?.memberNickname || '익명',
      isExperienceReview: r.reviewType === 'GIFT',
      isRepurchase: r.isRepurchase || false,
      isLongTermUse: r.isMonthOverReview || r.isMonthUseReview || false,
      isTopReviewer: r.profileDto?.isTopReviewer || false,
      reviewerRank: r.profileDto?.reviewerRank || 9999,
      usefulPoint: r.usefulPoint || 0,
      hasPhoto: r.hasPhoto || false,
    })).filter(r => r.content.length > 10);

    return { reviews: normalized, productName };
  } finally {
    if (page) await page.close();
  }
}

/**
 * 상품 페이지에서 가격·별점·리뷰건수만 빠르게 스크래핑
 */
async function fetchProductMeta(goodsNo) {
  const url = `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${goodsNo}`;
  const browser = await getBrowser();
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });

    // 가격 + 상품명 DOM에서 추출
    const priceData = await page.evaluate(() => {
      const num = el => el ? parseInt(el.textContent.replace(/[^0-9]/g, ''), 10) || null : null;
      const productName = document.title.replace(' | 올리브영', '').trim();
      return {
        price: num(document.querySelector('[class*="price__"]')),
        originalPrice: num(document.querySelector('[class*="price-before"]')),
        productName,
      };
    });

    // 리뷰 API에서 별점(평균)·건수 추출
    const reviewData = await page.evaluate(async (goodsNo, reviewApi) => {
      try {
        const res = await fetch(reviewApi, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goodsNumber: goodsNo, size: 20, sortType: 'USEFUL_SCORE_DESC', reviewType: 'ALL' }),
        });
        const data = await res.json();
        const list = data?.data?.goodsReviewList || [];
        const hasNext = data?.data?.hasNext ?? false;

        const avgRating = list.length > 0
          ? Math.round(list.reduce((s, r) => s + (r.reviewScore || 0), 0) / list.length * 10) / 10
          : null;

        // hasNext가 false면 이 페이지가 전부, true면 최소 20+개
        const count = hasNext ? null : list.length;

        return { rating: avgRating, reviewCount: count };
      } catch { return {}; }
    }, goodsNo, REVIEW_API);

    const meta = { ...priceData, ...reviewData };

    return { goodsNo, ...meta };
  } catch (e) {
    if (!browserInstance?.isConnected()) browserInstance = null;
    return { goodsNo };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

async function crawlReviews(productUrl) {
  const goodsNo = extractGoodsNo(productUrl);

  console.log(`[Crawler] goodsNo: ${goodsNo} - 올리브영 크롤링 시도...`);
  const result = await fetchReviewsViaOliveyoung(productUrl, goodsNo);

  if (!result || result.reviews.length === 0) {
    throw new Error('리뷰를 가져오지 못했습니다. 올리브영 상품 URL을 확인해주세요.');
  }

  return { reviews: result.reviews, source: 'oliveyoung', productName: result.productName };
}

module.exports = { crawlReviews, fetchProductMeta };
