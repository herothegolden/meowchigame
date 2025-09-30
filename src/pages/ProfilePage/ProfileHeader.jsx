import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Edit2, X, CheckSquare, LoaderCircle, Star, Camera } from 'lucide-react';
import { apiCall, showSuccess, showError } from '../../utils/api';

const ProfileHeader = ({ stats, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(stats.first_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const tg = window.Telegram?.WebApp;
  const telegramUser = tg?.initDataUnsafe?.user;
  const isDeveloper = telegramUser?.id === 6998637798;

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      showError('File too large. Maximum size is 2MB');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      // Get initData for authentication
      const initData = tg?.initData;
      if (!initData) {
        throw new Error('Telegram data not available');
      }

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${BACKEND_URL}/api/update-avatar`, {
        method: 'POST',
        headers: {
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: (() => {
          // Create new FormData with both avatar and initData
          const fd = new FormData();
          fd.append('avatar', file);
          fd.append('initData', initData);
          return fd;
        })()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      showSuccess('Avatar uploaded successfully!');
      onUpdate(); // Refresh profile data
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Avatar upload error:', error);
      showError(error.message || 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <motion.div
      className="bg-nav p-6 rounded-lg border border-gray-700"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start space-x-4">
        <div className="relative">
          {/* Avatar Display */}
          <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden border-2 border-accent">
            {stats.avatar_url ? (
              <img 
                src={stats.avatar_url} 
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <User 
              className="w-10 h-10 text-accent" 
              style={{ display: stats.avatar_url ? 'none' : 'block' }} 
            />
          </div>
          
          {/* Upload Button Overlay */}
          <motion.button
            onClick={handleAvatarClick}
            disabled={isUploadingAvatar}
            className="absolute -bottom-1 -right-1 bg-accent text-background p-2 rounded-full shadow-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.9 }}
            title="Upload avatar"
          >
            {isUploadingAvatar ? (
              <LoaderCircle className="w-3 h-3 animate-spin" />
            ) : (
              <Camera className="w-3 h-3" />
            )}
          </motion.button>

          {/* Hidden File Input */}
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
          {stats.avatar_url ? 'Tap camera icon to change avatar' : 'Tap camera icon to upload avatar'}
        </p>
      </div>
    </motion.div>
  );
};

export default ProfileHeader;
