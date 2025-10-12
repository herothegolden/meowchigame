const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Initialize user in database via /api/validate
 * Called once on app startup to ensure user exists
 */
export const initializeUser = async () => {
  const tg = window.Telegram?.WebApp;
  
  if (!tg?.initData || !BACKEND_URL) {
    throw new Error('Connection required. Please open from Telegram.');
  }

  // Extract user from Telegram initData
  const params = new URLSearchParams(tg.initData);
  const userParam = params.get('user');
  
  if (!userParam) {
    throw new Error('Invalid Telegram user data');
  }
  
  const user = JSON.parse(userParam);

  const response = await fetch(`${BACKEND_URL}/api/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      initData: tg.initData,
      user: user
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Initialization failed: ${response.status}`);
  }

  return response.json();
};

export const apiCall = async (endpoint, data = {}) => {
  const tg = window.Telegram?.WebApp;
  
  if (!tg?.initData || !BACKEND_URL) {
    throw new Error('Connection required. Please open from Telegram.');
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: tg.initData, ...data }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error ${response.status}`);
  }

  return response.json();
};

export const showSuccess = (message) => {
  const tg = window.Telegram?.WebApp;
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  if (tg?.showPopup) {
    tg.showPopup({ title: 'Success', message, buttons: [{ type: 'ok' }] });
  }
};

export const showError = (message) => {
  const tg = window.Telegram?.WebApp;
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
  if (tg?.showPopup) {
    tg.showPopup({ title: 'Error', message, buttons: [{ type: 'ok' }] });
  } else {
    alert(message);
  }
};

export const claimStreak = async () => {
  return await apiCall('/api/streak/claim-streak');
};
