import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Trophy, CheckSquare } from 'lucide-react';
import { apiCall } from '../../utils/api';
import { ErrorState } from '../../components/ErrorState';
import ProfileHeader from './ProfileHeader';
import StarterBadges from './StarterBadges';
import { OverviewTab, LeaderboardTab, TasksTab } from './tabs';

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'leaderboard', label: 'Board', icon: Trophy },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare }
];

// Loading skeleton component
const ProfileSkeleton = () => (
  <div className="p-4 space-y-6 bg-background text-primary min-h-screen">
    {/* Header skeleton */}
    <div className="bg-nav p-6 rounded-lg border border-gray-700 animate-pulse">
      <div className="flex items-start space-x-4">
        <div className="w-20 h-20 rounded-full bg-gray-700"></div>
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
        </div>
      </div>
    </div>
    
    {/* Tabs skeleton */}
    <div className="flex bg-nav rounded-lg border border-gray-700 p-1 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex-1 h-16 bg-gray-700 rounded-md mx-1"></div>
      ))}
    </div>
    
    {/* Content skeleton */}
    <div className="grid grid-cols-2 gap-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-nav p-4 rounded-lg border border-gray-700 h-24"></div>
      ))}
    </div>
  </div>
);

const ProfilePage = () => {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeBadge, setActiveBadge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Single API call for all data
      const profileData = await apiCall('/api/get-profile-complete');
      
      setData({
        stats: profileData.stats,
        inventory: profileData.shopData.inventory || [],
        ownedBadges: profileData.shopData.ownedBadges || [],
        badgeProgress: profileData.badgeProgress || { progress: {} }
      });
    } catch (err) {
      console.error('Failed to load profile data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <ProfileSkeleton />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data) return <ErrorState error="No data available" onRetry={fetchData} />;

  return (
    <div className="p-4 space-y-6 bg-background text-primary min-h-screen">
      <ProfileHeader 
        stats={data.stats} 
        onUpdate={fetchData}
        activeBadge={activeBadge}
        onCloseBadge={() => setActiveBadge(null)}
      />
      
      <StarterBadges onBadgeClick={setActiveBadge} />
      
      <motion.div 
        className="flex bg-nav rounded-lg border border-gray-700 p-1 overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ delay: 0.1 }}
      >
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-accent text-background' 
                  : 'text-secondary hover:text-primary hover:bg-background/20'
              }`}
            >
              <TabIcon className="w-4 h-4 mb-1" />
              <span className="text-xs font-medium truncate">{tab.label}</span>
            </button>
          );
        })}
      </motion.div>

      <div className="min-h-[400px]">
        {activeTab === 'overview' && <OverviewTab stats={data.stats} />}
        {activeTab === 'leaderboard' && <LeaderboardTab />}
        {activeTab === 'tasks' && <TasksTab />}
      </div>
    </div>
  );
};

export default ProfilePage;
