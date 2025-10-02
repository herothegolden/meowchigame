import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Edit2, X, CheckSquare, LoaderCircle, Star, Camera } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { apiCall, showSuccess, showError } from '../../utils/api';

const ProfileHeader = ({ stats, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(stats.first_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const tg = window.Telegram?.WebApp;
  const telegramUser = tg?.initDataUnsafe?.user;
  const isDeveloper = telegramUser?.id === 6998637798;

  // FIXED: Helper function to get full avatar URL
  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    
    // If already a full URL, return as-is
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    
    // Otherwise, prepend backend URL (avatarPath starts with /)
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    return `${BACKEND_URL}${avatarPath}`;
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

    // Check original file size
    const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log(`Original image size: ${originalSizeMB}MB`);

    setIsUploadingAvatar(true);
    setUploadProgress(10);

    try {
      // OPTIMIZED: Compress image before upload
      console.log('Compressing image...');
      setUploadProgress(20);

      const compressionOptions = {
        maxSizeMB: 0.5,              // Target 500KB
        maxWidthOrHeight: 800,        // Max dimension 800px
        useWebWorker: true,           // Use worker for better performance
        fileType: 'image/jpeg',       // Convert to JPEG for better compression
        initialQuality: 0.8           // Good quality/size balance
      };

      const compressedFile = await imageCompression(file, compressionOptions);
      const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
      console.log(`Compressed size: ${compressedSizeMB}MB (${((1 - compressedFile.size / file.size) * 100).toFixed(0)}% reduction)`);

      setUploadProgress(40);

      // Upload compressed file
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
      
      // Refresh profile data
      await onUpdate();
      
      // Clear file input
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

  // FIXED: Get full avatar URL
  const avatarUrl = getAvatarUrl(stats.avatar_url);

  return (
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
          
          {/* Camera button with progress indicator */}
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
          <div className="flex items-center mt-1">
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
  );
};

export default ProfileHeader;
