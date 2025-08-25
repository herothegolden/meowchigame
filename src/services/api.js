// Fetch wrapper for your backend; includes Telegram initData if available
export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const tg = window.Telegram?.WebApp
  if (tg?.initData) {
    headers['X-Telegram-InitData'] = tg.initData
  }
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) throw new Error('API ' + res.status)
  return res.json()
}
