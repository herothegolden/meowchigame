// /src/utils/SoundManager.js - Comprehensive Audio Management System
import soundsConfig from './sounds.json';

class SoundManager {
  constructor() {
    this.sounds = new Map();
    this.isInitialized = false;
    this.isMuted = localStorage.getItem('meowchi_sound_muted') === 'true';
    this.volume = parseFloat(localStorage.getItem('meowchi_sound_volume')) || 0.7;
    this.loadingPromises = new Map();
    
    // Sound categories for volume control
    this.categoryVolumes = {
      core: 1.0,
      ui: 0.8
    };
    
    console.log('🎵 SoundManager initialized:', { 
      muted: this.isMuted, 
      volume: this.volume 
    });
  }

  /**
   * Initialize the sound system (call this once on app start)
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Test if Web Audio API is available
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🎵 Web Audio API initialized');
    } catch (error) {
      console.warn('🎵 Web Audio API not available, using HTML5 audio fallback');
      this.audioContext = null;
    }
    
    this.isInitialized = true;
    console.log('🎵 SoundManager ready');
  }

  /**
   * Load a sound file (lazy loading)
   */
  async loadSound(category, key) {
    const soundKey = `${category}.${key}`;
    
    // Return existing sound if already loaded
    if (this.sounds.has(soundKey)) {
      return this.sounds.get(soundKey);
    }
    
    // Return existing loading promise if in progress
    if (this.loadingPromises.has(soundKey)) {
      return this.loadingPromises.get(soundKey);
    }
    
    // Start loading
    const loadPromise = this._loadAudioFile(category, key, soundKey);
    this.loadingPromises.set(soundKey, loadPromise);
    
    try {
      const audio = await loadPromise;
      this.sounds.set(soundKey, audio);
      this.loadingPromises.delete(soundKey);
      console.log(`🎵 Loaded sound: ${soundKey}`);
      return audio;
    } catch (error) {
      this.loadingPromises.delete(soundKey);
      console.error(`🎵 Failed to load sound: ${soundKey}`, error);
      return null;
    }
  }

  /**
   * Internal method to load audio file
   */
  async _loadAudioFile(category, key, soundKey) {
    const soundPath = soundsConfig[category]?.[key];
    if (!soundPath) {
      throw new Error(`Sound not found: ${soundKey}`);
    }
    
    try {
      // Create HTML5 Audio element
      const audio = new Audio(soundPath);
      
      // Configure audio properties
      audio.preload = 'auto';
      audio.volume = this.volume * this.categoryVolumes[category];
      
      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        const handleLoad = () => {
          audio.removeEventListener('canplaythrough', handleLoad);
          audio.removeEventListener('error', handleError);
          resolve();
        };
        
        const handleError = (e) => {
          audio.removeEventListener('canplaythrough', handleLoad);
          audio.removeEventListener('error', handleError);
          reject(new Error(`Failed to load audio: ${e.message}`));
        };
        
        audio.addEventListener('canplaythrough', handleLoad);
        audio.addEventListener('error', handleError);
        
        // Trigger loading
        audio.load();
      });
      
      return audio;
    } catch (error) {
      throw new Error(`Audio loading error for ${soundKey}: ${error.message}`);
    }
  }

  /**
   * Play a sound effect
   */
  async play(category, key, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.isMuted) return;
    
    try {
      const audio = await this.loadSound(category, key);
      if (!audio) return;
      
      // Clone audio for overlapping sounds
      const audioClone = audio.cloneNode();
      
      // Apply options
      const finalVolume = (options.volume || 1.0) * 
                         this.volume * 
                         this.categoryVolumes[category];
      audioClone.volume = Math.min(1.0, Math.max(0.0, finalVolume));
      
      if (options.loop) {
        audioClone.loop = true;
      }
      
      // Play with error handling
      const playPromise = audioClone.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn(`🎵 Audio play failed for ${category}.${key}:`, error);
        });
      }
      
      // Clean up after playback
      audioClone.addEventListener('ended', () => {
        audioClone.remove();
      });
      
      return audioClone;
    } catch (error) {
      console.warn(`🎵 Sound play error for ${category}.${key}:`, error);
    }
  }

  /**
   * Convenience methods for common sounds
   */
  playCore(key, options = {}) {
    return this.play('core', key, options);
  }
  
  playUI(key, options = {}) {
    return this.play('ui', key, options);
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll() {
    // This is a simple implementation - more advanced would track active sounds
    const allAudio = document.querySelectorAll('audio');
    allAudio.forEach(audio => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setVolume(volume) {
    this.volume = Math.min(1.0, Math.max(0.0, volume));
    localStorage.setItem('meowchi_sound_volume', this.volume.toString());
    
    // Update all loaded sounds
    this.sounds.forEach(audio => {
      if (audio && audio.volume !== undefined) {
        audio.volume = this.volume * this.categoryVolumes.core; // Default to core volume
      }
    });
    
    console.log(`🎵 Volume set to: ${this.volume}`);
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('meowchi_sound_muted', this.isMuted.toString());
    console.log(`🎵 Sound ${this.isMuted ? 'muted' : 'unmuted'}`);
  }

  /**
   * Set mute state
   */
  setMuted(muted) {
    this.isMuted = Boolean(muted);
    localStorage.setItem('meowchi_sound_muted', this.isMuted.toString());
    console.log(`🎵 Sound ${this.isMuted ? 'muted' : 'unmuted'}`);
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      volume: this.volume,
      isMuted: this.isMuted,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Preload critical sounds for better UX
   */
  async preloadEssentials() {
    const essentialSounds = [
      ['ui', 'button_click'],
      ['core', 'swap'],
      ['core', 'match'],
      ['core', 'swap_invalid']
    ];
    
    console.log('🎵 Preloading essential sounds...');
    const promises = essentialSounds.map(([category, key]) => 
      this.loadSound(category, key).catch(error => 
        console.warn(`🎵 Failed to preload ${category}.${key}:`, error)
      )
    );
    
    await Promise.all(promises);
    console.log('🎵 Essential sounds preloaded');
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopAll();
    this.sounds.clear();
    this.loadingPromises.clear();
    
    if (this.audioContext && this.audioContext.close) {
      this.audioContext.close();
    }
    
    console.log('🎵 SoundManager cleaned up');
  }
}

// Create singleton instance
const soundManager = new SoundManager();

// Auto-initialize on first interaction
let autoInitialized = false;
const autoInitialize = () => {
  if (!autoInitialized) {
    autoInitialized = true;
    soundManager.initialize().then(() => {
      soundManager.preloadEssentials();
    });
    
    // Remove event listeners after first interaction
    document.removeEventListener('click', autoInitialize);
    document.removeEventListener('touchstart', autoInitialize);
    document.removeEventListener('keydown', autoInitialize);
  }
};

// Wait for user interaction to initialize (required by browsers)
document.addEventListener('click', autoInitialize);
document.addEventListener('touchstart', autoInitialize);
document.addEventListener('keydown', autoInitialize);

export default soundManager;
