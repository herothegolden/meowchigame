// Path: frontend/src/pages/ProfilePage/index.jsx
// v11 — Tab container identical to ProfileHeader (no gradient, same corners, same tone)

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
        // 🎨 Updated to match ProfileHeader exactly: no gradient, identical corner radius and tone
        className="relative overflow-hidden rounded-lg bg-[#1b1b1b] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative z-10">
          <TabsList className="grid grid-cols-3 rounded-t-lg border-b border-white/10">
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
