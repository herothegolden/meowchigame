// src/hooks/useAudio.js - FIXED VERSION with proper cleanup
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

// FIXED: Controlled global state with proper cleanup
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.buffers = new Map();
    this.gainNode = null;
    this.musicElement = null;
    this.initialized = false;
    this.isEnabled = true;
    this.isMusicEnabled = false;
    this.volume = 0.7;
    this.lastPlayed = new Map();
    this.activeSources = new Set(); // FIXED: Track active sources for cleanup
  }

  async initialize() {
    if (this.initialized) {
      console.log('🎵 Audio already initialized');
      return this.audioContext;
    }

    try {
      console.log('🚀 Initializing audio context...');
      
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported');
      }
      
      this.audioContext = new AudioContextClass();
      
      // Create master gain node
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;
      
      this.initialized = true;
      console.log('✅ Audio context ready');
      
      return this.audioContext;
    } catch (error) {
      console.warn('⚠️ Audio initialization failed:', error);
      return null;
    }
  }

  async preloadSounds() {
    if (this.buffers.size > 0) {
      console.log('🎵 Sounds already cached');
      return;
    }

    if (!this.audioContext) return;
    
    console.log('🎵 Preloading sounds...');
    let successCount = 0;
    
    const loadPromises = Object.entries(SOUND_URLS).map(async ([key, url]) => {
      if (key === 'bgMusic') return; // Skip background music in preload
      
      try {
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.buffers.set(key, audioBuffer);
        successCount++;
        console.log(`✅ Cached: ${key}`);
      } catch (error) {
        console.warn(`❌ Failed to cache ${key}:`, error.message);
      }
    });

    await Promise.allSettled(loadPromises);
    console.log(`🎉 Cached ${successCount} sounds`);
  }

  async startBackgroundMusic() {
    if (this.musicElement || !this.isMusicEnabled) return;

    try {
      console.log('🎶 Starting background music...');
      
      const audio = new Audio(SOUND_URLS.bgMusic);
      audio.loop = true;
      audio.volume = this.volume * 0.2; // Quieter background music
      audio.preload = 'auto';
      
      // FIXED: Proper error handling
      audio.addEventListener('error', (e) => {
        console.warn('⚠️ Background music error:', e);
        this.musicElement = null;
      });
      
      audio.addEventListener('canplaythrough', () => {
        console.log('🎶 Background music ready');
      });
      
      await audio.play();
      this.musicElement = audio;
      console.log('✅ Background music started');
    } catch (error) {
      console.warn('⚠️ Background music failed:', error);
      this.musicElement = null;
    }
  }

  stopBackgroundMusic() {
    if (this.musicElement) {
      try {
        this.musicElement.pause();
        this.musicElement.currentTime = 0;
        this.musicElement = null;
        console.log('🔇 Background music stopped');
      } catch (error) {
        console.warn('⚠️ Error stopping background music:', error);
        this.musicElement = null;
      }
    }
  }

  // FIXED: Sound playing with proper cleanup
  playSound(soundKey, options = {}) {
    if (!this.isEnabled || !this.audioContext || !this.initialized) return;
    
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
      const lastPlayed = this.lastPlayed.get(soundKey) || 0;
      if (now - lastPlayed < spamDelay) return;
      this.lastPlayed.set(soundKey, now);
    }

    const buffer = this.buffers.get(soundKey);
    if (!buffer) {
      console.warn(`🔇 Sound not found: ${soundKey}`);
      return;
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(err => {
          console.warn('⚠️ Failed to resume audio context:', err);
        });
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      source.playbackRate.value = Math.max(0.25, Math.min(4, playbackRate));
      source.connect(gainNode);
      gainNode.connect(this.gainNode);
      gainNode.gain.value = Math.max(0, Math.min(1, soundVolume));
      
      // FIXED: Track active sources for cleanup
      this.activeSources.add(source);
      
      source.start(this.audioContext.currentTime + Math.max(0, delay));
      
      // FIXED: Proper cleanup
      const cleanup = () => {
        try {
          this.activeSources.delete(source);
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
  }

  // FIXED: Proper cleanup method
  cleanup() {
    console.log('🧹 Cleaning up audio resources...');
    
    // Stop all active sources
    this.activeSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Already stopped/disconnected
      }
    });
    this.activeSources.clear();
    
    // Stop background music
    this.stopBackgroundMusic();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(err => {
        console.warn('⚠️ Error closing audio context:', err);
      });
    }
    
    // Reset state
    this.audioContext = null;
    this.gainNode = null;
    this.buffers.clear();
    this.initialized = false;
    
    console.log('✅ Audio cleanup complete');
  }

  // Update settings
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (this.gainNode) {
      this.gainNode.gain.value = enabled ? this.volume : 0;
    }
  }

  setMusicEnabled(enabled) {
    this.isMusicEnabled = enabled;
    if (this.musicElement) {
      this.musicElement.volume = enabled ? this.volume * 0.2 : 0;
    }
    
    if (enabled && !this.musicElement) {
      this.startBackgroundMusic();
    } else if (!enabled && this.musicElement) {
      this.stopBackgroundMusic();
    }
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.gainNode) {
      this.gainNode.gain.value = this.isEnabled ? volume : 0;
    }
    if (this.musicElement) {
      this.musicElement.volume = this.isMusicEnabled ? volume * 0.2 : 0;
    }
  }
}

