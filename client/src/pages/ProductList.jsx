import React, { useState } from 'react';
import { PRODUCTS, CATEGORIES, getImageUrl } from '../data/products';
import './ProductList.css';

function ProductCard({ product, onClick }) {
  const [imgError, setImgError] = useState(false);
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);

  return (
    <div className="product-card" onClick={() => onClick(product)}>
      <div className="product-img-wrap">
        {!imgError ? (
          <img
            src={getImageUrl(product.goodsNo)}
            alt={product.name}
            className="product-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="product-img-fallback">
            <span>💊</span>
          </div>
        )}
        <div className="product-tags">
          {product.tags.map(tag => (
            <span key={tag} className={`tag ${tag === '베스트' ? 'tag-best' : tag === 'NEW' ? 'tag-new' : tag === '프리미엄' ? 'tag-premium' : 'tag-default'}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="product-info">
        <p className="product-brand">{product.brand}</p>
        <p className="product-name">{product.name}</p>
        <div className="product-price-row">
          <span className="product-discount">{discount}%</span>
          <span className="product-price">{product.price.toLocaleString()}원</span>
        </div>
        <p className="product-original">{product.originalPrice.toLocaleString()}원</p>
        <div className="product-rating-row">
          <span className="stars-small">{'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}</span>
          <span className="rating-score">{product.rating}</span>
          <span className="review-count">({product.reviewCount.toLocaleString()})</span>
        </div>
      </div>
    </div>
  );
}

function ProductList({ onProductSelect }) {
  const [activeCategory, setActiveCategory] = useState('전체');

  const filtered = activeCategory === '전체'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === activeCategory);

  return (
    <div className="product-list-page">
      {/* Hero banner */}
      <section className="list-hero">
        <div className="list-hero-inner">
          <div className="hero-blob" />
          <p className="hero-eyebrow">AI 리뷰 진단 서비스</p>
          <h1 className="hero-title">
            진짜 리뷰만<br /><em>골라드립니다</em>
          </h1>
          <p className="hero-sub">체험단·바이럴을 걸러낸 신뢰도 리뷰 + AI 요약</p>
          <div className="hero-pills">
            <div className="pill"><span>🚫</span> 체험단 필터링</div>
            <div className="pill"><span>⭐</span> 신뢰도순 정렬</div>
            <div className="pill"><span>🤖</span> AI 진단 요약</div>
          </div>
        </div>
      </section>

      {/* Category filter */}
      <div className="category-bar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="product-grid-header">
        <p className="grid-count">총 <strong>{filtered.length}</strong>개 상품</p>
      </div>
      <div className="product-grid">
        {filtered.map(product => (
          <ProductCard
            key={product.goodsNo + product.name}
            product={product}
            onClick={onProductSelect}
          />
        ))}
      </div>
    </div>
  );
}

export default ProductList;
