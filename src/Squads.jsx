// src/Squads.jsx
import React, { useState, useEffect, useCallback } from 'react';
import SquadModal from './SquadModal.jsx'; // Import the modal
import SquadsSkeleton from './SquadsSkeleton.jsx';

export default function Squads({ userTelegramId }) {
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'create', 'join', or null

  const fetchUserSquad = useCallback(async () => {
    if (!userTelegramId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/user/${userTelegramId}/squad-details`);
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch squad details: ${response.status} ${errorBody}`);
      }
      
      const data = await response.json();
      setSquad(data.squad); // This will be the full squad object or null

    } catch (err) {
      console.error("fetchUserSquad error:", err); 
      setError("Could not load squad information. Please try again later.");
      setSquad(null);
    } finally {
      setLoading(false);
    }
  }, [userTelegramId]);

  useEffect(() => {
    fetchUserSquad();
  }, [fetchUserSquad]);

  const handleSquadUpdate = () => {
    setModalMode(null);
    fetchUserSquad(); 
  };

  const handleModalOpen = (mode) => {
    try { window.Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
    setModalMode(mode);
  };
  
  if (loading) {
    return <SquadsSkeleton />;
  }
  
  const renderContent = () => {
    if (error) {
       return (
        <div className="error-state">
          <div className="error-icon">仭</div>
          <div className="error-text">{error}</div>
          <button className="btn" onClick={fetchUserSquad}>Try Again</button>
        </div>
      );
    }
    
    if (squad) {
      return <SquadDashboard squad={squad} userTelegramId={userTelegramId} onSquadUpdate={fetchUserSquad} />;
    }
    
    return <NoSquadView onCreate={() => handleModalOpen('create')} onJoin={() => handleModalOpen('join')} />;
  };

  return (
    <>
      <section className="section">
        <div className="title">誓 Meowchi Squads</div>
        {renderContent()}
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

const SquadDashboard = ({ squad, userTelegramId, onSquadUpdate }) => {
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [kickingMember, setKickingMember] = useState(null);

  const isCreator = squad.creator_telegram_id == userTelegramId;

  const copyInviteCode = async () => {
    if (!squad.invite_code) return;
    try {
      await navigator.clipboard.writeText(squad.invite_code);
      setCopied(true);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy invite code:', error);
    }
  };

  const shareSquad = () => {
    const message = `Join my squad "${squad.name}" in Meowchi! Use invite code: ${squad.invite_code}`;
    const tg = window.Telegram?.WebApp;
    try {
      tg?.HapticFeedback?.selectionChanged();
      if (tg?.switchInlineQuery) {
        tg.switchInlineQuery(message, ['users', 'groups']);
      } else {
        alert(message);
      }
    } catch (e) {}
  };
  
  const kickMember = async (memberTelegramId, memberName) => {
    // The confirm dialog is removed as it's not supported in Mini Apps.
    // A custom modal should be implemented here for a better user experience.
    
    setKickingMember(memberTelegramId);
    try {
      const tg = window.Telegram?.WebApp;
      const response = await fetch('/api/squads/kick-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_telegram_id: memberTelegramId,
          initData: tg?.initData
        })
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      try { tg?.HapticFeedback?.notificationOccurred('success'); } catch (e) {}
      alert('Member kicked successfully!');
      onSquadUpdate();
    } catch (error) {
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch (e) {}
      alert(`Failed to kick member: ${error.message}`);
    } finally {
      setKickingMember(null);
    }
  };

  return (
    <div>
      {/* CHANGED: use the centralized container class */}
      <div className="squad-info-card">
        <div className="squad-header">
          <span className="squad-icon">{squad.icon}</span>
          <div>
            <h3 className="squad-name">{squad.name}</h3>
            <p className="squad-stats">
              {squad.member_count}/{squad.member_limit || 11} members 窶｢ {parseInt(squad.total_score || 0).toLocaleString()} total score
            </p>
            {isCreator && <p className="creator-badge">You are the Squad Leader</p>}
          </div>
        </div>
        
        <div className="squad-actions">
          <button className="btn primary" onClick={shareSquad}>Share Squad</button>
          {isCreator && (
            <button 
              className="btn" 
              onClick={() => {
                try { window.Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
                setShowInviteCode(p => !p);
              }}
            >
              {showInviteCode ? 'Hide Code' : 'Invite Code'}
            </button>
          )}
        </div>

        {showInviteCode && isCreator && (
          <div className="invite-code-section">
            <div className="invite-code-display">
              <span className="invite-code">{squad.invite_code}</span>
              <button className="btn copy-btn" onClick={copyInviteCode}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="members-section">
          <h4 className="members-title">Squad Members</h4>
          <div className="members-list">
            {(squad.members || []).map((member, index) => (
              <div key={member.telegram_id} className="member-item">
                <div className="member-rank">#{index + 1}</div>

                {/* START: Added profile picture */}
                <div className="member-avatar">
                  <img 
                    src={member.profile_picture || 'https://ik.imagekit.io/59r2kpz8r/Meowchi/Meowchi.webp?updatedAt=1756284887490'} 
                    alt={member.display_name} 
                    onError={(e) => { e.currentTarget.src = 'https://ik.imagekit.io/59r2kpz8r/Meowchi/Meowchi.webp?updatedAt=1756284887490'; }}
                  />
                </div>
                {/* END: Added profile picture */}

                <div className="member-info">
                  <div className="member-name">
                    {member.country_flag && <span className="country-flag">{member.country_flag}</span>}
                    <span>{member.display_name}</span>
                    {member.telegram_id == squad.creator_telegram_id && <span className="leader-badge">Leader</span>}
                  </div>
                  <div className="member-stats">
                    {parseInt(member.total_score).toLocaleString()} points
                  </div>
                </div>
                {isCreator && member.telegram_id != squad.creator_telegram_id && (
                  <button 
                    className="btn kick-btn"
                    onClick={() => kickMember(member.telegram_id, member.display_name)}
                    disabled={kickingMember === member.telegram_id}
                  >
                    {kickingMember === member.telegram_id ? '...' : 'Kick'}
                  </button>
                )}
              </div>
            ))}
          </div>
          {(!squad.members || squad.members.length <= 1) && (
            <div className="empty-state" style={{ marginTop: '12px', padding: '20px' }}>
              <div className="empty-icon">👥</div>
              <div className="empty-text">Recruit Your Squad!</div>
              <p className="muted small" style={{ margin: 0 }}>Share the invite code with your friends to build your team.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
