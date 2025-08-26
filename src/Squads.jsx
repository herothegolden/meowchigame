// src/Squads.jsx
import React, { useState, useEffect } from 'react';

export default function Squads({ userTelegramId }) {
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserSquad = async () => {
      if (!userTelegramId) return;
      try {
        setLoading(true);
        const response = await fetch(`/api/user/${userTelegramId}/squad`);
        const data = await response.json();
        setSquad(data.squad);
      } catch (error) {
        console.error("Failed to fetch squad info", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserSquad();
  }, [userTelegramId]);

  if (loading) {
    return <section className="section"><div>Loading Squad...</div></section>;
  }

  return (
    <section className="section">
      <div className="title">🐾 Meowchi Squads</div>
      {squad ? (
        <SquadDashboard squad={squad} />
      ) : (
        <NoSquadView />
      )}
    </section>
  );
}

const SquadDashboard = ({ squad }) => {
  // UI for when the user is in a squad
  return (
    <div>
      <h2>{squad.icon} {squad.name}</h2>
      <p>Invite Code: <code>{squad.invite_code}</code></p>
      <p>Members: {squad.member_count}</p>
      <p>Total Score: {squad.total_score?.toLocaleString() || 0}</p>
      <button className="btn primary">Invite Friends</button>
    </div>
  );
};

const NoSquadView = () => {
  // UI for when the user is not in a squad
  return (
    <div>
      <p className="muted">You are not in a squad yet. Join a friend's squad or create your own!</p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button className="btn primary">Create Squad</button>
        <button className="btn">Join Squad</button>
      </div>
    </div>
  );
};
