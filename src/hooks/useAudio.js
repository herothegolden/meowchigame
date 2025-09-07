// src/hooks/useAudio.js - FIXED global audio system with persistent background music
import { useState, useEffect, useRef, useCallback } from 'react';

// YOUR IMAGEKIT.IO SOUND FILES
const SOUND_URLS = {
  // GAME SOUNDS (short, punchy, viral)
  match: 'https://ik.imagekit.io/59r2kpz8r/Sounds/pop-sound.mp3?updatedAt=1757264187792',
  swap: 'https://ik.imagekit.io/59r2kpz8r/Sounds/swoosh.mp3?updatedAt=1757264187563',
  invalidMove: 'https://ik.imagekit.io/59r2kpz8r/Sounds/denied.mp3?updatedAt=1757264187566',
  bomb: 'https://ik.imagekit.io/59r2kpz8r/Sounds/explosion.mp3?updatedAt=1757264187729',
  cascade: 'https://ik.imagekit.io/59r2kpz8r/Sounds/combo.mp3?updatedAt=1757264187729',
  
  // UI SOUNDS (minimal, clean)
  buttonClick: 'https://ik.imagekit.io/59r2kpz8r/Sounds/click.mp3?updatedAt=1757264187586',
  itemActivate: 'https://ik.imagekit.io/59r2kpz8r/Sounds/powerup.mp3?updatedAt=1757264187592',
  scoreUpdate: 'https://ik.imagekit.io/59r2kpz8r/Sounds/coin.mp3?updatedAt=1757264187557',
  
  // TIMER SOUNDS (attention-grabbing)
  tick: 'https://ik.imagekit.io/59r2kpz8r/Sounds/tick.mp3?updatedAt=1757264191209',
  timeWarning: 'https://ik.imagekit.io/59r2kpz8r/Sounds/warning.mp3?updatedAt=1757264191395',
  gameOver: 'https://ik.imagekit.io/59r2kpz8r/Sounds/game-over.mp3?updatedAt=1757264187701',
  
  // BACKGROUND MUSIC (looping, chill)
  bgMusic: 'https://ik.imagekit.io/59r2kpz8r/Sounds/background-loop.mp3?updatedAt=1757264188456',
};

// GLOBAL AUDIO STATE - Persistent across page navigation
let globalAudioContext = null;
let globalAudioBuffers = new Map();
let globalGainNode = null;
let globalMusicElement = null;
let globalInitialized = false;
let globalIsEnabled = true;
let globalIsMusicEnabled = false;
let globalVolume = 0.7;
let globalLastPlayed = new Map();

// GLOBAL INITIALIZATION - Only happens once
const initializeGlobalAudio = async () => {
  if (globalInitialized) {
    console.log('🎵 Using existing global audio context');
    return globalAudioContext;
  }

  try {
    console.log('🚀 Initializing global audio context...');
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API not supported');
    }
    
    globalAudioContext = new AudioContextClass();
    
    // Create master gain node
    globalGainNode = globalAudioContext.createGain();
    globalGainNode.connect(globalAudioContext.destination);
    globalGainNode.gain.value = globalVolume;
    
    globalInitialized = true;
    console.log('✅ Global audio context ready');
    
    return globalAudioContext;
  } catch (error) {
    console.warn('⚠️ Global audio initialization failed:', error);
    return null;
  }
};

// GLOBAL SOUND PRELOADING - Only happens once
const preloadGlobalSounds = async () => {
  if (globalAudioBuffers.size > 0) {
    console.log('🎵 Using cached audio buffers');
    return;
  }

  if (!globalAudioContext) return;
  
  console.log('🎵 Preloading sounds globally...');
  let successCount = 0;
  
  const loadPromises = Object.entries(SOUND_URLS).map(async ([key, url]) => {
    if (key === 'bgMusic') return; // Skip background music in preload
    
    try {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await globalAudioContext.decodeAudioData(arrayBuffer);
      globalAudioBuffers.set(key, audioBuffer);
      successCount++;
      console.log(`✅ Cached: ${key}`);
    } catch (error) {
      console.warn(`❌ Failed to cache ${key}:`, error.message);
    }
  });

  await Promise.allSettled(loadPromises);
  console.log(`🎉 Cached ${successCount} sounds globally`);
};

