// src/audio.js
import { IS_IOS } from "./platform";

let ctx;
let buffers = {};
let muted = false;
let unlocked = false;
let loaded = false;

async function ensureCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch {}
  }
  return ctx;
}

export async function unlock() {
  await ensureCtx();
  // Extra safety for WKWebView on iOS
  if (IS_IOS && ctx.state !== "running") {
    const once = async () => { try { await ctx.resume(); } catch {} };
    window.addEventListener("touchend", once, { once: true, passive: true });
  }
  unlocked = true;
}

async function loadOne(name, url) {
  await ensureCtx();
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  // Safari prefers the callback form for decodeAudioData
  buffers[name] = await new Promise((resolve, reject) => {
    ctx.decodeAudioData(arr, resolve, reject);
  });
}

export async function preload(map) {
  if (loaded) return;
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