// FIXED: Single global instance with proper lifecycle
let globalAudioManager = null;

// FIXED: Get or create manager
const getAudioManager = () => {
  if (!globalAudioManager) {
    globalAudioManager = new AudioManager();
  }
  return globalAudioManager;
};

// FIXED: Cleanup function for TMA navigation
const cleanupAudio = () => {
  if (globalAudioManager) {
    globalAudioManager.cleanup();
    globalAudioManager = null;
  }
};

// FIXED: REACT HOOK with proper cleanup
export const useAudio = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState(null);
  
  const initCallbackRef = useRef(null);
  const managerRef = useRef(null);

  // Get manager instance
  useEffect(() => {
    managerRef.current = getAudioManager();
  }, []);

  // Initialize audio on first user interaction
  const initializeAudio = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager || manager.initialized) {
      setIsLoading(false);
      return manager?.audioContext;
    }
    
    try {
      const context = await manager.initialize();
      if (context) {
        await manager.preloadSounds();
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
    const manager = managerRef.current;
    if (!manager || manager.initialized) {
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

  // Update manager settings when state changes
  useEffect(() => {
    const manager = managerRef.current;
    if (manager) {
      manager.setEnabled(isEnabled);
    }
  }, [isEnabled]);

  useEffect(() => {
    const manager = managerRef.current;
    if (manager) {
      manager.setMusicEnabled(isMusicEnabled);
    }
  }, [isMusicEnabled]);

  useEffect(() => {
    const manager = managerRef.current;
    if (manager) {
      manager.setVolume(volume);
    }
  }, [volume]);

  // FIXED: Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't cleanup on every unmount, only when truly needed
      // The global manager persists across navigation
    };
  }, []);

  // Sound playing functions
  const playSound = useCallback((soundKey, options = {}) => {
    const manager = managerRef.current;
    if (manager) {
      manager.playSound(soundKey, options);
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
    if (!isMusicEnabled) {
      setIsMusicEnabled(true);
    }
  }, [isMusicEnabled]);

  const stopBackgroundMusic = useCallback(() => {
    if (isMusicEnabled) {
      setIsMusicEnabled(false);
    }
  }, [isMusicEnabled]);

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
    cleanup: cleanupAudio, // FIXED: Expose cleanup for TMA navigation
  };
};

// FIXED: Export cleanup for app-level use
export { cleanupAudio };
