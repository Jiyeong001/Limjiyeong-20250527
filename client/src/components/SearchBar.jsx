import React from 'react';
import './SearchBar.css';

function SearchBar({ url, productName, onUrlChange, onProductNameChange, onAnalyze, loading }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) onAnalyze();
  };

  return (
    <div className="search-bar">
      <h2 className="search-title">상품 URL로 리뷰 진단받기</h2>
      <div className="search-inputs">
        <input
          type="text"
          className="input-url"
          placeholder="올웨이즈 상품 URL 붙여넣기 (https://www.always.co.kr/products/...)"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <input
          type="text"
          className="input-name"
          placeholder="상품명 입력 (선택)"
          value={productName}
          onChange={(e) => onProductNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="btn-analyze"
          onClick={onAnalyze}
          disabled={!url.trim() || loading}
        >
          {loading ? '분석 중...' : '리뷰 진단하기'}
        </button>
      </div>
    </div>
  );
}

export default SearchBar;
