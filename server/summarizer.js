// summarizer.js
// 신뢰도 상위 N개 리뷰 기반 ChatGPT 요약 생성

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 신뢰도 필터링된 리뷰 → ChatGPT 진단 요약
 * 
 * 쿠팡/11번가 AI 요약과의 차별점:
 * - 무작위 리뷰가 아닌 신뢰도 스코어링 후 상위 N개만 인풋으로 사용
 * - 체험단, 바이럴 리뷰가 제거된 상태에서 요약
 */
async function generateSummary(reviews, productName = '해당 상품') {
  if (!reviews || reviews.length === 0) {
    return {
      pros: '리뷰 데이터가 부족합니다.',
      cons: '리뷰 데이터가 부족합니다.',
      minor: '리뷰 데이터가 부족합니다.',
    };
  }

  const reviewTexts = reviews
    .map((r, i) => `[리뷰${i + 1}] 별점:${r.rating}점 | ${r.content}`)
    .join('\n');

  const prompt = `아래는 "${productName}"에 대한 실구매자 리뷰입니다. (체험단, 바이럴 리뷰는 이미 필터링된 상태입니다)

${reviewTexts}

위 리뷰를 분석하여 아래 JSON 형식으로만 응답해주세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "pros": "실사용자들이 공통적으로 인정한 장점 (2~3문장, 구체적으로)",
  "cons": "반복적으로 언급된 단점 또는 주의사항 (2~3문장, 솔직하게)",
  "minor": "치명적이지는 않지만 아쉬운 점 (1~2문장)",
  "reviewCount": 리뷰 분석에 사용된 개수(숫자),
  "avgRating": 평균 별점(소수점 1자리 숫자)
}

작성 원칙:
- 없는 정보는 지어내지 말 것
- 단점이 없으면 "리뷰에서 뚜렷한 단점이 언급되지 않았습니다"라고 작성
- 마케팅 문구 사용 금지
- 실제 리뷰에 등장한 표현을 바탕으로 작성`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content.trim();
    
    // JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON 파싱 실패');
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('[Summarizer] GPT 오류:', error.message);
    
    // GPT 실패 시 간단한 로컬 요약
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const negativeReviews = reviews.filter(r => r.rating <= 3);
    const positiveReviews = reviews.filter(r => r.rating >= 4);
    
    return {
      pros: positiveReviews.length > 0 
        ? `${positiveReviews.length}명의 실구매자가 긍정적인 평가를 남겼습니다.`
        : '긍정적인 리뷰를 찾기 어렵습니다.',
      cons: negativeReviews.length > 0
        ? `${negativeReviews.length}명이 아쉬운 점을 언급했습니다. (별점 3점 이하)`
        : '리뷰에서 뚜렷한 단점이 언급되지 않았습니다.',
      minor: '개인차가 있을 수 있으니 참고 부탁드립니다.',
      reviewCount: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
    };
  }
}

module.exports = { generateSummary };
