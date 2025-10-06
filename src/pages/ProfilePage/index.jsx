// Path: frontend/src/pages/ProfilePage/index.jsx
// v5 — StarterBadges removed safely

import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { apiCall, showError } from "../../utils/api";
import ProfileHeader from "./ProfileHeader";
import BottomNav from "../../components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoaderCircle } from "lucide-react";

// Lazy-loaded tabs for performance
const OverviewTab = lazy(() => import("./OverviewTab"));
const BadgesTab = lazy(() => import("./BadgesTab"));
const LeaderboardTab = lazy(() => import("./LeaderboardTab"));
const TasksTab = lazy(() => import("./TasksTab"));

const ProfilePage = () => {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall("/api/get-profile-complete");
      setData(result);
    } catch (err) {
      console.error("❌ Failed to load profile:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-secondary">
        <LoaderCircle className="w-6 h-6 animate-spin mb-2" />
        <p className="text-sm">Loading profile...</p>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <p className="text-red-400 font-semibold mb-2">Error loading profile</p>
        <p className="text-secondary text-sm mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-lg bg-accent text-background hover:bg-accent/90 transition"
        >
          Retry
        </button>
      </div>
    );

  if (!data)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-400">
        No profile data available
      </div>
    );

  const stats = data.stats || {};
  const streakInfo = data.stats?.streakInfo || {};

  return (
    <div className="p-4 space-y-6 pb-24 bg-background text-primary">
      {/* Profile Header */}
      <ProfileHeader stats={stats} onUpdate={fetchData} />

      {/* Tabs Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-nav/30 backdrop-blur-lg border border-white/10 shadow-lg"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 rounded-t-2xl border-b border-white/10">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="badges">Бейджи</TabsTrigger>
            <TabsTrigger value="leaderboard">Рейтинг</TabsTrigger>
            <TabsTrigger value="tasks">Задания</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <Suspense
              fallback={
                <div className="p-4 text-center text-secondary text-sm">
                  Loading overview...
                </div>
              }
            >
              <OverviewTab
                stats={stats}
                streakInfo={streakInfo}
                onUpdate={fetchData}
              />
            </Suspense>
          </TabsContent>

          {/* Badges */}
          <TabsContent value="badges">
            <Suspense
              fallback={
                <div className="p-4 text-center text-secondary text-sm">
                  Loading badges...
                </div>
              }
            >
              <BadgesTab badgeProgress={data.badgeProgress} />
            </Suspense>
          </TabsContent>

          {/* Leaderboard */}
          <TabsContent value="leaderboard">
            <Suspense
              fallback={
                <div className="p-4 text-center text-secondary text-sm">
                  Loading leaderboard...
                </div>
              }
            >
              <LeaderboardTab />
            </Suspense>
          </TabsContent>

          {/* Tasks */}
          <TabsContent value="tasks">
            <Suspense
              fallback={
                <div className="p-4 text-center text-secondary text-sm">
                  Loading tasks...
                </div>
              }
            >
              <TasksTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
