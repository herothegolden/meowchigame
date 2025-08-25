// Minimal audio helper; unlock on first user gesture
let unlocked = false
const buffers = new Map()

export function unlockAudio() {
  if (unlocked) return
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  gain.gain.value = 0
  osc.connect(gain).connect(ctx.destination)
  osc.start(0); osc.stop(0.05)
  unlocked = true
}

export async function loadSfx(url) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (buffers.has(url)) return buffers.get(url)
  const res = await fetch(url)
  const arr = await res.arrayBuffer()
  const buf = await ctx.decodeAudioData(arr)
  buffers.set(url, { ctx, buf })
  return buffers.get(url)
}

export function play(bufObj) {
  const { ctx, buf } = bufObj
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  src.start(0)
}
