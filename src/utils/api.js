const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const apiCall = async (endpoint, data) => {
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
