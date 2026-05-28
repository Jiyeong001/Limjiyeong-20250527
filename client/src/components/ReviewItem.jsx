import React from 'react';
import './ReviewItem.css';

function StarRating({ rating }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? 'star filled' : 'star'}>★</span>
      ))}
    </span>
  );
}

function TrustBadge({ score }) {
  if (score === undefined) return null;
  const pct = Math.round(score * 100);
  const cls = score >= 0.65 ? 'trust-high' : score >= 0.4 ? 'trust-mid' : 'trust-low';
  return <span className={`trust-badge ${cls}`}>신뢰도 {pct}%</span>;
}

function ReviewItem({ review, showTrustScore, rank }) {
  return (
    <div className={`review-item ${review.isExperienceReview ? 'experience' : ''}`}>
      <div className="review-top">
        <div className="review-left">
          {rank && <span className="rank">#{rank}</span>}
          <StarRating rating={review.rating} />
          {review.isExperienceReview && (
            <span className="experience-badge">체험단</span>
          )}
        </div>
        <div className="review-right">
          {showTrustScore && <TrustBadge score={review.trustScore} />}
          <span className="review-date">{review.date}</span>
        </div>
      </div>

      <p className="review-content">{review.content}</p>

      <div className="review-footer">
        <span className="review-author">{review.author}</span>
        {review.isRepurchase && (
          <span className="review-tag tag-repurchase">재구매</span>
        )}
        {review.isLongTermUse && (
          <span className="review-tag tag-longterm">장기사용</span>
        )}
        {review.isTopReviewer && (
          <span className="review-tag tag-top-reviewer">우수리뷰어</span>
        )}
      </div>
    </div>
  );
}

export default ReviewItem;
