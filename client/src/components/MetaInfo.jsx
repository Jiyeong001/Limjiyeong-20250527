import React from 'react';
import './MetaInfo.css';

function MetaInfo({ meta }) {
  if (!meta) return null;

  return (
    <div className="meta-info">
      <div className="meta-card">
        <div className="meta-label">수집된 리뷰</div>
        <div className="meta-value">{meta.totalReviews}<span style={{fontSize:'14px',fontWeight:'600'}}> 개</span></div>
      </div>
      <div className="meta-card">
        <div className="meta-label">낮은 신뢰도 리뷰</div>
        <div className="meta-value highlight">{meta.experienceReviews}<span style={{fontSize:'14px',fontWeight:'600'}}> 개</span></div>
        <div className="meta-sub">신뢰도 하위 처리</div>
      </div>
      <div className="meta-card">
        <div className="meta-label">평균 별점</div>
        <div className="meta-value">⭐ {meta.avgRating}</div>
      </div>
    </div>
  );
}

export default MetaInfo;
