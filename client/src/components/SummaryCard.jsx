import React, { useState } from 'react';
import './SummaryCard.css';

function SummaryCard({ summary, personalization }) {
  const [expanded, setExpanded] = useState(true);

  if (!summary) return null;

  const reviewCountText = summary.reviewCount ? `신뢰도 상위 리뷰 ${summary.reviewCount}개 기반` : '신뢰도 상위 리뷰 기반';
  const ratingText = summary.avgRating ? ` · 평균 ${summary.avgRating}점` : '';

  return (
    <div className="summary-card">
      <div className="summary-header" onClick={() => setExpanded(!expanded)}>
        <div className="summary-title-row">
          <div className="summary-icon-wrap">🤖</div>
          <div>
            <h2>AI 진단 요약</h2>
            <p>{reviewCountText}{ratingText}</p>
          </div>
        </div>
        <span className="toggle-icon">{expanded ? '▲' : '▼'}</span>
      </div>

      {personalization?.peerInsights && (
        <div className="summary-personalization">
          ✨ <strong>{personalization.peerInsights.topConcerns.join(' · ')}</strong> 관심 유저들과 비슷한 탐색 패턴이에요. 관련 리뷰를 우선 분석했어요.
        </div>
      )}

      {expanded && (
        <div className="summary-body">
          <div className="summary-item pros">
            <div className="summary-item-header">
              <span className="emoji">🟢</span>
              <strong>실사용자가 인정한 장점</strong>
            </div>
            <p>{summary.pros}</p>
          </div>

          <div className="summary-item cons">
            <div className="summary-item-header">
              <span className="emoji">🔴</span>
              <strong>실사용자가 반복 언급한 단점</strong>
            </div>
            <p>{summary.cons}</p>
          </div>

          <div className="summary-item minor">
            <div className="summary-item-header">
              <span className="emoji">🟡</span>
              <strong>감수할 수 있는 아쉬운 점</strong>
            </div>
            <p>{summary.minor}</p>
          </div>

          <p className="summary-disclaimer">
            * 재구매·장기사용 등 신뢰 신호가 강한 리뷰를 우선으로 생성된 요약입니다.
          </p>
        </div>
      )}
    </div>
  );
}

export default SummaryCard;
