import { createHmac } from 'crypto';

/**
 * Validates the initData string from Telegram.
 * @param {string} initData - The initData string from the Telegram Web App.
 * @param {string} botToken - Your bot's secret token.
 * @returns {boolean} - True if the data is valid, false otherwise.
 */
export function validate(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  // The keys must be sorted alphabetically before building the data-check-string.
  const keys = Array.from(params.keys()).sort();
  const dataCheckString = keys.map(key => `${key}=${params.get(key)}`).join('\n');
  
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  return hash === calculatedHash;
}

