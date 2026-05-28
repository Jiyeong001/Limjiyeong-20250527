import React from 'react';
import ReviewItem from './ReviewItem';
import './ReviewList.css';

function ReviewList({ reviews, showTrustScore }) {
  if (!reviews || reviews.length === 0) {
    return <p className="no-reviews">표시할 리뷰가 없습니다.</p>;
  }

  return (
    <div className="review-list">
      {reviews.map((review, index) => (
        <ReviewItem
          key={index}
          review={review}
          showTrustScore={showTrustScore}
          rank={showTrustScore ? index + 1 : null}
        />
      ))}
    </div>
  );
}

export default ReviewList;
