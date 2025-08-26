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
      
      if (data.squad && data.squad.id) {
        // Fetch detailed squad info including members
        const detailResponse = await fetch(`/api/squads/${data.squad.id}`);
        const detailData = await detailResponse.json();
        setSquad(detailData.squad);
      } else {
        setSquad(null);
      }
    } catch (error) {
      console.error("Failed to fetch squad info", error);
      setSquad(null);
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
          <SquadDashboard squad={squad} userTelegramId={userTelegramId} fetchUserSquad={fetchUserSquad} />
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

const SquadDashboard = ({ squad, userTelegramId, fetchUserSquad }) => {
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [copied, setCopied] = useState(false);
  const [kickingMember, setKickingMember] = useState(null);

  const isCreator = squad.creator_telegram_id === userTelegramId;

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(squad.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareSquad = () => {
    const message = `Join my squad "${squad.name}" in Meowchi! Use invite code: ${squad.invite_code}`;
    const tg = window.Telegram?.WebApp;
    if (tg?.switchInlineQuery) {
      tg.switchInlineQuery(message, ['users', 'groups']);
    }
  };

  const kickMember = async (memberTelegramId, memberName) => {
    if (!confirm(`Kick ${memberName} from the squad?`)) return;
    
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
      if (response.ok) {
        fetchUserSquad();
        alert(result.message);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      alert(`Failed to kick member: ${error.message}`);
    } finally {
      setKickingMember(null);
    }
  };

  return (
    <div>
      <div className="squad-info">
        <div className="squad-header">
          <span className="squad-icon">{squad.icon}</span>
          <div>
            <h3 className="squad-name">{squad.name}</h3>
            <p className="squad-stats">
              {squad.member_count}/{squad.member_limit || 11} members • {parseInt(squad.total_score || 0).toLocaleString()} total score
            </p>
            {isCreator && <p className="creator-badge">Squad Leader</p>}
          </div>
        </div>
        
        <div className="squad-actions">
          <button 
            className="btn" 
            onClick={() => setShowMembers(!showMembers)}
          >
            {showMembers ? 'Hide Members' : 'View Members'}
          </button>
          {isCreator && (
            <button 
              className="btn" 
              onClick={() => setShowInviteCode(!showInviteCode)}
            >
              {showInviteCode ? 'Hide Code' : 'Invite Code'}
            </button>
          )}
          <button className="btn primary" onClick={shareSquad}>
            Share Squad
          </button>
        </div>

        {showInviteCode && isCreator && (
          <div className="invite-code-section">
            <div className="invite-code-display">
              <span className="invite-code">{squad.invite_code}</span>
              <button 
                className="btn copy-btn" 
                onClick={copyInviteCode}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="invite-help">
              Share this code with friends so they can join your squad!
            </p>
          </div>
        )}

        {showMembers && squad.members && squad.members.length > 0 && (
          <div className="members-section">
            <h4 className="members-title">Squad Contributions</h4>
            <div className="members-list">
              {squad.members.map((member, index) => (
                <div key={member.telegram_id} className="member-item">
                  <div className="member-rank">#{index + 1}</div>
                  <div className="member-info">
                    <div className="member-name">
                      {member.country_flag && <span className="country-flag">{member.country_flag}</span>}
                      <span>{member.display_name}</span>
                      {member.telegram_id === squad.creator_telegram_id && <span className="leader-badge">Leader</span>}
                    </div>
                    <div className="member-stats">
                      {member.total_score.toLocaleString()} points • {member.games_played} games
                    </div>
                  </div>
                  {isCreator && member.telegram_id !== squad.creator_telegram_id && (
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
          </div>
        )}

        {showMembers && (!squad.members || squad.members.length === 0) && (
          <div className="members-section">
            <h4 className="members-title">Squad Contributions</h4>
            <p className="muted">No members found. Try refreshing the page.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .squad-info {
          background: var(--surface);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid var(--border);
        }
        
        .squad-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .squad-icon {
          font-size: 32px;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--card);
          border-radius: 12px;
        }
        
        .squad-name {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: var(--text);
        }
        
        .squad-stats {
          font-size: 14px;
          color: var(--muted);
          margin: 0;
        }
        
        .creator-badge {
          font-size: 12px;
          color: var(--accent);
          font-weight: 600;
          margin: 0;
        }
        
        .squad-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        
        .invite-code-section {
          background: var(--card);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid var(--border);
          margin-bottom: 16px;
        }
        
        .invite-code-display {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        
        .invite-code {
          font-family: monospace;
          font-size: 18px;
          font-weight: 700;
          color: var(--accent);
          background: var(--surface);
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          flex: 1;
          text-align: center;
        }
        
        .copy-btn {
          padding: 8px 16px;
          font-size: 12px;
        }
        
        .invite-help {
          font-size: 12px;
          color: var(--muted);
          margin: 0;
          text-align: center;
        }
        
        .members-section {
          background: var(--card);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid var(--border);
        }
        
        .members-title {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 12px 0;
          color: var(--text);
        }
        
        .members-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .member-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          background: var(--surface);
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        
        .member-rank {
          font-weight: 800;
          color: var(--accent);
          width: 30px;
          text-align: center;
          font-size: 14px;
        }
        
        .member-info {
          flex: 1;
        }
        
        .member-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 2px;
        }
        
        .country-flag {
          font-size: 16px;
        }
        
        .leader-badge {
          font-size: 10px;
          background: var(--accent);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 700;
        }
        
        .member-stats {
          font-size: 12px;
          color: var(--muted);
        }
        
        .kick-btn {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 6px;
          min-width: 50px;
        }
        
        .kick-btn:hover:not(:disabled) {
          background: #c0392b;
        }
        
        .kick-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        @media (max-width: 480px) {
          .squad-actions {
            flex-direction: column;
          }
          
          .member-item {
            gap: 8px;
          }
          
          .member-rank {
            width: 25px;
            font-size: 12px;
          }
        }
      `}</style>
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
