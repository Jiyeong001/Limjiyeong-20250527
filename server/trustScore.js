// trustScore.js — 리뷰 신뢰도 스코어링

const NEGATIVE_KEYWORDS = [
  '아쉽', '단점', '불편', '별로', '그냥', '모르겠', '효과없',
  '실망', '작아', '커서', '부담', '안 맞', '개인차',
  '기대이하', '애매', '아직', '확신', '속이', '쓰렸',
  '두드러기', '부작용', '환불', '플라시보',
];

const VIRAL_PATTERNS = [
  '강추강추', '최고최고', '좋아요좋아요', '완전강추', '강력추천',
  '무조건사세요', '후회없어요', '인생템', '필수템', '완전좋아',
];

function analyzeTextTrust(content) {
  let score = 0;

  if (content.length >= 100) score += 0.2;
  else if (content.length >= 50) score += 0.1;
  else score -= 0.2;

  if (NEGATIVE_KEYWORDS.some(kw => content.includes(kw))) score += 0.25;
  if (VIRAL_PATTERNS.some(kw => content.includes(kw))) score -= 0.3;

  const exclamationRatio = (content.match(/[!！]/g) || []).length / content.length;
  if (exclamationRatio > 0.1) score -= 0.15;

  return score;
}

function analyzeDateTrust(date, allDates) {
  if (!date) return 0;

  // "2026.05.24" 또는 "2025-01-10" 형식 모두 처리
  const normalized = date.replace(/\./g, '-');
  const sameDay = allDates.filter(d => d === date).length;
  const concentrationPenalty = Math.min(0.3, (sameDay - 1) * 0.05);

  const reviewDate = new Date(normalized);
  const now = new Date();
  const daysPassed = (now - reviewDate) / (1000 * 60 * 60 * 24);

  let ageBonusScore = 0;
  if (daysPassed > 180) ageBonusScore = 0.2;
  else if (daysPassed > 60) ageBonusScore = 0.1;
  else if (daysPassed > 30) ageBonusScore = 0.05;

  return ageBonusScore - concentrationPenalty;
}

/**
 * 올리브영 실데이터 기반 유저 신뢰도
 * - isRepurchase: 재구매 = 진성 유저 신호
 * - isLongTermUse: 장기 사용 = 신뢰도 높음
 * - isTopReviewer + reviewerRank: 올리브영 공식 우수 리뷰어
 * - usefulPoint: 다른 유저들이 '도움이 돼요'를 누른 수
 */
function analyzeUserTrust(review) {
  let score = 0;

  // 재구매 이력 (가장 강력한 진성 신호)
  if (review.isRepurchase) score += 0.2;

  // 장기 사용 리뷰
  if (review.isLongTermUse) score += 0.15;

  // 올리브영 공식 우수 리뷰어
  if (review.isTopReviewer) {
    const rank = review.reviewerRank || 9999;
    if (rank <= 100) score += 0.25;
    else if (rank <= 500) score += 0.15;
    else score += 0.1;
  }

  // 도움이 돼요 수 (커뮤니티 검증)
  if (review.usefulPoint >= 3000) score += 0.15;
  else if (review.usefulPoint >= 1000) score += 0.1;
  else if (review.usefulPoint >= 300) score += 0.05;

  // 사진 리뷰 (조작 난이도 높음)
  if (review.hasPhoto) score += 0.05;

  return score;
}

function calculateTrustScores(reviews) {
  const allDates = reviews.map(r => r.date);

  return reviews.map(review => {
    let score = 0.5;

    // 체험단/기증 리뷰 페널티
    if (review.isExperienceReview) score -= 0.4;

    score += analyzeTextTrust(review.content);
    score += analyzeDateTrust(review.date, allDates);
    score += analyzeUserTrust(review);

    score = Math.max(0, Math.min(1, score));

    return { ...review, trustScore: Math.round(score * 100) / 100 };
  });
}

function sortByTrust(reviews) {
  return [...reviews].sort((a, b) => b.trustScore - a.trustScore);
}

function getTopTrustReviews(reviews, n = 15) {
  return sortByTrust(reviews).slice(0, n);
}

module.exports = { calculateTrustScores, sortByTrust, getTopTrustReviews };
