import React, { useState, useEffect } from 'react';

// Country flags for the dropdown (same as Leaderboard)
const COUNTRY_FLAGS = [
  { flag: '🇺🇸', name: 'United States' },
  { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇨🇦', name: 'Canada' },
  { flag: '🇦🇺', name: 'Australia' },
  { flag: '🇩🇪', name: 'Germany' },
  { flag: '🇫🇷', name: 'France' },
  { flag: '🇮🇹', name: 'Italy' },
  { flag: '🇪🇸', name: 'Spain' },
  { flag: '🇯🇵', name: 'Japan' },
  { flag: '🇰🇷', name: 'South Korea' },
  { flag: '🇨🇳', name: 'China' },
  { flag: '🇮🇳', name: 'India' },
  { flag: '🇧🇷', name: 'Brazil' },
  { flag: '🇲🇽', name: 'Mexico' },
  { flag: '🇷🇺', name: 'Russia' },
  { flag: '🇺🇿', name: 'Uzbekistan' },
  { flag: '🇹🇷', name: 'Turkey' },
  { flag: '🇸🇦', name: 'Saudi Arabia' },
  { flag: '🇦🇪', name: 'UAE' },
  { flag: '🇳🇱', name: 'Netherlands' },
  { flag: '🇸🇪', name: 'Sweden' },
  { flag: '🇳🇴', name: 'Norway' },
  { flag: '🇩🇰', name: 'Denmark' },
  { flag: '🇵🇱', name: 'Poland' },
  { flag: '🇨🇿', name: 'Czech Republic' },
  { flag: '🇭🇺', name: 'Hungary' },
  { flag: '🇦🇹', name: 'Austria' },
  { flag: '🇨🇭', name: 'Switzerland' },
  { flag: '🇧🇪', name: 'Belgium' },
  { flag: '🇵🇹', name: 'Portugal' },
  { flag: '🇬🇷', name: 'Greece' },
  { flag: '🇮🇱', name: 'Israel' },
  { flag: '🇪🇬', name: 'Egypt' },
  { flag: '🇿🇦', name: 'South Africa' },
  { flag: '🇳🇬', name: 'Nigeria' },
  { flag: '🇰🇪', name: 'Kenya' },
  { flag: '🇲🇦', name: 'Morocco' },
  { flag: '🇦🇷', name: 'Argentina' },
  { flag: '🇨🇱', name: 'Chile' },
  { flag: '🇨🇴', name: 'Colombia' },
  { flag: '🇵🇪', name: 'Peru' },
  { flag: '🇻🇪', name: 'Venezuela' },
  { flag: '🇹🇭', name: 'Thailand' },
  { flag: '🇻🇳', name: 'Vietnam' },
  { flag: '🇮🇩', name: 'Indonesia' },
  { flag: '🇲🇾', name: 'Malaysia' },
  { flag: '🇸🇬', name: 'Singapore' },
  { flag: '🇵🇭', name: 'Philippines' },
  { flag: '🇧🇩', name: 'Bangladesh' },
  { flag: '🇵🇰', name: 'Pakistan' },
  { flag: '🇱🇰', name: 'Sri Lanka' },
  { flag: '🇳🇵', name: 'Nepal' },
];

export default function ProfileModal({ show, onClose, onSave, userTelegramId, currentProfile }) {
  const [displayName, setDisplayName] = useState('');
  const [countryFlag, setCountryFlag] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [detectedCountry, setDetectedCountry] = useState(null);

  // Auto-detect country on mount
  useEffect(() => {
    if (show && !currentProfile?.country_flag) {
      detectUserCountry();
    }
  }, [show]);

  // Initialize form with current profile data
  useEffect(() => {
    if (currentProfile) {
      setDisplayName(currentProfile.display_name || '');
      setCountryFlag(currentProfile.country_flag || '');
    }
  }, [currentProfile]);

  // Detect user's country via IP geolocation
  const detectUserCountry = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.country_code) {
        // Map country code to emoji flag
        const countryMap = {
          'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺',
          'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸',
          'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳', 'IN': '🇮🇳',
          'BR': '🇧🇷', 'MX': '🇲🇽', 'RU': '🇷🇺', 'UZ': '🇺🇿',
          'TR': '🇹🇷', 'SA': '🇸🇦', 'AE': '🇦🇪', 'NL': '🇳🇱',
          'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'PL': '🇵🇱',
          'CZ': '🇨🇿', 'HU': '🇭🇺', 'AT': '🇦🇹', 'CH': '🇨🇭',
          'BE': '🇧🇪', 'PT': '🇵🇹', 'GR': '🇬🇷', 'IL': '🇮🇱',
          'EG': '🇪🇬', 'ZA': '🇿🇦', 'NG': '🇳🇬', 'KE': '🇰🇪',
          'MA': '🇲🇦', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴',
          'PE': '🇵🇪', 'VE': '🇻🇪', 'TH': '🇹🇭', 'VN': '🇻🇳',
          'ID': '🇮🇩', 'MY': '🇲🇾', 'SG': '🇸🇬', 'PH': '🇵🇭',
          'BD': '🇧🇩', 'PK': '🇵🇰', 'LK': '🇱🇰', 'NP': '🇳🇵'
        };
        
        const detectedFlag = countryMap[data.country_code.toUpperCase()];
        if (detectedFlag) {
          setDetectedCountry({ flag: detectedFlag, name: data.country_name });
          setCountryFlag(detectedFlag);
        }
      }
    } catch (error) {
      console.log('Country detection failed, no problem:', error);
    }
  };

  // Filter countries based on search
  const filteredCountries = COUNTRY_FLAGS.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.flag.includes(countrySearch)
  );

  // Handle form submission
  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }

    if (!countryFlag) {
      setError('Please select your country');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: userTelegramId,
          display_name: displayName.trim(),
          country_flag: countryFlag
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save profile');
      }

      onSave(result.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle country selection
  const selectCountry = (country) => {
    setCountryFlag(country.flag);
    setShowCountryDropdown(false);
    setCountrySearch('');
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content profile-modal">
        <div className="modal-header">
          <h2 className="modal-title">🏆 Join the Leaderboard!</h2>
          <p className="modal-subtitle">Complete your profile to start ranking</p>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {detectedCountry && (
            <div className="detection-notice">
              <span className="detection-icon">📍</span>
              <span>Detected location: {detectedCountry.flag} {detectedCountry.name}</span>
            </div>
          )}

          {/* Display Name Input */}
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              disabled={saving}
            />
            <div className="form-hint">This is how you'll appear on the leaderboard</div>
          </div>

          {/* Country Flag Selection */}
          <div className="form-group">
            <label className="form-label">Country</label>
            <div className="country-selector">
              <button
                type="button"
                className="country-button"
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                disabled={saving}
              >
                {countryFlag ? (
                  <span className="selected-country">
                    <span className="country-flag-large">{countryFlag}</span>
                    <span className="country-name">
                      {COUNTRY_FLAGS.find(c => c.flag === countryFlag)?.name || 'Unknown'}
                    </span>
                  </span>
                ) : (
                  <span className="placeholder">Select your country</span>
                )}
                <span className="dropdown-arrow">▼</span>
              </button>

              {showCountryDropdown && (
                <div className="country-dropdown">
                  <div className="country-search">
                    <input
                      type="text"
                      placeholder="Search countries..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  
                  <div className="country-list">
                    {filteredCountries.map((country) => (
                      <button
                        key={country.flag}
                        type="button"
                        className="country-option"
                        onClick={() => selectCountry(country)}
                      >
                        <span className="country-flag-small">{country.flag}</span>
                        <span className="country-name">{country.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn"
            onClick={onClose}
            disabled={saving}
          >
            Skip for Now
          </button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={saving || !displayName.trim() || !countryFlag}
          >
            {saving ? (
              <>
                <span className="loading-spinner">⏳</span>
                Saving...
              </>
            ) : (
              'Join Leaderboard!'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
