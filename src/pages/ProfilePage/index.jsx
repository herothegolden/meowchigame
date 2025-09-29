import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Award, Trophy, CheckSquare } from 'lucide-react';
import { apiCall } from '../../utils/api';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import ProfileHeader from './ProfileHeader';
import { OverviewTab, BadgesTab, LeaderboardTab, TasksTab } from './tabs';

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'badges', label: 'Badges', icon: Award },
  { id: 'leaderboard', label: 'Board', icon: Trophy },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare }
];

const ProfilePage = () => {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [stats, shopData] = await Promise.all([
        apiCall('/api/get-user-stats'),
        apiCall('/api/get-shop-data')
      ]);
      
      setData({
        stats,
        inventory: shopData.inventory || [],
        ownedBadges: shopData.ownedBadges || []
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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data) return <ErrorState error="No data available" onRetry={fetchData} />;

  return (
    <div className="p-4 space-y-6 bg-background text-primary min-h-screen">
      <ProfileHeader stats={data.stats} onUpdate={fetchData} />
      
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
        {activeTab === 'badges' && <BadgesTab ownedBadges={data.ownedBadges} />}
        {activeTab === 'leaderboard' && <LeaderboardTab />}
        {activeTab === 'tasks' && <TasksTab />}
      </div>
    </div>
  );
};

export default ProfilePage;
