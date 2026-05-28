require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { crawlReviews, fetchProductMeta } = require('./crawler');
const { calculateTrustScores, sortByTrust, getTopTrustReviews } = require('./trustScore');
const { generateSummary } = require('./summarizer');

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
  if (!sessions.has(sessionId)) sessions.set(sessionId, { categories: [], productCount: 0 });
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
  const { url, productName } = req.body;

  if (!url) return res.status(400).json({ error: '상품 URL을 입력해주세요.' });
  if (!url.includes('oliveyoung.co.kr')) {
    return res.status(400).json({ error: '올리브영(oliveyoung.co.kr) 상품 URL만 지원합니다. (예: https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000002944)' });
  }

  try {
    const goodsNoMatch = url.match(/goodsNo=([A-Z0-9]+)/i);
    const goodsNo = goodsNoMatch?.[1];

    if (goodsNo) {
      const cached = await getCached(goodsNo);
      if (cached) {
        console.log(`[Server] 캐시 반환: ${goodsNo}`);
        return res.json({ ...cached, meta: { ...cached.meta, fromCache: true } });
      }
    }

    console.log(`[Server] 분석 시작: ${url}`);

    const { reviews: rawReviews, source, productName: crawledName } = await crawlReviews(url);
    const scoredReviews = calculateTrustScores(rawReviews);

    const resolvedName = productName || crawledName || '상품';
    const topReviews = getTopTrustReviews(scoredReviews, 30);
    const summary = await generateSummary(topReviews, resolvedName);

    const avgRating = rawReviews.reduce((s, r) => s + r.rating, 0) / rawReviews.length;

    const result = {
      meta: {
        totalReviews: rawReviews.length,
        experienceReviews: rawReviews.filter(r => r.isExperienceReview).length,
        avgRating: Math.round(avgRating * 10) / 10,
        dataSource: source,
        productName: resolvedName,
        analyzedAt: new Date().toISOString(),
      },
      reviews: {
        recommended: rawReviews,
        latest: [...rawReviews].sort((a, b) => new Date(b.date) - new Date(a.date)),
        trust: sortByTrust(scoredReviews),
      },
      summary,
    };

    if (goodsNo) await setCache(goodsNo, result);

    res.json(result);
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
