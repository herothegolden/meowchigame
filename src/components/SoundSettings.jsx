// /src/components/SoundSettings.jsx - Sound Control Component
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Volume1, VolumeOff } from 'lucide-react';
import soundManager from '../utils/SoundManager';

const SoundSettings = ({ className = "" }) => {
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load initial settings
  useEffect(() => {
    const settings = soundManager.getSettings();
    setVolume(settings.volume);
    setIsMuted(settings.isMuted);
    setIsInitialized(settings.isInitialized);
  }, []);

  // Handle volume change
  const handleVolumeChange = (newVolume) => {
    const clampedVolume = Math.min(1.0, Math.max(0.0, newVolume));
    setVolume(clampedVolume);
    soundManager.setVolume(clampedVolume);
    
    // Play test sound at new volume
    soundManager.playUI('button_click', { volume: 0.8 });
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    soundManager.setMuted(newMutedState);
    
    // Play test sound if unmuting
    if (!newMutedState) {
      setTimeout(() => {
        soundManager.playUI('button_click', { volume: 0.8 });
      }, 100);
    }
  };

  // Get appropriate volume icon
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume <= 0.3) return VolumeOff;
    if (volume <= 0.7) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  return (
    <div className={`bg-nav p-4 rounded-lg border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-primary">Sound Settings</h3>
        {!isInitialized && (
          <span className="text-xs text-secondary bg-yellow-600/20 px-2 py-1 rounded">
            Will activate on interaction
          </span>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Mute Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary">Sound Effects</span>
          <motion.button
            onClick={handleMuteToggle}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            <VolumeIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {isMuted ? 'Muted' : 'On'}
            </span>
          </motion.button>
        </div>

        {/* Volume Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary">Volume</span>
            <span className="text-sm text-accent font-bold">
              {Math.round(volume * 100)}%
            </span>
          </div>
          
          <div className="relative">
            {/* Volume Slider Track */}
            <div className="w-full h-2 bg-gray-700 rounded-full relative overflow-hidden">
              {/* Volume Fill */}
              <motion.div
                className={`h-full rounded-full transition-colors duration-200 ${
                  isMuted ? 'bg-gray-500' : 'bg-accent'
                }`}
                style={{ width: `${volume * 100}%` }}
                layout
              />
            </div>
            
            {/* Volume Slider Input */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              disabled={isMuted}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            
            {/* Volume Thumb */}
            <motion.div
              className={`absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg transform -translate-y-1/2 transition-colors duration-200 ${
                isMuted ? 'bg-gray-500' : 'bg-accent'
              }`}
              style={{ left: `calc(${volume * 100}% - 8px)` }}
              animate={{ scale: isMuted ? 0.8 : 1 }}
            />
          </div>
          
          {/* Volume Preset Buttons */}
          <div className="flex justify-between text-xs text-secondary mt-2">
            {[0, 0.3, 0.7, 1.0].map((presetVolume, index) => (
              <motion.button
                key={presetVolume}
                onClick={() => handleVolumeChange(presetVolume)}
                disabled={isMuted}
                className={`px-2 py-1 rounded transition-colors duration-200 ${
                  Math.abs(volume - presetVolume) < 0.1 && !isMuted
                    ? 'bg-accent text-background font-bold'
                    : 'hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                {presetVolume === 0 ? 'Off' : `${Math.round(presetVolume * 100)}%`}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Sound Test Button */}
        <motion.button
          onClick={() => {
            soundManager.playCore('match', { volume: 0.8 });
            setTimeout(() => soundManager.playCore('score_collect', { volume: 0.8 }), 300);
          }}
          disabled={isMuted}
          className="w-full bg-background border border-gray-600 text-primary py-2 px-3 rounded-lg text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.95 }}
        >
          🎵 Test Sounds
        </motion.button>

        {/* Status Info */}
        <div className="text-xs text-secondary text-center pt-2 border-t border-gray-700">
          {isMuted ? (
            'All sounds are muted'
          ) : (
            `Sound effects at ${Math.round(volume * 100)}% volume`
          )}
        </div>
      </div>
    </div>
  );
};

export default SoundSettings;
