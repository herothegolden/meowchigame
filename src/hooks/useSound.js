// /src/hooks/useSound.js - Convenient Hook for Sound Effects
import { useCallback } from 'react';
import soundManager from '../utils/SoundManager';

/**
 * Custom hook for easy sound integration in components
 * Provides convenient methods for playing sounds with consistent settings
 */
export const useSound = () => {
  // Core game sounds
  const playSwap = useCallback((success = true, volume = 0.8) => {
    const soundKey = success ? 'swap' : 'swap_invalid';
    return soundManager.playCore(soundKey, { volume });
  }, []);

  const playMatch = useCallback((isSpecial = false, volume = 0.8) => {
    const soundKey = isSpecial ? 'special_creation' : 'match';
    return soundManager.playCore(soundKey, { volume });
  }, []);

  const playCascade = useCallback((level = 1, volume = 0.7) => {
    const adjustedVolume = Math.min(1.0, volume + (level - 1) * 0.1);
    return soundManager.playCore('cascade', { volume: adjustedVolume });
  }, []);

  const playSpecial = useCallback((type = 'activation', volume = 1.0) => {
    const soundKey = type === 'creation' ? 'special_creation' : 'special_activation';
    return soundManager.playCore(soundKey, { volume });
  }, []);

  const playCombo = useCallback((volume = 1.2) => {
    return soundManager.playCore('combo_match', { volume });
  }, []);

  const playPowerUp = useCallback((volume = 0.9) => {
    return soundManager.playCore('power_up', { volume });
  }, []);

  const playScore = useCallback((volume = 0.8) => {
    return soundManager.playCore('score_collect', { volume });
  }, []);

  const playGameOver = useCallback((volume = 1.0) => {
    return soundManager.playCore('game_over', { volume });
  }, []);

  const playLevelComplete = useCallback((volume = 1.0) => {
    return soundManager.playCore('level_complete', { volume });
  }, []);

  // UI sounds
  const playButtonClick = useCallback((volume = 0.8) => {
    return soundManager.playUI('button_click', { volume });
  }, []);

  const playNavigation = useCallback((volume = 0.6) => {
    return soundManager.playUI('button_click', { volume });
  }, []);

  const playSuccess = useCallback((volume = 0.9) => {
    return soundManager.playCore('score_collect', { volume });
  }, []);

  const playError = useCallback((volume = 0.7) => {
    return soundManager.playCore('swap_invalid', { volume });
  }, []);

  // Settings control
  const toggleMute = useCallback(() => {
    soundManager.toggleMute();
    return soundManager.getSettings().isMuted;
  }, []);

  const setVolume = useCallback((volume) => {
    soundManager.setVolume(volume);
    return volume;
  }, []);

  const getSettings = useCallback(() => {
    return soundManager.getSettings();
  }, []);

  // Batch operations
  const stopAll = useCallback(() => {
    soundManager.stopAll();
  }, []);

  const preloadEssentials = useCallback(() => {
    return soundManager.preloadEssentials();
  }, []);

  // Advanced sound sequences
  const playMatchSequence = useCallback(async (matchCount = 1, hasSpecials = false) => {
    if (hasSpecials) {
      await playSpecial('creation', 1.0);
      setTimeout(() => playMatch(false, 0.6), 200);
    } else {
      await playMatch(false, 0.8);
    }
    
    // Play cascades if multiple matches
    if (matchCount > 1) {
      for (let i = 2; i <= Math.min(matchCount, 4); i++) {
        setTimeout(() => playCascade(i - 1), (i - 1) * 300);
      }
      
      // Score collection sound at the end
      setTimeout(() => playScore(0.9), matchCount * 300);
    }
  }, [playSpecial, playMatch, playCascade, playScore]);

  const playPurchaseSequence = useCallback(async (success = true) => {
    if (success) {
      await playSuccess(1.0);
      setTimeout(() => playButtonClick(0.6), 300);
    } else {
      await playError(0.8);
    }
  }, [playSuccess, playError, playButtonClick]);

  // Sound testing utility
  const testSounds = useCallback(async () => {
    console.log('🎵 Testing sound system...');
    await playButtonClick(0.8);
    setTimeout(() => playMatch(false, 0.8), 500);
    setTimeout(() => playCascade(1, 0.7), 1000);
    setTimeout(() => playScore(0.9), 1500);
    console.log('🎵 Sound test complete');
  }, [playButtonClick, playMatch, playCascade, playScore]);

  return {
    // Core game sounds
    playSwap,
    playMatch,
    playCascade,
    playSpecial,
    playCombo,
    playPowerUp,
    playScore,
    playGameOver,
    playLevelComplete,
    
    // UI sounds  
    playButtonClick,
    playNavigation,
    playSuccess,
    playError,
    
    // Settings
    toggleMute,
    setVolume,
    getSettings,
    
    // Utilities
    stopAll,
    preloadEssentials,
    
    // Advanced sequences
    playMatchSequence,
    playPurchaseSequence,
    testSounds,
    
    // Direct access to sound manager
    soundManager
  };
};

export default useSound;
