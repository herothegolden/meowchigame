// src/audio.js
let ctx;
let buffers = {};
let muted = false;
let unlocked = false;
let loaded = false;

async function ensureCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

export async function unlock() {
  // must be called after a user gesture (e.g., Play tap)
  await ensureCtx();
  unlocked = true;
}

async function loadOne(name, url) {
  await ensureCtx();
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  buffers[name] = await ctx.decodeAudioData(arr);
}

export async function preload(map) {
  if (loaded) return; // idempotent
  await ensureCtx();
  await Promise.all(Object.entries(map).map(([k, v]) => loadOne(k, v)));
  loaded = true;
}

export function play(name, { volume = 0.8, rate = 1.0 } = {}) {
  if (muted || !unlocked) return;
  const buf = buffers[name];
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(ctx.destination);
  src.start();
}

export function setMuted(v) { muted = !!v; }
export function isLoaded() { return loaded; }
// src/audio.js
let ctx;
let buffers = {};
let muted = false;
let unlocked = false;
let loaded = false;

async function ensureCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

export async function unlock() {
  // must be called after a user gesture (e.g., Play tap)
  await ensureCtx();
  unlocked = true;
}

async function loadOne(name, url) {
  await ensureCtx();
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  buffers[name] = await ctx.decodeAudioData(arr);
}

export async function preload(map) {
  if (loaded) return; // idempotent
  await ensureCtx();
  await Promise.all(Object.entries(map).map(([k, v]) => loadOne(k, v)));
  loaded = true;
}

export function play(name, { volume = 0.8, rate = 1.0 } = {}) {
  if (muted || !unlocked) return;
  const buf = buffers[name];
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(ctx.destination);
  src.start();
}

export function setMuted(v) { muted = !!v; }
export function isLoaded() { return loaded; }
