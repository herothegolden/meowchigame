import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Edit2, X, CheckSquare, LoaderCircle, Star, Camera, Lock } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { apiCall, showSuccess, showError } from '../../utils/api';

const ProfileHeader = ({ stats, onUpdate, activeBadge, onCloseBadge }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(stats.first_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const tg = window.Telegram?.WebApp;
  const telegramUser = tg?.initDataUnsafe?.user;
  const isDeveloper = telegramUser?.id === 6998637798;

  // Helper function to get full avatar URL
  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    return `${BACKEND_URL}${avatarPath}`;
  };

  // Calculate XP progress for current level
  const calculateXPProgress = () => {
    const currentLevel = stats.level || 1;
    const currentXP = stats.points || 0;
    
    // XP required for each level (exponential growth)
    const getXPForLevel = (level) => {
      return Math.floor(1000 * Math.pow(1.5, level - 1));
    };
    
    const xpForCurrentLevel = currentLevel === 1 ? 0 : getXPForLevel(currentLevel);
    const xpForNextLevel = getXPForLevel(currentLevel + 1);
    const xpInCurrentLevel = currentXP - xpForCurrentLevel;
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
    
    const percentage = Math.min((xpInCurrentLevel / xpNeededForLevel) * 100, 100);
    
    return {
      current: xpInCurrentLevel,
      needed: xpNeededForLevel,
      percentage: percentage,
      nextLevel: currentLevel + 1
    };
  };

  const handleUpdate = async () => {
    if (!editValue.trim() || editValue.trim() === stats.first_name) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const result = await apiCall('/api/update-profile', { firstName: editValue.trim() });
      setIsEditing(false);
      onUpdate();
      showSuccess(result.message);
    } catch (error) {
      showError(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log(`Original image size: ${originalSizeMB}MB`);

    setIsUploadingAvatar(true);
    setUploadProgress(10);

    try {
      console.log('Compressing image...');
      setUploadProgress(20);

      const compressionOptions = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.8
      };

      const compressedFile = await imageCompression(file, compressionOptions);
      const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
      console.log(`Compressed size: ${compressedSizeMB}MB (${((1 - compressedFile.size / file.size) * 100).toFixed(0)}% reduction)`);

      setUploadProgress(40);

      const formData = new FormData();
      formData.append('avatar', compressedFile, 'avatar.jpg');

      const initData = tg?.initData;
      if (!initData) {
        throw new Error('Telegram data not available');
      }
      formData.append('initData', initData);

      setUploadProgress(50);

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${BACKEND_URL}/api/update-avatar`, {
        method: 'POST',
        body: formData
      });

      setUploadProgress(80);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      setUploadProgress(100);
      
      showSuccess(`Avatar uploaded! (${compressedSizeMB}MB)`);
      
      await onUpdate();
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Avatar upload error:', error);
      showError(error.message || 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      setUploadProgress(0);
    }
  };

  const avatarUrl = getAvatarUrl(stats.avatar_url);
  const xpProgress = calculateXPProgress();

  return (
    <>
      {/* Badge Tooltip - Fixed Position */}
      <AnimatePresence>
        {activeBadge && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={onCloseBadge}
            />
            <motion.div
              className="fixed top-[380px] left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-[400px]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-gray-900 text-white rounded-lg py-3 px-4 shadow-2xl border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{activeBadge.icon}</div>
                    <div>
                      <p className="font-bold text-accent">{activeBadge.name}</p>
                      <p className="text-sm text-gray-300">{activeBadge.requirement}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center">
                    <Lock className="w-3 h-3 mr-1" />
                    Locked
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div
        className="bg-nav p-6 rounded-lg border border-gray-700"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-start space-x-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden border-2 border-accent">
              {avatarUrl ? (
                <img 
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Avatar load error:', e.target.src);
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'block';
                    }
                  }}
                />
              ) : null}
              <User 
                className="w-10 h-10 text-accent" 
                style={{ display: avatarUrl ? 'none' : 'block' }} 
              />
            </div>
            
            <motion.button
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className="absolute -bottom-1 -right-1 bg-accent text-background p-2 rounded-full shadow-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              whileTap={{ scale: 0.9 }}
              title="Upload avatar"
            >
              {isUploadingAvatar ? (
                <div className="relative w-3 h-3">
                  <LoaderCircle className="w-3 h-3 animate-spin" />
                  {uploadProgress > 0 && (
                    <span className="absolute -top-6 -left-2 text-[10px] font-bold text-accent whitespace-nowrap">
                      {uploadProgress}%
                    </span>
                  )}
                </div>
              ) : (
                <Camera className="w-3 h-3" />
              )}
            </motion.button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="bg-background border border-gray-500 rounded px-2 py-1 text-primary text-lg font-bold flex-1 min-w-0"
                  maxLength={50}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleUpdate();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                />
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="bg-accent text-background px-3 py-1 rounded font-bold hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isUpdating ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-600 text-white px-3 py-1 rounded font-bold hover:bg-gray-700 transition-colors flex items-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-primary truncate">{stats.first_name}</h1>
                <button
                  onClick={() => {
                    setEditValue(stats.first_name || '');
                    setIsEditing(true);
                  }}
                  className="text-secondary hover:text-accent transition-colors p-1"
                  title="Edit name"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {isDeveloper && (
                  <button 
                    onClick={() => window.location.href = '/dev-tools'}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                    title="Developer Tools"
                  >
                    Dev Tools
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-secondary truncate">@{stats.username || 'user'} • Level {stats.level}</p>
            
            {/* XP Progress Bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-secondary mb-1">
                <span>XP: {xpProgress.current.toLocaleString()} / {xpProgress.needed.toLocaleString()}</span>
                <span className="text-accent font-bold">Level {xpProgress.nextLevel}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent via-yellow-400 to-accent rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress.percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="flex items-center mt-2">
              <Star className="w-4 h-4 text-accent mr-1" />
              <span className="text-lg font-bold text-accent">{stats.points.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-700 text-center">
          <p className="text-xs text-secondary">
            {isUploadingAvatar ? (
              <span className="text-accent font-bold">Uploading... {uploadProgress}%</span>
            ) : (
              avatarUrl ? 'Tap camera icon to change avatar' : 'Tap camera icon to upload avatar'
            )}
          </p>
        </div>
      </motion.div>
    </>
  );
};

export default ProfileHeader;
