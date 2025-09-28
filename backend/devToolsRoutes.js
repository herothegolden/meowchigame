import React, { useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, LoaderCircle } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

const DevToolsPage = ({ tg }) => {
  const [isResetting, setIsResetting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const isAuthorized = true; // ⚠️ Add proper auth check if needed

  return (
    <div className="p-6 space-y-6">
      {/* Reset Daily Tasks Section */}
      <motion.div
        className="bg-nav p-6 rounded-lg border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-primary mb-4 flex items-center">
          <RotateCcw className="w-6 h-6 mr-2 text-accent" />
          Reset Daily Tasks
        </h2>
        <p className="text-sm text-secondary mb-4">
          This will reset all daily tasks for all users.
        </p>

        <button
          onClick={async () => {
            if (!isAuthorized || !tg?.initData || !BACKEND_URL) {
              alert("Not authorized or backend unavailable");
              return;
            }
            setIsResetting(true);
            try {
              const response = await fetch(`${BACKEND_URL}/api/dev/reset-daily-tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              });
              const result = await response.json();
              if (response.ok) {
                alert(result.message);
              } else {
                alert("Reset failed: " + result.error);
              }
            } catch (err) {
              alert("Error: " + err.message);
            } finally {
              setIsResetting(false);
            }
          }}
          disabled={isResetting}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isResetting ? (
            <>
              <LoaderCircle className="w-5 h-5 animate-spin" />
              <span>Resetting...</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-5 h-5" />
              <span>Reset Daily Tasks</span>
            </>
          )}
        </button>
      </motion.div>

      {/* Cleanup Demo Accounts Section */}
      <motion.div
        className="bg-nav p-6 rounded-lg border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-bold text-primary mb-4 flex items-center">
          <RotateCcw className="w-6 h-6 mr-2 text-accent" />
          Cleanup Demo Accounts
        </h2>
        <p className="text-sm text-secondary mb-4">
          This will reset all demo accounts (<code>demoUser</code> / <code>user_12345</code>). 
          On next login, they will sync real Telegram usernames.
        </p>

        <button
          onClick={async () => {
            if (!isAuthorized || !tg?.initData || !BACKEND_URL) {
              alert("Not authorized or backend unavailable");
              return;
            }
            setIsCleaning(true);
            try {
              const response = await fetch(`${BACKEND_URL}/api/dev/cleanup-demo-users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              });
              const result = await response.json();
              if (response.ok) {
                alert(result.message);
              } else {
                alert("Cleanup failed: " + result.error);
              }
            } catch (err) {
              alert("Error: " + err.message);
            } finally {
              setIsCleaning(false);
            }
          }}
          disabled={isCleaning}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCleaning ? (
            <>
              <LoaderCircle className="w-5 h-5 animate-spin" />
              <span>Cleaning...</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-5 h-5" />
              <span>Reset Demo Accounts</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};

export default DevToolsPage;
