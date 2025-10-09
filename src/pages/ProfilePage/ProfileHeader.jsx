// Path: src/pages/ProfilePage/ProfileHeader.jsx
import React, { useState, useRef, useEffect } from 'react';
import { User, Edit2, X, CheckSquare, LoaderCircle, Camera, Zap, Trophy, Shield, Award, Sparkles, Crown } from 'lucide-react';
import { apiCall, showSuccess, showError } from '../../utils/api';
import BetaNote from '../../components/BetaNote';

const ProfileHeader = ({ stats, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(stats.first_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const fileInputRef = useRef(null);

  const tg = window.Telegram?.WebApp;
  const telegramUser = tg?.initDataUnsafe?.user;
  const isDeveloper = telegramUser?.id === 6998637798;

  const getAvatarUrl = (avatarData) => {
    if (!avatarData || typeof avatarData !== 'string') return null;
    if (avatarData.startsWith('data:image/')) return avatarData;
    if (avatarData.startsWith('/uploads/')) {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
      return `${BACKEND_URL}${avatarData}`;
    }
    if (avatarData.startsWith('http://') || avatarData.startsWith('https://')) return avatarData;
    return null;
  };

  useEffect(() => {
    setAvatarError(false);
  }, [stats.avatar_url]);

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

    setIsUploadingAvatar(true);
    setUploadProgress(10);

    try {
      setUploadProgress(25);
      const { default: imageCompression } = await import('browser-image-compression');
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.8,
      });
      setUploadProgress(55);

      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(compressedFile);
      });
      const avatarBase64 = await base64Promise;
      setUploadProgress(75);

      const result = await apiCall('/api/update-avatar', { avatarBase64 });
      setUploadProgress(100);
      showSuccess(result.message || 'Avatar uploaded!');
      await onUpdate();

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Avatar upload error:', error);
      showError(error.message || 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      setUploadProgress(0);
    }
  };

  const avatarUrl = getAvatarUrl(stats.avatar_url);

  const userPower = stats.power ?? 0;
  const userRank = stats.rank || '--';
  const userVipLevel = stats.vip_level || 0;
  const placeholderAlliance = 'None';
  const placeholderAlliancePower = 0;
  const placeholderAllianceRank = '--';

  return (
    <div className="bg-nav p-6 rounded-lg border border-gray-700">
      {/* Row 1: Avatar + Name/Edit/VIP + (right) BETA note */}
      <div className="flex items-start space-x-4 mb-1">
        <div className="relative flex-shrink-0">
          {/* Avatar frame */}
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-accent relative">
            <div className="absolute inset-0 rounded-full bg-accent/15" style={{ zIndex: 0 }} />
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                width={80}
                height={80}
                decoding="async"
                fetchpriority="high"
                className="w-full h-full object-cover relative"
                style={{ zIndex: 1 }}
                onError={() => {
                  console.error('Avatar load error:', avatarUrl);
                  setAvatarError(true);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center relative" style={{ zIndex: 1 }}>
                <User className="w-10 h-10 text-accent" />
              </div>
            )}
          </div>

          {/* Camera button — overlap bottom-right */}
          <button
            onClick={handleAvatarClick}
            disabled={isUploadingAvatar}
            className="
              absolute bottom-0 right-0
              translate-x-2 translate-y-2
              bg-accent text-background
              w-8 h-8 rounded-full
              flex items-center justify-center
              shadow-xl ring-2 ring-background
              hover:bg-accent/90 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              z-10
            "
            title="Upload avatar"
            aria-label="Upload avatar"
          >
            {isUploadingAvatar ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Name + Edit + VIP */}
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
                onKeyDown={(e) => {
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
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="text-xl font-bold text-primary">{stats.first_name}</h1>
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

              {/* VIP */}
              <span className="flex items-center text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 drop-shadow-[0_0_3px_rgba(255,215,0,0.5)] ml-1">
                <Crown className="w-4 h-4 text-yellow-400 mr-1" strokeWidth={2} />
                VIP {userVipLevel}
              </span>

              {isDeveloper && (
                <button
                  onClick={() => (window.location.href = '/dev-tools')}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                  title="Developer Tools"
                >
                  Dev Tools
                </button>
              )}
            </div>
          )}

          {/* Username only (Level removed) */}
          <p className="text-sm text-secondary mt-1">
            @{stats.username || 'user'}
          </p>

          {/* Power */}
          <div className="mt-2">
            <div className="inline-flex items-center justify-center bg-gradient-to-r from-accent/20 to-yellow-400/20 border-2 border-accent rounded-lg px-4 py-2">
              <Zap className="w-4 h-4 text-accent mr-2" />
              <span className="text-lg font-bold text-accent">
                POWER: {userPower.toLocaleString()}
              </span>
              <Zap className="w-4 h-4 text-accent ml-2" />
            </div>
          </div>
        </div>

        {/* Right-aligned non-blocking BETA note */}
        <div className="ml-auto">
          <BetaNote />
        </div>
      </div>

      {/* Rank + Points */}
      <div className="mt-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center">
            <Trophy className="w-4 h-4 text-yellow-500 mr-1" />
            <span className="text-secondary">Rank:</span>
            <span className="text-primary font-bold ml-1">#{userRank}</span>
          </div>
          <div className="flex items-center">
            <Sparkles className="w-4 h-4 text-accent mr-1" />
            <span className="text-secondary">Points:</span>
            <span className="text-accent font-bold ml-1">{stats.points.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Alliance */}
      <div className="mt-3">
        <div className="flex items-center text-sm">
          <Shield className="w-4 h-4 text-blue-400 mr-1" />
          <span className="text-secondary">Alliance:</span>
          <span className="text-primary font-bold ml-1">{placeholderAlliance}</span>
        </div>
      </div>

      {/* Alliance Rank + Power */}
      <div className="mt-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center">
            <Award className="w-4 h-4 text-yellow-500 mr-1" />
            <span className="text-secondary">Alliance Rank</span>
            <span className="text-primary font-bold ml-1">#{placeholderAllianceRank}</span>
          </div>
          <div className="flex items-center">
            <Zap className="w-4 h-4 text-accent mr-1" />
            <span className="text-secondary">Alliance Power</span>
            <span className="text-primary font-bold ml-1">{placeholderAlliancePower}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProfileHeader);
