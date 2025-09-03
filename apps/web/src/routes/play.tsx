import React from "react";

export default function Play() {
  return (
    <div className="container grid">
      <section className="card">
        <div className="h1">Level Select</div>
        <div style={{ marginTop: 8 }} className="grid grid-2">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="card">Level {i + 1}</div>
          ))}
        </div>
      </section>
      <section className="card">Lives: ❤️❤️❤️♡♡ · Boss at 15</section>
    </div>
  );
}
