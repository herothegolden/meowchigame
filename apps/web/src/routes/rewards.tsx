import React, { useState } from "react";

export default function Rewards() {
  const [tab, setTab] = useState<"digital" | "irl">("digital");
  return (
    <div className="container grid">
      <section className="card row" style={{ justifyContent: "space-between" }}>
        <div className="h2">🍪 1,250 Points</div>
        <div className="h2">⭐ 60 Stars</div>
      </section>

      <section className="card">
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <button className="badge" onClick={() => setTab("digital")}
            style={{ background: tab==="digital" ? "#2a2f3b" : undefined }}>
            Digital
          </button>
          <button className="badge" onClick={() => setTab("irl")}
            style={{ background: tab==="irl" ? "#2a2f3b" : undefined }}>
            In-Store
          </button>
        </div>

        {tab === "digital" ? (
          <div className="grid grid-2">
            <div className="card">Extra Life — 150⭐ <button className="badge">Claim</button></div>
            <div className="card">Power-Up Pack — 200⭐ <button className="badge">Claim</button></div>
            <div className="card">Avatar Frame — 300⭐ <button className="badge">Claim</button></div>
          </div>
        ) : (
          <div className="grid grid-2">
            <div className="card">Free Delivery — 300🍪 <button className="badge">Claim</button></div>
            <div className="card">10% Discount — 500🍪 <button className="badge">Claim</button></div>
            <div className="card">Buy 2 Get 1 — 800🍪 <button className="badge">Claim</button></div>
            <div className="card">Limited Flavor — 1000🍪 <button className="badge">Claim</button></div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="h2">📜 Claim History</div>
        <div>- 10% Discount (Redeemed ✅)</div>
        <div>- Wallpaper Pack (Active ✅)</div>
      </section>
    </div>
  );
}
