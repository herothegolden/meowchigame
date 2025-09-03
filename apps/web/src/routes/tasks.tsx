import React from "react";

export default function Tasks() {
  return (
    <div className="container grid">
      <section className="card">
        <div className="h2">Today’s Tasks · Resets in 12h 32m</div>
        <div style={{ marginTop: 8 }}>
          <div>▢ Play 3 games (0/3) — +50 XP +50🍪</div>
          <div>▢ Score 10,000 in one match (0/1) — +75 XP</div>
          <div>▢ Win without losing a life (0/1) — +100 XP</div>
        </div>
      </section>

      <section className="card">
        <div className="h2">Weekly Challenges</div>
        <div style={{ marginTop: 8 }}>
          <div>▢ Maintain 7-day streak — +500 XP +500🍪</div>
          <div>▢ Complete 20 levels — +300 XP</div>
          <div>▢ Refer 1 friend — +1000 XP + Badge</div>
        </div>
      </section>

      <section className="card">
        <div className="h2">Seasonal Events</div>
        <div style={{ marginTop: 8 }}>[ Marshmallow Madness — Double Points Weekend ]</div>
      </section>

      <section className="card">
        <div className="h2">Social Tasks</div>
        <div style={{ marginTop: 8 }}>
          <div>▢ Share an achievement — +25 XP</div>
          <div>▢ Join official channel — +200 XP (one-time)</div>
          <div>▢ Rate the app — +150 XP (one-time)</div>
        </div>
      </section>
    </div>
  );
}
