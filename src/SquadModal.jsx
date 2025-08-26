// src/SquadModal.jsx
import React, { useState } from 'react';

const SQUAD_ICONS = ['🍪', '🥨', '🍓', '🍡', '😺', '🏆', '🔥', '✨'];

export default function SquadModal({ mode, onClose, onSuccess, userTelegramId }) {
  const [squadName, setSquadName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(SQUAD_ICONS[0]);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = mode === 'create' ? '/api/squads/create' : '/api/squads/join';
    const body = mode === 'create' 
      ? { name: squadName, icon: selectedIcon }
      : { invite_code: inviteCode };

    try {
      const tg = window.Telegram?.WebApp;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, telegram_id: userTelegramId, initData: tg?.initData })
      });
      const result = await response.json();
      if (response.ok) {
        onSuccess();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content profile-modal">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2 className="modal-title">{mode === 'create' ? 'Create a Squad' : 'Join a Squad'}</h2>
          </div>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}
            
            {mode === 'create' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Squad Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., The Cool Cats"
                    value={squadName}
                    onChange={(e) => setSquadName(e.target.value)}
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Choose an Icon</label>
                  <div className="avatar-grid" style={{ gridTemplateColumns: 'repeat(8, 1fr)'}}>
                    {SQUAD_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        className={`avatar-option ${selectedIcon === icon ? 'selected' : ''}`}
                        onClick={() => setSelectedIcon(icon)}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label">Invite Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter 6-digit code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  maxLength={6}
                />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? '...' : (mode === 'create' ? 'Create' : 'Join')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
