const NS = 'meowchi:'

export const storage = {
  get(key, def = null) {
    try {
      const v = localStorage.getItem(NS + key)
      return v ? JSON.parse(v) : def
    } catch { return def }
  },
  set(key, val) {
    try { localStorage.setItem(NS + key, JSON.stringify(val)) } catch {}
  },
  remove(key) { try { localStorage.removeItem(NS + key) } catch {} }
}
