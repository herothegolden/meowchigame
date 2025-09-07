// src/components/AudioControls.jsx - User-friendly audio controls
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Music, Settings, X, Headphones } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';

const AudioControls = ({ className = "" }) => {
  const {
    isEnabled,
    isMusicEnabled,
    volume,
    isLoading,
    setIsEnabled,
    setIsMusicEnabled,
    setVolume,
    playButtonClick
  } = useAudio();
  
  const [showSettings, setShowSettings] = useState(false);

  const handleToggleSound = () => {
    if (isEnabled) {
      playButtonClick();
    }
    setIsEnabled(!isEnabled);
  };

  const handleToggleMusic = () => {
    if (isEnabled) {
      playButtonClick();
    }
    setIsMusicEnabled(!isMusicEnabled);
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (isEnabled) {
      playButtonClick();
    }
  };

  const handleShowSettings = () => {
    if (isEnabled) {
      playButtonClick();
    }
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    if (isEnabled) {
      playButtonClick();
    }
    setShowSettings(false);
  };

  return (
    <>
      {/* Floating Audio Button */}
      <motion.div 
        className={`fixed top-4 right-4 z-40 ${className}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <motion.button
          onClick={handleShowSettings}
          className="bg-nav/90 backdrop-blur-sm p-3 rounded-full shadow-lg border border-gray-600 hover:bg-gray-600 transition-all duration-200"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Headphones className="w-5 h-5 text-accent" />
            </motion.div>
          ) : isEnabled ? (
            <Volume2 className="w-5 h-5 text-accent" />
          ) : (
            <VolumeX className="w-5 h-5 text-gray-400" />
          )}
        </motion.button>
      </motion.div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-nav rounded-2xl p-6 w-full max-w-sm border border-gray-700"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Settings className="w-6 h-6 text-accent" />
                  <h3 className="text-xl font-bold text-primary">Audio Settings</h3>
                </div>
                <motion.button
                  onClick={handleCloseSettings}
                  className="text-secondary hover:text-primary p-1 rounded-md hover:bg-gray-600 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-6">
                  <motion.div
                    className="inline-block"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Headphones className="w-8 h-8 text-accent mx-auto mb-2" />
                  </motion.div>
                  <p className="text-sm text-secondary">Loading sounds...</p>
                </div>
              )}

              {/* Controls */}
              {!isLoading && (
                <div className="space-y-6">
                  {/* Sound Effects Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {isEnabled ? (
                        <Volume2 className="w-6 h-6 text-accent" />
                      ) : (
                        <VolumeX className="w-6 h-6 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium text-primary">Sound Effects</p>
                        <p className="text-xs text-secondary">Game sounds & UI feedback</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={handleToggleSound}
                      className={`relative w-12 h-6 rounded-full transition-all duration-200 ${
                        isEnabled ? 'bg-accent' : 'bg-gray-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full"
                        animate={{ x: isEnabled ? 26 : 2 }}
                        transition={{ duration: 0.2 }}
                      />
                    </motion.button>
                  </div>

                  {/* Background Music Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Music className={`w-6 h-6 ${isMusicEnabled ? 'text-accent' : 'text-gray-400'}`} />
                      <div>
                        <p className="font-medium text-primary">Background Music</p>
                        <p className="text-xs text-secondary">Ambient gameplay music</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={handleToggleMusic}
                      className={`relative w-12 h-6 rounded-full transition-all duration-200 ${
                        isMusicEnabled ? 'bg-accent' : 'bg-gray-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                      disabled={!isEnabled}
                    >
                      <motion.div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full"
                        animate={{ x: isMusicEnabled ? 26 : 2 }}
                        transition={{ duration: 0.2 }}
                      />
                    </motion.button>
                  </div>

                  {/* Volume Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-primary">Volume</p>
                      <p className="text-sm text-accent">{Math.round(volume * 100)}%</p>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        disabled={!isEnabled}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                        style={{
                          background: `linear-gradient(to right, #EAB308 ${volume * 100}%, #374151 ${volume * 100}%)`
                        }}
                      />
                    </div>
                  </div>

                  {/* Audio Tips */}
                  <div className="bg-background/50 rounded-lg p-3 border border-gray-600">
                    <p className="text-xs text-secondary">
                      💡 <strong>Tip:</strong> Use headphones for the best audio experience! 
                      Sounds enhance the gameplay and make matches more satisfying.
                    </p>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <motion.button
                onClick={handleCloseSettings}
                className="w-full mt-6 bg-accent text-background py-3 rounded-lg font-bold hover:bg-accent/90 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Done
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AudioControls;
