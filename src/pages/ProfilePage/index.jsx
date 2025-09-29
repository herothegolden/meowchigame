import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stats, shopData] = await Promise.all([
        apiCall('/api/get-user-stats'),
        apiCall('/api/get-shop-data')
      ]);
      setData({ stats, inventory: shopData.inventory, ownedBadges: shopData.ownedBadges });
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  return (
    <div className="p-4 space-y-6 bg-background text-primary min-h-screen">
      <ProfileHeader stats={data.stats} onUpdate={fetchData} />
      
      <TabNavigation tabs={TABS} active={activeTab} onChange={setActiveTab} />
      
      {activeTab === 'overview' && <OverviewTab stats={data.stats} />}
      {activeTab === 'badges' && <BadgesTab ownedBadges={data.ownedBadges} />}
      {activeTab === 'leaderboard' && <LeaderboardTab />}
      {activeTab === 'tasks' && <TasksTab />}
    </div>
  );
};
