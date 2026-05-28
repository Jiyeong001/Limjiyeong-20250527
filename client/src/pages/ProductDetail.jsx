import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getImageUrl } from '../data/products';
import SummaryCard from '../components/SummaryCard';
import ReviewList from '../components/ReviewList';
import MetaInfo from '../components/MetaInfo';
import './ProductDetail.css';

function ProductDetail({ product, onBack, sessionId }) {
  const [imgError, setImgError] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('trust');
  const [liveMeta, setLiveMeta] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    axios.post('/api/product-metas', { goodsNos: [product.goodsNo] })
      .then(res => { if (res.data?.[0]) setLiveMeta(res.data[0]); })
      .catch(() => {});
  }, [product.goodsNo]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${product.goodsNo}`;
      const res = await axios.post('/api/analyze', {
        url,
        productName: product.name,
        sessionId,
        category: product.category,
      });
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

  const price = liveMeta?.price;
  const originalPrice = liveMeta?.originalPrice;
  const rating = reviewData?.meta?.avgRating ?? liveMeta?.rating;
  const discount = price && originalPrice ? Math.round((1 - price / originalPrice) * 100) : null;

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
            <h1 className="detail-name">{reviewData?.meta?.productName || product.name}</h1>

            {rating != null && (
              <div className="detail-rating-row">
                <span className="stars-detail">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
                <span className="detail-rating">{rating}</span>
                {reviewData?.meta?.totalReviews && (
                  <span className="detail-review-count">리뷰 {reviewData.meta.totalReviews.toLocaleString()}개 분석</span>
                )}
              </div>
            )}

            {price && (
              <div className="detail-price-box">
                <div className="detail-price-row">
                  {discount > 0 && <span className="detail-discount">{discount}%</span>}
                  <span className="detail-price">{price.toLocaleString()}원</span>
                </div>
                {originalPrice && <p className="detail-original">{originalPrice.toLocaleString()}원</p>}
              </div>
            )}

            <p className="detail-description">{product.description}</p>

            <div className="detail-tags">
              {product.tags.map(tag => (
                <span key={tag} className="detail-tag">{tag}</span>
              ))}
            </div>

            <div className="detail-actions">
              <button className="btn-cart" onClick={() => showToast('장바구니에 담겼습니다 🛒')}>장바구니 담기</button>
              <button className="btn-buy" onClick={() => showToast('올웨이즈 앱에서 구매할 수 있어요 📦')}>바로 구매하기</button>
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
                재구매·장기사용·우수리뷰어 신호를 기반으로 신뢰도를 분석합니다
              </p>
            </div>
          </div>

          {/* 로딩 */}
          {loading && (
            <div className="review-loading">
              <div className="loading-spinner" />
              <p className="loading-text">리뷰 분석 중...</p>
              <p className="loading-sub">리뷰 수집 및 AI 요약 생성 중 (30초 내외)</p>
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

              <SummaryCard summary={reviewData.summary} personalization={reviewData.personalization} />

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
                  <p className="tab-desc">신뢰도 신호가 강한 리뷰를 먼저 보여드려요.</p>
                )}
                <ReviewList reviews={activeReviews} showTrustScore={activeTab === 'trust'} />
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default ProductDetail;
