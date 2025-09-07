// src/hooks/useAudio.js - Enhanced version with better error handling
import { useState, useEffect, useRef, useCallback } from 'react';

// YOUR IMAGEKIT.IO SOUND FILES - All 12 sounds ready!
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

export const useAudio = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(true);
  const [audioContext, setAudioContext] = useState(null);
  const [initializationError, setInitializationError] = useState(null);
  
  const audioBuffers = useRef(new Map());
  const musicRef = useRef(null);
  const gainNodeRef = useRef(null);
  const lastPlayedRef = useRef(new Map());
  const isInitializedRef = useRef(false);

  // Initialize Web Audio API (better performance than HTML5 audio)
  const initializeAudio = useCallback(async () => {
    if (isInitializedRef.current) return audioContext;
    
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported');
      }
      
      const context = new AudioContextClass();
      
      // Create master gain node for volume control
      const gainNode = context.createGain();
      gainNode.connect(context.destination);
      gainNode.gain.value = volume;
      
      setAudioContext(context);
      gainNodeRef.current = gainNode;
      isInitializedRef.current = true;
      setInitializationError(null);
      
      console.log('🔊 Audio context initialized successfully');
      return context;
    } catch (error) {
      console.warn('⚠️ Audio initialization failed:', error);
      setInitializationError(error.message);
      setIsLoading(false);
      return null;
    }
  }, [volume, audioContext]);

  // Preload audio buffers for instant playback with better error handling
  const preloadSounds = useCallback(async (context) => {
    if (!context) {
      setIsLoading(false);
      return;
    }
    
    console.log('🎵 Preloading sounds...');
    let successCount = 0;
    let errorCount = 0;
    
    const loadPromises = Object.entries(SOUND_URLS).map(async ([key, url]) => {
      if (key === 'bgMusic') return; // Skip background music in preload
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(url, { 
          signal: controller.signal,
          cache: 'force-cache' // Use browser cache if available
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        audioBuffers.current.set(key, audioBuffer);
        successCount++;
        console.log(`✅ Loaded: ${key}`);
      } catch (error) {
        errorCount++;
        console.warn(`❌ Failed to load ${key}:`, error.message);
      }
    });

    await Promise.allSettled(loadPromises);
    setIsLoading(false);
    
    console.log(`🎉 Audio loading complete: ${successCount} success, ${errorCount} errors`);
    
    // Show warning if too many sounds failed to load
    if (errorCount > successCount) {
      console.warn('⚠️ Most sounds failed to load. Audio experience may be degraded.');
    }
  }, []);

  // Initialize audio system with improved error handling
  useEffect(() => {
    let isUnmounted = false;
    
    const init = async () => {
      try {
        const context = await initializeAudio();
        if (!isUnmounted && context) {
          await preloadSounds(context);
        }
      } catch (error) {
        if (!isUnmounted) {
          console.error('🚨 Audio initialization failed:', error);
          setInitializationError(error.message);
          setIsLoading(false);
        }
      }
    };

    // Wait for user interaction (TMA requirement)
    const handleFirstInteraction = () => {
      init();
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    document.addEventListener('click', handleFirstInteraction);

    return () => {
      isUnmounted = true;
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, [initializeAudio, preloadSounds]);

  // Update volume with error handling
  useEffect(() => {
    try {
      if (gainNodeRef.current && isEnabled) {
        gainNodeRef.current.gain.value = volume;
      }
      if (musicRef.current) {
        musicRef.current.volume = isMusicEnabled ? volume * 0.3 : 0;
      }
    } catch (error) {
      console.warn('⚠️ Volume update failed:', error);
    }
  }, [volume, isEnabled, isMusicEnabled]);

  // Play sound effect with enhanced spam protection and error handling
  const playSound = useCallback((soundKey, options = {}) => {
    // Early returns for better performance
    if (!isEnabled || !audioContext || isLoading || initializationError) {
      return;
    }
    
    const { 
      volume: soundVolume = 1, 
      playbackRate = 1,
      delay = 0,
      preventSpam = true,
      spamDelay = 50 // Reduced from 100ms to 50ms for better responsiveness
    } = options;

    // Spam protection
    if (preventSpam) {
      const now = Date.now();
      const lastPlayed = lastPlayedRef.current.get(soundKey) || 0;
      if (now - lastPlayed < spamDelay) return;
      lastPlayedRef.current.set(soundKey, now);
    }

    const buffer = audioBuffers.current.get(soundKey);
    if (!buffer) {
      console.warn(`🔇 Sound not found: ${soundKey}`);
      return;
    }

    try {
      // Resume audio context if suspended (mobile requirement)
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => {
          console.warn('⚠️ Failed to resume audio context:', err);
        });
      }

      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      
      source.buffer = buffer;
      source.playbackRate.value = Math.max(0.25, Math.min(4, playbackRate)); // Clamp playback rate
      source.connect(gainNode);
      gainNode.connect(gainNodeRef.current);
      gainNode.gain.value = Math.max(0, Math.min(1, soundVolume)); // Clamp volume
      
      source.start(audioContext.currentTime + Math.max(0, delay));
      
      // Clean up after playback with timeout fallback
      const cleanup = () => {
        try {
          source.disconnect();
          gainNode.disconnect();
        } catch (err) {
          // Node might already be disconnected
        }
      };
      
      source.onended = cleanup;
      setTimeout(cleanup, 5000); // Fallback cleanup after 5 seconds
      
    } catch (error) {
      console.warn(`⚠️ Failed to play ${soundKey}:`, error.message);
    }
  }, [isEnabled, audioContext, isLoading, initializationError]);

  // Background music management with better error handling
  const playBackgroundMusic = useCallback(async () => {
    if (!isMusicEnabled || musicRef.current) return;

    try {
      const audio = new Audio(SOUND_URLS.bgMusic);
      audio.loop = true;
      audio.volume = volume * 0.3;
      audio.preload = 'auto';
      
      // Better error handling for audio loading
      audio.addEventListener('error', (e) => {
        console.warn('⚠️ Background music error:', e);
        musicRef.current = null;
      });
      
      audio.addEventListener('canplaythrough', () => {
        console.log('🎶 Background music ready');
      });
      
      await audio.play();
      musicRef.current = audio;
      console.log('🎶 Background music started');
    } catch (error) {
      console.warn('⚠️ Background music failed:', error.message);
      musicRef.current = null;
    }
  }, [isMusicEnabled, volume]);

  const stopBackgroundMusic = useCallback(() => {
    if (musicRef.current) {
      try {
        musicRef.current.pause();
        musicRef.current.currentTime = 0;
        musicRef.current = null;
        console.log('🔇 Background music stopped');
      } catch (error) {
        console.warn('⚠️ Error stopping background music:', error);
        musicRef.current = null;
      }
    }
  }, []);

  // Background music control
  useEffect(() => {
    if (isMusicEnabled && !initializationError) {
      playBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
  }, [isMusicEnabled, playBackgroundMusic, stopBackgroundMusic, initializationError]);

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

  // Enhanced cleanup on unmount
  useEffect(() => {
    return () => {
      stopBackgroundMusic();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(err => {
          console.warn('⚠️ Error closing audio context:', err);
        });
      }
    };
  }, [audioContext, stopBackgroundMusic]);

  return {
    // State
    isEnabled,
    isMusicEnabled,
    volume,
    isLoading,
    initializationError, // New: expose initialization errors
    
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
    reinitialize: initializeAudio, // New: allow manual reinitialization
  };
};
