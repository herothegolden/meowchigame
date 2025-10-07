// Path: frontend/src/pages/ProfilePage/index.jsx
// v9 — Tab container updated to match ProfileHeader design

import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { apiCall, showError } from "../../utils/api";
import ProfileHeader from "./ProfileHeader";
import BottomNav from "../../components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoaderCircle } from "lucide-react";

// ✅ Corrected lazy imports (moved to /tabs/ folder)
const OverviewTab = lazy(() => import("./tabs/OverviewTab"));
const LeaderboardTab = lazy(() => import("./tabs/LeaderboardTab"));
const TasksTab = lazy(() => import("./tabs/TasksTab"));

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
        // 🎨 Updated styling: now visually matches ProfileHeader container
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2a2a2a]/95 via-[#1e1e1e]/95 to-[#111111]/90 border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl"
      >
        {/* Subtle top gloss layer to mimic ProfileHeader */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 via-transparent to-transparent pointer-events-none" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative z-10">
          <TabsList className="grid grid-cols-3 rounded-t-2xl border-b border-white/10">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
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
