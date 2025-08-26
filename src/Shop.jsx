// src/Shop.jsx
import React, { useState } from 'react';

export default function Shop({ coins, onPurchase, userTelegramId }) {
  const [purchasing, setPurchasing] = useState(null);

  // The new, thematic shop items
  const items = [
    { key: "shuffle", name: "The Paw-sitive Swap", desc: "Swap any two adjacent cookies", price: 50, icon: "🐾" },
    { key: "hammer", name: "The Catnip Cookie", desc: "Clear all cookies of one cat type", price: 75, icon: "🍪" },
    { key: "bomb", name: "The Marshmallow Bomb", desc: "Explode a 3x3 area of cookies", price: 100, icon: "💣" },
  ];

  const handleBuy = async (item) => {
    if (coins < item.price || purchasing) {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
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
        onPurchase(item.key, result.newCoinBalance);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Purchase failed:", error);
      // You could show an error message to the user here
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <section className="section">
      <div className="title" style={{ marginBottom: 10 }}>🛒 Meowchi Shop</div>
      <div className="list grid-gap">
        {items.map((it) => (
          <div key={it.key} className="row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="action-icon" style={{ fontSize: '24px' }}>{it.icon}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{it.name}</div>
                <div className="muted small">{it.desc}</div>
              </div>
            </div>
            <div className="row" style={{ gap: 8, borderBottom: 'none', padding: 0 }}>
              <div className="pill">{it.price} $Meow</div>
              <button
                className="btn primary"
                onClick={() => handleBuy(it)}
                disabled={coins < it.price || !!purchasing}
                style={{ minWidth: '80px' }}
              >
                {purchasing === it.key ? '...' : 'Buy'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
