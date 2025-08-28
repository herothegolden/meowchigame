// src/Shop.jsx
import React, { useState, useEffect } from 'react';
import { useStore } from './store.js';

export default function Shop({ coins, onPurchase, userTelegramId }) {
  const [purchasing, setPurchasing] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const powerups = useStore(s => s.powerups); // Get powerups from the store

  // The new, thematic shop items
  const items = [
    { key: "shuffle", name: "The Paw-sitive Swap", desc: "Swap any two adjacent cookies", price: 50, icon: "🐾" },
    { key: "hammer", name: "The Catnip Cookie", desc: "Clear all cookies of one cat type", price: 75, icon: "🍪" },
    { key: "bomb", name: "The Marshmallow Bomb", desc: "Explode a 3x3 area of cookies", price: 100, icon: "💣" },
  ];

  // NEW: Manage Telegram Main Button for purchases
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.MainButton) return;

    if (selectedItem && !purchasing) {
      const item = items.find(i => i.key === selectedItem);
      const canAfford = coins >= item.price;
      
      if (canAfford) {
        tg.MainButton.setText(`🛒 Buy ${item.name} (${item.price} coins)`);
        tg.MainButton.setParams({
          color: "#d4af37",
          text_color: "#ffffff"
        });
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
          handleBuy(item);
        });
      } else {
        tg.MainButton.setText(`💸 Not enough coins (need ${item.price})`);
        tg.MainButton.setParams({
          color: "#95a5a6",
          text_color: "#ffffff"
        });
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
          // Do nothing - button is disabled state
        });
      }
    } else {
      tg.MainButton.hide();
    }

    return () => {
      if (tg.MainButton.isVisible) {
        tg.MainButton.hide();
      }
    };
  }, [selectedItem, purchasing, coins]);

  const handleItemSelect = (itemKey) => {
    if (purchasing) return;
    
    if (selectedItem === itemKey) {
      // Deselect if clicking the same item
      setSelectedItem(null);
    } else {
      setSelectedItem(itemKey);
      
      // Haptic feedback
      try {
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      } catch (e) {}
    }
  };

  const handleBuy = async (item) => {
    if (coins < item.price || purchasing) {
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch (e) {}
      return;
    }
    setPurchasing(item.key);
    try {
      const tg = window.Telegram?.WebApp;
      const response = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: userTelegramId,
          item_id: item.key,
          initData: tg?.initData
        })
      });
      const result = await response.json();
      if (response.ok) {
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch (e) {}
        onPurchase(item.key, result.newCoinBalance);
        setSelectedItem(null); // Clear selection after purchase
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Purchase failed:", error);
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch (e) {}
      // You could show an error message to the user here
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <section className="section">
      <div className="title" style={{ marginBottom: 10 }}>🛒 Meowchi Shop</div>
      <div className="shop-subtitle">
        <span className="coins-display-inline">💰 {coins.toLocaleString()} coins</span>
        <span className="shop-hint">Tap an item to select it!</span>
      </div>
      
      <div className="list grid-gap">
        {items.map((it) => {
          const isSelected = selectedItem === it.key;
          const canAfford = coins >= it.price;
          const isBeingPurchased = purchasing === it.key;
          
          return (
            <div 
              key={it.key} 
              className={`shop-item ${isSelected ? 'selected' : ''} ${!canAfford ? 'unaffordable' : ''}`}
              onClick={() => handleItemSelect(it.key)}
            >
              <div className="item-content">
                <div className="item-icon">{it.icon}</div>
                <div className="item-details">
                  <div className="item-name">{it.name}</div>
                  <div className="item-description">{it.desc}</div>
                  <div className="item-owned">Owned: {powerups[it.key] || 0}</div>
                </div>
                <div className="item-price-section">
                  <div className="item-price">{it.price} $Meow</div>
                  {isBeingPurchased && (
                    <div className="purchasing-indicator">
                      <div className="spinner">⏳</div>
                      <span>Buying...</span>
                    </div>
                  )}
                </div>
              </div>
              
              {isSelected && (
                <div className="selection-indicator">
                  <div className="selection-glow"></div>
                  <div className="selection-text">
                    {canAfford ? "👆 Tap button below to confirm purchase" : "❌ Not enough coins"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="shop-tips">
        <div className="tip-item">
          <span className="tip-icon">💡</span>
          <span className="tip-text">Power-ups help you score higher and earn more coins!</span>
        </div>
        <div className="tip-item">
          <span className="tip-icon">🎮</span>
          <span className="tip-text">Use them strategically during gameplay for maximum effect</span>
        </div>
      </div>

      <style jsx>{`
        .shop-subtitle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 12px 16px;
          background: var(--surface);
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .coins-display-inline {
          font-size: 16px;
          font-weight: 700;
          color: var(--accent);
        }

        .shop-hint {
          font-size: 12px;
          color: var(--muted);
          font-style: italic;
        }

        .shop-item {
          background: var(--card);
          border: 2px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .shop-item:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .shop-item.selected {
          border-color: var(--accent);
          background: var(--accent-light);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(212, 175, 55, 0.3);
        }

        .shop-item.unaffordable {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .shop-item.unaffordable:hover {
          transform: none;
          box-shadow: none;
          border-color: var(--border);
        }

        .item-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .item-icon {
          font-size: 32px;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border-radius: 12px;
          flex-shrink: 0;
        }

        .shop-item.selected .item-icon {
          background: var(--accent);
        }

        .item-details {
          flex: 1;
        }

        .item-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }

        .item-description {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 6px;
        }

        .item-owned {
          font-size: 11px;
          color: var(--accent);
          font-weight: 600;
          background: var(--surface);
          padding: 2px 8px;
          border-radius: 8px;
          display: inline-block;
        }

        .shop-item.selected .item-owned {
          background: rgba(255, 255, 255, 0.2);
        }

        .item-price-section {
          text-align: right;
          flex-shrink: 0;
        }

        .item-price {
          font-size: 16px;
          font-weight: 800;
          color: var(--accent);
          margin-bottom: 4px;
        }

        .purchasing-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--muted);
          font-weight: 600;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .selection-indicator {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(212, 175, 55, 0.3);
          position: relative;
        }

        .selection-glow {
          position: absolute;
          top: 0;
          left: -16px;
          right: -16px;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          animation: glow-sweep 2s ease-in-out infinite;
        }

        @keyframes glow-sweep {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        .selection-text {
          font-size: 12px;
          text-align: center;
          color: var(--accent);
          font-weight: 600;
          margin-top: 8px;
        }

        .shop-tips {
          margin-top: 24px;
          padding: 16px;
          background: var(--surface);
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .tip-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .tip-item:last-child {
          margin-bottom: 0;
        }

        .tip-icon {
          font-size: 16px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .tip-text {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.4;
        }

        @media (max-width: 480px) {
          .shop-subtitle {
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
          }
          
          .item-content {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }
          
          .item-price-section {
            text-align: center;
          }
        }
      `}</style>
    </section>
  );
}