// GLOBAL BACKGROUND MUSIC - Persistent across pages
const startGlobalBackgroundMusic = async () => {
  if (globalMusicElement || !globalIsMusicEnabled) return;

  try {
    console.log('🎶 Starting global background music...');
    
    const audio = new Audio(SOUND_URLS.bgMusic);
    audio.loop = true;
    audio.volume = globalVolume * 0.2; // Quieter background music
    audio.preload = 'auto';
    
    // Add event listeners
    audio.addEventListener('error', (e) => {
      console.warn('⚠️ Background music error:', e);
      globalMusicElement = null;
    });
    
    audio.addEventListener('canplaythrough', () => {
      console.log('🎶 Background music ready');
    });
    
    await audio.play();
    globalMusicElement = audio;
    console.log('✅ Global background music started');
  } catch (error) {
    console.warn('⚠️ Background music failed:', error);
    globalMusicElement = null;
  }
};

const stopGlobalBackgroundMusic = () => {
  if (globalMusicElement) {
    try {
      globalMusicElement.pause();
      globalMusicElement.currentTime = 0;
      globalMusicElement = null;
      console.log('🔇 Global background music stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping background music:', error);
      globalMusicElement = null;
    }
  }
};

// REACT HOOK - Uses global state
export const useAudio = () => {
  const [isEnabled, setIsEnabled] = useState(globalIsEnabled);
  const [isMusicEnabled, setIsMusicEnabled] = useState(globalIsMusicEnabled);
  const [volume, setVolume] = useState(globalVolume);
  const [isLoading, setIsLoading] = useState(!globalInitialized);
  const [initializationError, setInitializationError] = useState(null);
  
  const initCallbackRef = useRef(null);

  // Initialize global audio on first user interaction
  const initializeAudio = useCallback(async () => {
    if (globalInitialized) {
      setIsLoading(false);
      return globalAudioContext;
    }
    
    try {
      const context = await initializeGlobalAudio();
      if (context) {
        await preloadGlobalSounds();
        setInitializationError(null);
      }
      setIsLoading(false);
      return context;
    } catch (error) {
      console.error('🚨 Audio initialization error:', error);
      setInitializationError(error.message);
      setIsLoading(false);
      return null;
    }
  }, []);

  // Setup initialization on first user interaction
  useEffect(() => {
    if (globalInitialized) {
      setIsLoading(false);
      return;
    }

    const handleFirstInteraction = () => {
      if (initCallbackRef.current) {
        clearTimeout(initCallbackRef.current);
      }
      
      initCallbackRef.current = setTimeout(() => {
        initializeAudio();
      }, 100);
      
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    document.addEventListener('click', handleFirstInteraction);

    return () => {
      if (initCallbackRef.current) {
        clearTimeout(initCallbackRef.current);
      }
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, [initializeAudio]);

  // Update global state when local state changes
  useEffect(() => {
    globalIsEnabled = isEnabled;
    if (globalGainNode) {
      globalGainNode.gain.value = isEnabled ? volume : 0;
    }
  }, [isEnabled, volume]);

  useEffect(() => {
    globalIsMusicEnabled = isMusicEnabled;
    globalVolume = volume;
    
    if (globalMusicElement) {
      globalMusicElement.volume = isMusicEnabled ? volume * 0.2 : 0;
    }
    
    if (isMusicEnabled && !globalMusicElement) {
      startGlobalBackgroundMusic();
    } else if (!isMusicEnabled && globalMusicElement) {
      stopGlobalBackgroundMusic();
    }
  }, [isMusicEnabled, volume]);

  // FAST SOUND PLAYING - Uses global buffers
  const playSound = useCallback((soundKey, options = {}) => {
    if (!globalIsEnabled || !globalAudioContext || !globalInitialized) return;
    
    const { 
      volume: soundVolume = 1, 
      playbackRate = 1,
      delay = 0,
      preventSpam = true,
      spamDelay = 50
    } = options;

    // Spam protection
    if (preventSpam) {
      const now = Date.now();
      const lastPlayed = globalLastPlayed.get(soundKey) || 0;
      if (now - lastPlayed < spamDelay) return;
      globalLastPlayed.set(soundKey, now);
    }

    const buffer = globalAudioBuffers.get(soundKey);
    if (!buffer) {
      console.warn(`🔇 Sound not found: ${soundKey}`);
      return;
    }

    try {
      // Resume audio context if suspended
      if (globalAudioContext.state === 'suspended') {
        globalAudioContext.resume().catch(err => {
          console.warn('⚠️ Failed to resume audio context:', err);
        });
      }

      const source = globalAudioContext.createBufferSource();
      const gainNode = globalAudioContext.createGain();
      
      source.buffer = buffer;
      source.playbackRate.value = Math.max(0.25, Math.min(4, playbackRate));
      source.connect(gainNode);
      gainNode.connect(globalGainNode);
      gainNode.gain.value = Math.max(0, Math.min(1, soundVolume));
      
      source.start(globalAudioContext.currentTime + Math.max(0, delay));
      
      // Cleanup
      const cleanup = () => {
        try {
          source.disconnect();
          gainNode.disconnect();
        } catch (err) {
          // Already disconnected
        }
      };
      
      source.onended = cleanup;
      setTimeout(cleanup, 3000); // Fallback cleanup
      
    } catch (error) {
      console.warn(`⚠️ Failed to play ${soundKey}:`, error.message);
    }
  }, []);

  // Game-specific sound functions
  const gameSounds = {
    // MATCH SOUNDS
    playMatch: (cascadeLevel = 0) => {
      if (cascadeLevel > 0) {
        playSound('cascade', { 
          playbackRate: 1 + (cascadeLevel * 0.1),
          volume: Math.min(1, 0.8 + (cascadeLevel * 0.1))
        });
      } else {
        playSound('match', { volume: 0.8 });
      }
    },

    // MOVEMENT SOUNDS
    playSwap: () => playSound('swap', { volume: 0.6 }),
    playInvalidMove: () => playSound('invalidMove', { volume: 0.7, playbackRate: 1.2 }),
    
    // SPECIAL EFFECTS
    playBomb: () => playSound('bomb', { volume: 1.0, playbackRate: 0.9 }),
    
    // UI SOUNDS
    playButtonClick: () => playSound('buttonClick', { volume: 0.5, spamDelay: 100 }),
    playItemActivate: () => playSound('itemActivate', { volume: 0.8 }),
    playScoreUpdate: () => playSound('scoreUpdate', { volume: 0.6 }),
    
    // TIMER SOUNDS
    playTick: () => playSound('tick', { volume: 0.4 }),
    playTimeWarning: () => playSound('timeWarning', { volume: 0.9 }),
    playGameOver: () => playSound('gameOver', { volume: 1.0 }),
  };

  // Manual controls
  const playBackgroundMusic = useCallback(() => {
    if (!globalIsMusicEnabled) {
      globalIsMusicEnabled = true;
      setIsMusicEnabled(true);
      startGlobalBackgroundMusic();
    }
  }, []);

  const stopBackgroundMusic = useCallback(() => {
    if (globalIsMusicEnabled) {
      globalIsMusicEnabled = false;
      setIsMusicEnabled(false);
      stopGlobalBackgroundMusic();
    }
  }, []);

  return {
    // State
    isEnabled,
    isMusicEnabled,
    volume,
    isLoading,
    initializationError,
    
    // Controls
    setIsEnabled,
    setIsMusicEnabled,
    setVolume,
    
    // Sound functions
    playSound,
    ...gameSounds,
    
    // Background music
    playBackgroundMusic,
    stopBackgroundMusic,
    
    // Utility
    reinitialize: initializeAudio,
  };
};
