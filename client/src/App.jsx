import React, { useState } from 'react';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import './App.css';

function Header({ onLogoClick }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo" onClick={onLogoClick} style={{ cursor: 'pointer' }}>
          <div className="logo-mark">A</div>
          <span className="logo-text">올웨이즈</span>
          <span className="logo-badge">리뷰 진단</span>
        </div>
        <nav className="header-nav">
          <span className="nav-item">건강기능식품</span>
          <span className="nav-item">비타민</span>
          <span className="nav-item">유산균</span>
        </nav>
      </div>
    </header>
  );
}

function App() {
  const [page, setPage] = useState('list');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setPage('detail');
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setPage('list');
    setSelectedProduct(null);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      <Header onLogoClick={handleBack} />
      {page === 'list' && (
        <ProductList onProductSelect={handleProductSelect} />
      )}
      {page === 'detail' && selectedProduct && (
        <ProductDetail product={selectedProduct} onBack={handleBack} />
      )}
    </div>
  );
}

export default App;
