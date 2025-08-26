// src/Squads.jsx
import React, { useState, useEffect } from 'react';
import SquadModal from './SquadModal.jsx'; // Import the modal

export default function Squads({ userTelegramId }) {
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null); // 'create', 'join', or null

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

  useEffect(() => {
    fetchUserSquad();
  }, [userTelegramId]);

  const handleSquadUpdate = () => {
    setModalMode(null);
    fetchUserSquad(); // Refresh squad data after joining/creating
  };

  if (loading) {
    return <section className="section"><div>Loading Squad...</div></section>;
  }

  return (
    <>
      <section className="section">
        <div className="title">🐾 Meowchi Squads</div>
        {squad ? (
          <SquadDashboard squad={squad} />
        ) : (
          <NoSquadView onCreate={() => setModalMode('create')} onJoin={() => setModalMode('join')} />
        )}
      </section>

      {modalMode && (
        <SquadModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          onSuccess={handleSquadUpdate}
          userTelegramId={userTelegramId}
        />
      )}
    </>
  );
}

const SquadDashboard = ({ squad }) => {
  // ... (UI is the same as before)
};

const NoSquadView = ({ onCreate, onJoin }) => {
  return (
    <div>
      <p className="muted">You are not in a squad yet. Join a friend's squad or create your own!</p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button className="btn primary" onClick={onCreate}>Create Squad</button>
        <button className="btn" onClick={onJoin}>Join Squad</button>
      </div>
    </div>
  );
};
