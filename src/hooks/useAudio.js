// src/hooks/useAudio.js - TMA-optimized audio system
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
  const [isMusicEnabled, setIsMusicEnabled] = useState(false); // Music off by default
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(true);
  const [audioContext, setAudioContext] = useState(null);
  
  const audioBuffers = useRef(new Map());
  const musicRef = useRef(null);
  const gainNodeRef = useRef(null);
  const lastPlayedRef = useRef(new Map()); // Prevent spam

  // Initialize Web Audio API (better performance than HTML5 audio)
  const initializeAudio = useCallback(async () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      
      // Create master gain node for volume control
      const gainNode = context.createGain();
      gainNode.connect(context.destination);
      gainNode.gain.value = volume;
      
      setAudioContext(context);
      gainNodeRef.current = gainNode;
      
      console.log('🔊 Audio context initialized');
      return context;
    } catch (error) {
      console.warn('⚠️ Audio not supported:', error);
      return null;
    }
  }, [volume]);

  // Preload audio buffers for instant playback
  const preloadSounds = useCallback(async (context) => {
    if (!context) return;
    
    console.log('🎵 Preloading sounds...');
    const loadPromises = Object.entries(SOUND_URLS).map(async ([key, url]) => {
      if (key === 'bgMusic') return; // Skip background music in preload
      
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        audioBuffers.current.set(key, audioBuffer);
        console.log(`✅ Loaded: ${key}`);
      } catch (error) {
        console.warn(`❌ Failed to load ${key}:`, error);
      }
    });

    await Promise.allSettled(loadPromises);
    setIsLoading(false);
    console.log(`🎉 Loaded ${audioBuffers.current.size} sounds`);
  }, []);

  // Initialize audio system
  useEffect(() => {
    const init = async () => {
      const context = await initializeAudio();
      if (context) {
        await preloadSounds(context);
      } else {
        setIsLoading(false);
      }
    };

    // Wait for user interaction (TMA requirement)
    const handleFirstInteraction = () => {
      init();
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('touchstart', handleFirstInteraction);
    document.addEventListener('click', handleFirstInteraction);

    return () => {
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, [initializeAudio, preloadSounds]);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isEnabled ? volume : 0;
    }
    if (musicRef.current) {
      musicRef.current.volume = isMusicEnabled ? volume * 0.3 : 0; // Music quieter
    }
  }, [volume, isEnabled, isMusicEnabled]);

  // Play sound effect with spam protection
  const playSound = useCallback((soundKey, options = {}) => {
    if (!isEnabled || !audioContext || isLoading) return;
    
    const { 
      volume: soundVolume = 1, 
      playbackRate = 1,
      delay = 0,
      preventSpam = true,
      spamDelay = 100 // ms
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
        audioContext.resume();
      }

      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      source.connect(gainNode);
      gainNode.connect(gainNodeRef.current);
      gainNode.gain.value = soundVolume;
      
      source.start(audioContext.currentTime + delay);
      
      // Clean up after playback
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
      
    } catch (error) {
      console.warn(`⚠️ Failed to play ${soundKey}:`, error);
    }
  }, [isEnabled, audioContext, isLoading]);

  // Background music management
  const playBackgroundMusic = useCallback(async () => {
    if (!isMusicEnabled || musicRef.current) return;

    try {
      const audio = new Audio(SOUND_URLS.bgMusic);
      audio.loop = true;
      audio.volume = volume * 0.3; // Background music should be quiet
      audio.preload = 'auto';
      
      await audio.play();
      musicRef.current = audio;
      console.log('🎶 Background music started');
    } catch (error) {
      console.warn('⚠️ Background music failed:', error);
    }
  }, [isMusicEnabled, volume]);

  const stopBackgroundMusic = useCallback(() => {
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current = null;
      console.log('🔇 Background music stopped');
    }
  }, []);

  // Background music control
  useEffect(() => {
    if (isMusicEnabled) {
      playBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
  }, [isMusicEnabled, playBackgroundMusic, stopBackgroundMusic]);

  // Game-specific sound functions
  const gameSounds = {
    // MATCH SOUNDS
    playMatch: (cascadeLevel = 0) => {
      if (cascadeLevel > 0) {
        playSound('cascade', { 
          playbackRate: 1 + (cascadeLevel * 0.1), // Higher pitch for combos
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
    playButtonClick: () => playSound('buttonClick', { volume: 0.5 }),
    playItemActivate: () => playSound('itemActivate', { volume: 0.8 }),
    playScoreUpdate: () => playSound('scoreUpdate', { volume: 0.6 }),
    
    // TIMER SOUNDS
    playTick: () => playSound('tick', { volume: 0.4 }),
    playTimeWarning: () => playSound('timeWarning', { volume: 0.9 }),
    playGameOver: () => playSound('gameOver', { volume: 1.0 }),
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBackgroundMusic();
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioContext, stopBackgroundMusic]);

  return {
    // State
    isEnabled,
    isMusicEnabled,
    volume,
    isLoading,
    
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
  };
};
