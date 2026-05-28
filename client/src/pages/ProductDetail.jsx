import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getImageUrl } from '../data/products';
import SummaryCard from '../components/SummaryCard';
import ReviewList from '../components/ReviewList';
import MetaInfo from '../components/MetaInfo';
import './ProductDetail.css';

function ProductDetail({ product, onBack }) {
  const [imgError, setImgError] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('trust');
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${product.goodsNo}`;
      const res = await axios.post('/api/analyze', { url, productName: product.name });
      setReviewData(res.data);
      setActiveTab('trust');
    } catch (e) {
      setError(e.response?.data?.error || '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleAnalyze();
  }, [product.goodsNo]);

  const activeReviews = reviewData?.reviews?.[activeTab] || [];

  return (
    <div className="detail-page">
      {/* Back nav */}
      <div className="detail-nav">
        <div className="detail-nav-inner">
          <button className="back-btn" onClick={onBack}>
            ← 목록으로
          </button>
          <span className="breadcrumb">{product.category} / {product.name}</span>
        </div>
      </div>

      <div className="detail-inner">
        {/* 상품 정보 섹션 */}
        <div className="detail-top">
          {/* 이미지 */}
          <div className="detail-img-wrap">
            {!imgError ? (
              <img
                src={getImageUrl(product.goodsNo)}
                alt={product.name}
                className="detail-img"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="detail-img-fallback"><span>💊</span></div>
            )}
          </div>

          {/* 정보 */}
          <div className="detail-info">
            <p className="detail-brand">{product.brand}</p>
            <h1 className="detail-name">{product.name}</h1>

            <div className="detail-rating-row">
              <span className="stars-detail">{'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}</span>
              <span className="detail-rating">{product.rating}</span>
              <span className="detail-review-count">리뷰 {product.reviewCount.toLocaleString()}개</span>
            </div>

            <div className="detail-price-box">
              <div className="detail-price-row">
                <span className="detail-discount">{discount}%</span>
                <span className="detail-price">{product.price.toLocaleString()}원</span>
              </div>
              <p className="detail-original">{product.originalPrice.toLocaleString()}원</p>
            </div>

            <p className="detail-description">{product.description}</p>

            <div className="detail-tags">
              {product.tags.map(tag => (
                <span key={tag} className="detail-tag">{tag}</span>
              ))}
            </div>

            <div className="detail-actions">
              <button className="btn-cart">장바구니 담기</button>
              <button className="btn-buy">바로 구매하기</button>
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div className="detail-divider" />

        {/* 리뷰 분석 섹션 */}
        <div className="review-analysis-section">
          <div className="review-analysis-header">
            <div>
              <h2 className="review-analysis-title">
                <span className="ai-badge">AI</span> 리뷰 신뢰도 진단
              </h2>
              <p className="review-analysis-sub">
                체험단·바이럴을 제거한 진성 구매자 리뷰만 분석합니다
              </p>
            </div>
          </div>

          {/* 로딩 */}
          {loading && (
            <div className="review-loading">
              <div className="loading-spinner" />
              <p className="loading-text">리뷰 분석 중...</p>
              <p className="loading-sub">올리브영 리뷰 수집 및 AI 요약 생성 중 (30초 내외)</p>
            </div>
          )}

          {/* 에러 */}
          {error && (
            <div className="review-error">⚠️ {error}</div>
          )}

          {/* 결과 */}
          {reviewData && !loading && (
            <div className="review-results">
              <MetaInfo meta={reviewData.meta} />

              <SummaryCard summary={reviewData.summary} />

              <div className="review-list-section">
                <div className="review-list-header">
                  <h3>전체 리뷰</h3>
                  <div className="tabs">
                    <button className={`tab ${activeTab === 'trust' ? 'active' : ''}`} onClick={() => setActiveTab('trust')}>
                      ⭐ 신뢰도순
                    </button>
                    <button className={`tab ${activeTab === 'latest' ? 'active' : ''}`} onClick={() => setActiveTab('latest')}>
                      최신순
                    </button>
                    <button className={`tab ${activeTab === 'recommended' ? 'active' : ''}`} onClick={() => setActiveTab('recommended')}>
                      추천순
                    </button>
                  </div>
                </div>
                {activeTab === 'trust' && (
                  <p className="tab-desc">체험단·바이럴 리뷰를 걸러낸 신뢰도 높은 리뷰를 먼저 보여드려요.</p>
                )}
                <ReviewList reviews={activeReviews} showTrustScore={activeTab === 'trust'} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
