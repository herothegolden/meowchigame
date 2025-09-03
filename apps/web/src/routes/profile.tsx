import React from "react";

export default function Profile() {
  return (
    <div className="container grid">
      <section className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="h1">Alex</div>
            <div>Sweet Specialist · Lv. 32</div>
            <div className="progress" style={{ marginTop: 8 }}><span style={{ width: "24%" }} /></div>
          </div>
          <div className="badge">Edit Avatar</div>
        </div>
      </section>

      <section className="card grid grid-2">
        <div><div className="h2">Lifetime Points</div> 12,340</div>
        <div><div className="h2">Games Played</div> 214</div>
        <div><div className="h2">Highest Score</div> 73,880</div>
        <div><div className="h2">Longest Streak</div> 11 days</div>
      </section>

      <section className="card">
        <div className="h2">Achievements</div>
        <div style={{ marginTop: 8 }}>[ x x x x x ]</div>
      </section>

      <section className="card">
        <div className="h2">Orders & Rewards</div>
        <div style={{ marginTop: 8 }}>
          - Order #123 — Delivered<br/>
          - Voucher: Free Delivery — Redeemed ✅
        </div>
      </section>

      <section className="card">
        <div className="h2">Settings</div>
        <div style={{ marginTop: 8 }}>
          • Notifications<br/>
          • Theme<br/>
          • Language<br/>
          • Help / FAQ<br/>
          • Legal
        </div>
      </section>
    </div>
  );
}
