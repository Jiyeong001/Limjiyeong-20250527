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
 * 브라우저 내부 fetch로 리뷰 3페이지(30개) 수집
 */
async function fetchReviewsViaOliveyoung(productUrl, goodsNo) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    console.log(`[Crawler] 올리브영 페이지 로드: ${productUrl}`);
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const pageTitle = await page.title();
    const productName = pageTitle.replace(' | 올리브영', '').trim();

    // 5페이지를 병렬로 동시 fetch
    const reviews = await page.evaluate(async (goodsNo, reviewApi) => {
      const PAGE_COUNT = 5;
      const requests = Array.from({ length: PAGE_COUNT }, (_, p) =>
        fetch(reviewApi, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goodsNumber: goodsNo,
            size: 20,
            sortType: 'USEFUL_SCORE_DESC',
            reviewType: 'ALL',
            page: p,
          }),
        })
          .then(r => r.json())
          .then(data => data?.data?.goodsReviewList || [])
          .catch(() => [])
      );

      const results = await Promise.all(requests);
      const flat = results.flat();

      // 중복 제거
      const seen = new Set();
      return flat.filter(r => {
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
    await page.close();
  }
}

/**
 * mock 데이터 — 올리브영 건강기능식품 패턴 반영
 */
function getMockReviews(goodsNo) {
  return [
    { rating: 5, content: "3개월째 꾸준히 먹고 있어요. 확실히 피로감이 줄어든 것 같고 피부도 조금 좋아진 것 같아요. 올리브영 건강식품 중에 제일 재구매 많이 한 제품!", date: "2025-01-10", author: "건강맘김씨", isExperienceReview: false, isRepurchase: true, isLongTermUse: true, isTopReviewer: false, reviewerRank: 523, usefulPoint: 1820, hasPhoto: false },
    { rating: 4, content: "비타민C 따로 먹기 귀찮아서 샀는데 알약이 좀 큰 편이에요. 그래도 효과는 있는 것 같고 가격 대비 용량이 충분해서 만족합니다.", date: "2024-11-05", author: "꼼꼼리뷰", isExperienceReview: false, isRepurchase: false, isLongTermUse: false, isTopReviewer: true, reviewerRank: 134, usefulPoint: 2340, hasPhoto: true },
    { rating: 5, content: "진짜 최고입니다!! 강력 추천!! 피부 좋아졌어요!!", date: "2025-01-15", author: "홍보계정", isExperienceReview: true, isRepurchase: false, isLongTermUse: false, isTopReviewer: false, reviewerRank: 9999, usefulPoint: 10, hasPhoto: false },
    { rating: 3, content: "한 달 먹었는데 솔직히 효과를 잘 모르겠어요. 개인차가 있는 건지... 속이 약간 불편한 날도 있었고요. 두 달은 더 먹어봐야 알 것 같아요.", date: "2024-10-20", author: "솔직후기어", isExperienceReview: false, isRepurchase: false, isLongTermUse: false, isTopReviewer: false, reviewerRank: 1201, usefulPoint: 980, hasPhoto: false },
    { rating: 2, content: "공복에 먹었더니 속이 너무 쓰렸어요. 식후에 먹으니 괜찮긴 한데 불편했습니다. 용량도 기대보다 적은 느낌.", date: "2024-09-11", author: "아쉬웠던구매", isExperienceReview: false, isRepurchase: false, isLongTermUse: false, isTopReviewer: false, reviewerRank: 3402, usefulPoint: 450, hasPhoto: false },
    { rating: 5, content: "4번째 구매입니다. 다른 비타민C 제품도 써봤는데 이게 제일 속 편하고 잘 맞아요. 가격도 합리적이고 올리브영 앱에서 할인할 때 사두면 더 좋아요.", date: "2025-01-02", author: "단골단골", isExperienceReview: false, isRepurchase: true, isLongTermUse: true, isTopReviewer: true, reviewerRank: 88, usefulPoint: 3120, hasPhoto: false },
    { rating: 4, content: "면역력 챙기려고 구매했어요. 확실히 요즘 덜 아픈 것 같기도 하고 플라시보 효과인지 모르겠지만 기분은 좋아요ㅎ 좀 더 먹어봐야 판단할 것 같아요.", date: "2024-12-14", author: "건강챙기는30대", isExperienceReview: false, isRepurchase: false, isLongTermUse: false, isTopReviewer: false, reviewerRank: 742, usefulPoint: 860, hasPhoto: false },
    { rating: 5, content: "좋아요좋아요!! 피부가 완전 좋아졌어요 강추강추!!", date: "2025-01-13", author: "체험단계정A", isExperienceReview: true, isRepurchase: false, isLongTermUse: false, isTopReviewer: false, reviewerRank: 9999, usefulPoint: 5, hasPhoto: false },
    { rating: 3, content: "브랜드 믿고 샀는데 그냥 평범한 것 같아요. 비싼 걸 먹어야 하나 고민 중입니다. 일단 이 통 다 먹어보고 효과 판단하려고요.", date: "2024-08-29", author: "고민중인구매자", isExperienceReview: false, isRepurchase: false, isLongTermUse: false, isTopReviewer: false, reviewerRank: 2113, usefulPoint: 620, hasPhoto: false },
    { rating: 4, content: "두 달째 먹고 있어요. 피부 트러블이 조금 줄어든 것 같아서 계속 먹을 예정. 알약 크기가 좀 커서 물 많이 마셔야 넘어가는 게 단점.", date: "2024-11-30", author: "피부개선중", isExperienceReview: false, isRepurchase: true, isLongTermUse: true, isTopReviewer: false, reviewerRank: 891, usefulPoint: 1540, hasPhoto: true },
    { rating: 1, content: "먹고 두드러기가 생겼어요. 저한테는 완전 안 맞는 제품인 것 같습니다. 환불도 안 돼서 너무 속상해요. 알레르기 있으신 분들 주의하세요.", date: "2024-10-07", author: "부작용후기", isExperienceReview: false, isRepurchase: false, isLongTermUse: false, isTopReviewer: false, reviewerRank: 4521, usefulPoint: 2890, hasPhoto: false },
    { rating: 5, content: "매달 정기 구매하고 있어요. 가격, 품질, 용량 모두 만족스럽고 올리브영 건강기능식품 중 베스트라고 생각해요. 가족들도 같이 먹고 있습니다.", date: "2024-12-25", author: "가족건강지킴이", isExperienceReview: false, isRepurchase: true, isLongTermUse: true, isTopReviewer: true, reviewerRank: 201, usefulPoint: 4200, hasPhoto: false },
  ].map(r => ({ ...r, goodsNo }));
}

/**
 * 메인 크롤링 함수
 * 올리브영 Puppeteer → mock 순으로 시도
 */
async function crawlReviews(productUrl) {
  const goodsNo = extractGoodsNo(productUrl);

  console.log(`[Crawler] goodsNo: ${goodsNo} - 올리브영 크롤링 시도...`);
  try {
    const result = await fetchReviewsViaOliveyoung(productUrl, goodsNo);
    if (result && result.reviews.length > 0) {
      return { reviews: result.reviews, source: 'oliveyoung', productName: result.productName };
    }
  } catch (e) {
    console.log(`[Crawler] 올리브영 크롤링 실패: ${e.message}`);
  }

  console.log(`[Crawler] mock 데이터 사용`);
  return { reviews: getMockReviews(goodsNo), source: 'mock', productName: null };
}

module.exports = { crawlReviews, extractGoodsNo };
