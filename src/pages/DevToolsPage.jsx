import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, RotateCcw, LoaderCircle, AlertTriangle, CheckCircle, User } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const DEV_USER_ID = 6998637798;

const DevToolsPage = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    // Check if current user is authorized developer
    const telegramUser = tg?.initDataUnsafe?.user;
    const userId = telegramUser?.id;
    
    if (userId === DEV_USER_ID) {
      setIsAuthorized(true);
      setUserInfo(telegramUser);
    } else {
      setIsAuthorized(false);
      console.log(`🚫 Unauthorized access attempt to dev tools by user: ${userId}`);
    }
  }, [tg]);

  const handleResetTasks = async () => {
    if (!isAuthorized || !tg?.initData || !BACKEND_URL) {
      alert('Not authorized or backend unavailable');
      return;
    }

    setIsResetting(true);
    setResetResult(null);

    try {
      console.log('🔧 Resetting tasks for dev account...');

      const response = await fetch(`${BACKEND_URL}/api/dev-reset-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Tasks reset successfully:', result);
        setResetResult({
          success: true,
          message: result.message,
          tasksDeleted: result.tasksDeleted,
          pointsFromTasks: result.pointsFromTasks
        });

        if (tg.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }
      } else {
        throw new Error(result.error || 'Reset failed');
      }
    } catch (error) {
      console.error('❌ Task reset error:', error);
      setResetResult({
        success: false,
        message: error.message
      });

      if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setIsResetting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-4 min-h-screen bg-background text-primary flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-2">Access Denied</h1>
          <p className="text-secondary">This page is only accessible to authorized developers.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 bg-background text-primary min-h-screen">
      {/* Header */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center mb-2">
          <Settings className="w-8 h-8 mr-3 text-accent" />
          <h1 className="text-3xl font-bold">Developer Tools</h1>
        </div>
        <p className="text-secondary">Internal tools for development and testing</p>
      </motion.div>

      {/* Developer Info */}
      <motion.div
        className="bg-nav p-4 rounded-lg border border-gray-700"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center space-x-3">
          <User className="w-6 h-6 text-accent" />
          <div>
            <h3 className="font-bold text-primary">Authorized Developer</h3>
            <p className="text-sm text-secondary">
              {userInfo?.first_name} {userInfo?.last_name} (@{userInfo?.username})
            </p>
            <p className="text-xs text-accent">ID: {userInfo?.id}</p>
          </div>
        </div>
      </motion.div>

      {/* Task Management */}
      <motion.div
        className="bg-nav p-6 rounded-lg border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-primary mb-4 flex items-center">
          <RotateCcw className="w-6 h-6 mr-2 text-accent" />
          Task Management
        </h2>
        
        <div className="space-y-4">
          <div className="bg-background/50 p-4 rounded-lg border border-gray-600">
            <h3 className="font-bold text-primary mb-2">Reset Main Tasks</h3>
            <p className="text-sm text-secondary mb-4">
              This will delete all main task completion records for your account, 
              allowing you to test "Join the Cat Cult" and "Cat-stagram Star" again.
            </p>
            
            <button
              onClick={handleResetTasks}
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
                  <span>Reset My Tasks</span>
                </>
              )}
            </button>
          </div>

          {/* Result Display */}
          {resetResult && (
            <motion.div
              className={`p-4 rounded-lg border ${
                resetResult.success 
                  ? 'bg-green-600/20 border-green-500 text-green-300' 
                  : 'bg-red-600/20 border-red-500 text-red-300'
              }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start space-x-3">
                {resetResult.success ? (
                  <CheckCircle className="w-6 h-6 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {resetResult.success ? 'Reset Successful' : 'Reset Failed'}
                  </p>
                  <p className="text-sm mt-1">{resetResult.message}</p>
                  {resetResult.success && (
                    <div className="text-xs mt-2 space-y-1">
                      <p>Tasks deleted: {resetResult.tasksDeleted}</p>
                      <p>Points from tasks: {resetResult.pointsFromTasks} (preserved)</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Warning */}
      <motion.div
        className="bg-red-600/10 border border-red-500 text-red-300 p-4 rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Developer Only</p>
            <p className="text-xs mt-1">
              This page is only accessible to authorized developers. 
              All actions are logged and monitored.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DevToolsPage;
