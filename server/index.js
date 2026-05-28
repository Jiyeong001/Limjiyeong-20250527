require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { crawlReviews } = require('./crawler');
const { calculateTrustScores, sortByTrust, getTopTrustReviews } = require('./trustScore');
const { generateSummary } = require('./summarizer');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ─── API 라우트 ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/analyze', async (req, res) => {
  const { url, productName } = req.body;

  if (!url) return res.status(400).json({ error: '상품 URL을 입력해주세요.' });
  if (!url.includes('oliveyoung.co.kr')) {
    return res.status(400).json({ error: '올리브영(oliveyoung.co.kr) 상품 URL만 지원합니다. (예: https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000002944)' });
  }

  try {
    console.log(`[Server] 분석 시작: ${url}`);

    const { reviews: rawReviews, source, productName: crawledName } = await crawlReviews(url);
    const scoredReviews = calculateTrustScores(rawReviews);

    const resolvedName = productName || crawledName || '상품';
    const topReviews = getTopTrustReviews(scoredReviews, 30);
    const summary = await generateSummary(topReviews, resolvedName);

    const avgRating = rawReviews.reduce((s, r) => s + r.rating, 0) / rawReviews.length;

    res.json({
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
