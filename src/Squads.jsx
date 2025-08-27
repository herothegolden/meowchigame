// src/Squads.jsx
import React, { useState, useEffect, useCallback } from 'react';
import SquadModal from './SquadModal.jsx'; // Import the modal

export default function Squads({ userTelegramId }) {
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'create', 'join', or null

const fetchUserSquad = useCallback(async () => {
  console.log('🔍 fetchUserSquad called with userTelegramId:', userTelegramId);
  
  if (!userTelegramId) {
    console.log('❌ No userTelegramId provided');
    setLoading(false);
    return;
  }
  
  setLoading(true);
  setError(null);
  
  try {
    const tg = window.Telegram?.WebApp;
    console.log('🤖 Telegram WebApp available:', !!tg);
    console.log('📱 initData available:', !!tg?.initData);
    console.log('📱 initData length:', tg?.initData?.length || 0);
    
    const response = await fetch(`/api/squads/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': tg?.initData || ''
      }
    });
    
    console.log('📡 API Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API Error response:', errorText);
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ API Success data:', data);
    setSquad(data.squad);
  } catch (err) {
    console.error("❌ Failed to fetch squad dashboard:", err);
    setError("Could not load squad information. Please try again.");
    setSquad(null);
  } finally {
    setLoading(false);
  }
}, [userTelegramId]);

  const handleSquadUpdate = () => {
    setModalMode(null);
    fetchUserSquad(); 
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-icon">🐾</div>
          <div className="loading-text">Checking your squad status...</div>
        </div>
      );
    }

    if (error) {
       return (
        <div className="error-state">
          <div className="error-icon">😿</div>
          <div className="error-text">{error}</div>
          <button className="btn" onClick={fetchUserSquad}>Try Again</button>
        </div>
      );
    }
    
    if (squad) {
      return <SquadDashboard squad={squad} userTelegramId={userTelegramId} onSquadUpdate={fetchUserSquad} />;
    }
    
    return <NoSquadView onCreate={() => setModalMode('create')} onJoin={() => setModalMode('join')} />;
  };

  return (
    <>
      <section className="section">
        <div className="title">🐾 Meowchi Squads</div>
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
} // <--- THIS IS THE BRACE THAT WAS LIKELY MISSING

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
    if (tg?.switchInlineQuery) {
      tg.switchInlineQuery(message, ['users', 'groups']);
    } else {
      alert(message);
    }
  };
  
  const kickMember = async (memberTelegramId, memberName) => {
    if (!confirm(`Are you sure you want to kick ${memberName} from the squad?`)) return;
    
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
      
      alert('Member kicked successfully!');
      onSquadUpdate();
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
            {isCreator && <p className="creator-badge">You are the Squad Leader</p>}
          </div>
        </div>
        
        <div className="squad-actions">
          <button className="btn primary" onClick={shareSquad}>Share Squad</button>
          {isCreator && (
            <button 
              className="btn" 
              onClick={() => setShowInviteCode(p => !p)}
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
                    src={member.profile_picture || 'https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png'} 
                    alt={member.display_name} 
                    onError={(e) => { e.currentTarget.src = 'https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png'; }}
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
        </div>
      </div>

      <style jsx>{`
        .squad-info { background: var(--surface); border-radius: 16px; padding: 20px; border: 1px solid var(--border); }
        .squad-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .squad-icon { font-size: 32px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: var(--card); border-radius: 12px; }
        .squad-name { font-size: 20px; font-weight: 700; margin: 0 0 4px 0; color: var(--text); }
        .squad-stats { font-size: 14px; color: var(--muted); margin: 0; }
        .creator-badge { font-size: 12px; color: var(--accent); font-weight: 600; margin: 4px 0 0; }
        .squad-actions { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .invite-code-section { background: var(--card); border-radius: 12px; padding: 16px; border: 1px solid var(--border); }
        .invite-code-display { display: flex; align-items: center; gap: 12px; }
        .invite-code { font-family: monospace; font-size: 18px; font-weight: 700; color: var(--accent); background: var(--surface); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); flex: 1; text-align: center; }
        .copy-btn { padding: 8px 16px; font-size: 12px; }
        .members-section { margin-top: 20px; }
        .members-title { font-size: 16px; font-weight: 700; margin: 0 0 12px 0; color: var(--text); }
        .members-list { display: flex; flex-direction: column; gap: 8px; }
        .member-item { display: flex; align-items: center; gap: 12px; padding: 8px; background: var(--card); border-radius: 8px; border: 1px solid var(--border); }
        .member-rank { font-weight: 800; color: var(--accent); width: 30px; text-align: center; font-size: 14px; }
        .member-info { flex: 1; }
        .member-name { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
        .country-flag { font-size: 16px; }
        .leader-badge { font-size: 10px; background: var(--accent); color: white; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; font-weight: 700; }
        .member-stats { font-size: 12px; color: var(--muted); }
        .kick-btn { background: #e74c3c; color: white; border: none; padding: 6px 12px; font-size: 12px; border-radius: 6px; min-width: 50px; }
        /* Add these new CSS rules inside the <style jsx> tag */
        .member-avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          overflow: hidden;
          flex-shrink: 0;
          background: var(--surface);
        }
        .member-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
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
