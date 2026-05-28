require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { crawlReviews, fetchProductMeta } = require('./crawler');
const { calculateTrustScores, sortByTrust, getTopTrustReviews } = require('./trustScore');
const { generateSummary } = require('./summarizer');
const { assignMockUser, findPeers, derivePeerInsights } = require('./similarity');

const app = express();
const PORT = process.env.PORT || 4000;

const CACHE_DIR = path.join(__dirname, 'cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function getCached(goodsNo) {
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, `${goodsNo}.json`), 'utf8');
    const { cachedAt, data } = JSON.parse(raw);
    if (Date.now() - new Date(cachedAt).getTime() < CACHE_TTL_MS) return data;
  } catch {}
  return null;
}

async function setCache(goodsNo, data) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(
      path.join(CACHE_DIR, `${goodsNo}.json`),
      JSON.stringify({ cachedAt: new Date().toISOString(), data })
    );
  } catch {}
}

app.use(cors());
app.use(express.json());

// ─── 세션 스토어 (in-memory) ──────────────────────────────
const sessions = new Map(); // sessionId → { categories: string[], productCount: number }

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    const { MOCK_USERS } = require('./mockUsers');
    const assignedUser = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
    sessions.set(sessionId, { assignedUser, clickHistory: [], productCount: 0 });
  }
  return sessions.get(sessionId);
}

function getDominantCategory(categories) {
  if (categories.length === 0) return null;
  const counts = {};
  categories.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ─── API 라우트 ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/product-metas', async (req, res) => {
  const { goodsNos } = req.body;
  if (!Array.isArray(goodsNos) || goodsNos.length === 0)
    return res.status(400).json({ error: 'goodsNos array required' });

  const BATCH = 3;
  const results = [];
  for (let i = 0; i < goodsNos.length; i += BATCH) {
    const batch = goodsNos.slice(i, i + BATCH);
    const metas = await Promise.all(batch.map(fetchProductMeta));
    results.push(...metas);
  }
  res.json(results);
});

app.post('/api/analyze', async (req, res) => {
  const { url, productName, sessionId, category } = req.body;

  if (!url) return res.status(400).json({ error: '상품 URL을 입력해주세요.' });
  if (!url.includes('oliveyoung.co.kr')) {
    return res.status(400).json({ error: '올리브영(oliveyoung.co.kr) 상품 URL만 지원합니다. (예: https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000002944)' });
  }

  try {
    const goodsNoMatch = url.match(/goodsNo=([A-Z0-9]+)/i);
    const goodsNo = goodsNoMatch?.[1];

    // 세션 업데이트: 클릭 히스토리 누적, peer group은 고정된 페르소나 기준
    let personalization = null;
    if (sessionId && category) {
      const session = getSession(sessionId);

      // 두 번째 상품부터 개인화 표시
      if (session.productCount >= 1 && session.assignedUser) {
        const peers = findPeers(session.assignedUser);
        const peerInsights = derivePeerInsights(peers);
        personalization = { peerInsights };
      }

      // 클릭 히스토리 따로 누적 (페르소나 변경 없음)
      session.clickHistory.push({ category, goodsNo: url.match(/goodsNo=([A-Z0-9]+)/i)?.[1] });
      session.productCount += 1;
    }

    // 리뷰 캐시 확인 (요약은 캐시하지 않음 — 유저마다 다르게 생성)
    let reviewCache = null;
    if (goodsNo) reviewCache = await getCached(goodsNo);

    let rawReviews, scoredReviews, resolvedName, topReviews, meta;

    if (reviewCache) {
      console.log(`[Server] 리뷰 캐시 반환: ${goodsNo}`);
      rawReviews = reviewCache.rawReviews;
      scoredReviews = reviewCache.scoredReviews;
      resolvedName = reviewCache.meta.productName;
      topReviews = getTopTrustReviews(scoredReviews, 30);
      meta = { ...reviewCache.meta, fromCache: true };
    } else {
      console.log(`[Server] 분석 시작: ${url}`);
      const crawled = await crawlReviews(url);
      rawReviews = crawled.reviews;
      const source = crawled.source;
      const crawledName = crawled.productName;
      scoredReviews = calculateTrustScores(rawReviews);
      resolvedName = productName || crawledName || '상품';
      topReviews = getTopTrustReviews(scoredReviews, 30);
      const avgRating = rawReviews.reduce((s, r) => s + r.rating, 0) / rawReviews.length;
      meta = {
        totalReviews: rawReviews.length,
        experienceReviews: rawReviews.filter(r => r.isExperienceReview).length,
        avgRating: Math.round(avgRating * 10) / 10,
        dataSource: source,
        productName: resolvedName,
        analyzedAt: new Date().toISOString(),
      };
      if (goodsNo) await setCache(goodsNo, { rawReviews, scoredReviews, meta });
    }

    // 요약은 매번 fresh 생성 (유저 개인화 반영)
    const summary = await generateSummary(topReviews, resolvedName, null, personalization?.peerInsights);

    res.json({
      meta,
      reviews: {
        recommended: rawReviews,
        latest: [...rawReviews].sort((a, b) => new Date(b.date) - new Date(a.date)),
        trust: sortByTrust(scoredReviews),
      },
      summary,
      personalization,
    });
  } catch (error) {
    console.error('[Server] 오류:', error.message);
    res.status(500).json({ error: error.message || '분석 중 오류가 발생했습니다.' });
  }
});

// ─── React 빌드 파일 서빙 ─────────────────────────────────
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ http://localhost:${PORT}`);
});
