import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Edit2, X, CheckSquare, LoaderCircle, Star } from 'lucide-react';
import { apiCall, showSuccess, showError } from '../../utils/api';

const ProfileHeader = ({ stats, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(stats.first_name || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const tg = window.Telegram?.WebApp;
  const telegramUser = tg?.initDataUnsafe?.user;
  const telegramPhotoUrl = telegramUser?.photo_url;
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
            {stats.avatar_url || telegramPhotoUrl ? (
              <img 
                src={stats.avatar_url || telegramPhotoUrl} 
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <User className="w-10 h-10 text-accent" style={{ display: stats.avatar_url || telegramPhotoUrl ? 'none' : 'block' }} />
          </div>
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
          {telegramPhotoUrl ? 'Avatar synced from Telegram' : 'Personalize your profile above'}
        </p>
      </div>
    </motion.div>
  );
};

export default ProfileHeader;
