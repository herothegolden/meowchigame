// src/Shop.jsx
import React, { useState, useEffect } from 'react';
import { useStore } from './store.js';

export default function Shop({ coins, onPurchase, userTelegramId }) {
  const [purchasing, setPurchasing] = useState(null);
  const { powerups, setPowerups, setCoins } = useStore(s => ({
    powerups: s.powerups,
    setPowerups: s.setPowerups,
    setCoins: s.setCoins,
  }));

  const items = [
    { key: "shuffle", name: "The Paw-sitive Swap", desc: "Swap any two adjacent cookies", price: 50, icon: "🐾" },
    { key: "hammer", name: "The Catnip Cookie", desc: "Clear all cookies of one cat type", price: 75, icon: "🍪" },
    { key: "bomb", name: "The Marshmallow Bomb", desc: "Explode a 3x3 area of cookies", price: 100, icon: "💣" },
  ];

  const handleBuy = async (item) => {
    if (coins < item.price || purchasing) {
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch (e) {}
      return;
    }
    setPurchasing(item.key);

    // --- OPTIMISTIC UPDATE ---
    const originalCoins = coins;
    const originalPowerups = { ...powerups };

    // 1. Immediately update the UI
    const newPowerupCount = (powerups[item.key] || 0) + 1;
    setPowerups({ ...powerups, [item.key]: newPowerupCount });
    setCoins(c => c - item.price);
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch (e) {}


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
        // 2. Server confirmed, finalize the state from server response
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch (e) {}
        // The onPurchase callback might update the coin balance from the server
        onPurchase(item.key, result.newCoinBalance);
      } else {
        // 3. Server failed, revert the UI
        throw new Error(result.error || "Purchase failed on server.");
      }
    } catch (error) {
      console.error("Purchase failed, reverting:", error);
      // 3. Revert UI state on any failure
      setCoins(originalCoins);
      setPowerups(originalPowerups);
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch (e) {}
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <section className="section">
      <div className="title" style={{ marginBottom: 10 }}>🛒 Meowchi Shop</div>
      <div className="shop-subtitle">
        <span className="coins-display-inline">💰 {coins.toLocaleString()} coins</span>
      </div>
      
      <div className="list grid-gap">
        {items.map((it) => {
          const canAfford = coins >= it.price;
          const isBeingPurchased = purchasing === it.key;
          
          return (
            <div 
              key={it.key} 
              className={`shop-item ${!canAfford ? 'unaffordable' : ''}`}
            >
              <div className="item-content">
                <div className="item-icon">{it.icon}</div>
                <div className="item-details">
                  <div className="item-name">{it.name}</div>
                  <div className="item-description">{it.desc}</div>
                  <div className="item-owned">Owned: {powerups[it.key] || 0}</div>
                </div>
                <div className="item-price-section">
                  <button
                    className="btn primary"
                    onClick={() => handleBuy(it)}
                    disabled={!canAfford || purchasing}
                    style={{ minWidth: '100px', textAlign: 'center' }}
                  >
                    {isBeingPurchased ? '...' : (
                      <>
                        <span className="coins-icon" style={{ fontSize: '12px' }}>💰</span> {it.price}
                      </>
                    )}
                  </button>
                </div>
              </div>
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

        .shop-item {
          background: var(--card);
          border: 2px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .shop-item.unaffordable {
          opacity: 0.6;
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

        .item-price-section {
          text-align: right;
          flex-shrink: 0;
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
