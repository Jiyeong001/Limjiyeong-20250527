import React, { useState } from 'react';
import './SummaryCard.css';

function SummaryCard({ summary }) {
  const [expanded, setExpanded] = useState(true);

  if (!summary) return null;

  return (
    <div className="summary-card">
      <div className="summary-header" onClick={() => setExpanded(!expanded)}>
        <div className="summary-title-row">
          <div className="summary-icon-wrap">🤖</div>
          <div>
            <h2>AI 진단 요약</h2>
            <p>신뢰도 상위 리뷰 {summary.reviewCount}개 기반 · 평균 {summary.avgRating}점</p>
          </div>
        </div>
        <span className="toggle-icon">{expanded ? '▲' : '▼'}</span>
      </div>

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
            * 체험단·바이럴 리뷰를 제거한 신뢰도 높은 리뷰만을 기반으로 생성된 요약입니다.
          </p>
        </div>
      )}
    </div>
  );
}

export default SummaryCard;
