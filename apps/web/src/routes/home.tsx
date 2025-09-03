import React from "react";

export default function Home() {
  return (
    <div className="container grid">
      <section className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="h1">Alex</div>
            <div>Marshmallow Master · Lv. 14</div>
          </div>
          <span className="badge">🔥 Streak: 7</span>
        </div>
        <div className="progress" style={{ marginTop: 8 }}>
          <span style={{ width: "64%" }} />
        </div>
      </section>

      <section className="card row" style={{ justifyContent: "space-between" }}>
        <div className="h2">🍪 1,250</div>
        <div>❤️❤️❤️♡♡</div>
      </section>

      <section className="card">
        <div className="h2">✨ Promotions</div>
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <div className="card">10% OFF this week</div>
          <div className="card">Limited Flavor Pack</div>
        </div>
      </section>

      <section className="card">
        <div className="h2">📋 Today’s Tasks</div>
        <div style={{ marginTop: 8 }}>
          <div>▢ Play 3 games (2/3)  +50</div>
          <div>▢ Score &gt; 10,000 (0/1) +75</div>
          <div>▢ Win without losing life (0/1) +100</div>
        </div>
      </section>

      <section className="card">
        <div className="h2">🏅 Recent Achievements</div>
        <div style={{ marginTop: 8 }}>[ Gold Badge ] [ Cookie King ] [ Lucky Streak ]</div>
      </section>
    </div>
  );
}
