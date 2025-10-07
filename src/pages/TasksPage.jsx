import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  Gift, 
  RefreshCw,
  LoaderCircle,
  AlertTriangle
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingTask, setProcessingTask] = useState(null);
  const [toast, setToast] = useState(null);
  
  const tg = window.Telegram?.WebApp;

  // Toast notification system
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch tasks from backend - SAME FOR ALL USERS
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!tg?.initData || !BACKEND_URL) {
        throw new Error('Connection not available. Please check your internet connection and try again.');
      }

      console.log('Fetching tasks...');

      const res = await fetch(`${BACKEND_URL}/api/get-user-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch tasks');
      }

      const data = await res.json();
      console.log('Tasks loaded:', data);
      
      setTasks(data.tasks || []);

    } catch (err) {
      console.error('Tasks fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Handle task start (open external link) - SAME FOR ALL USERS
  const handleStartTask = async (task) => {
    if (task.disabled || task.completed || processingTask) return;

    setProcessingTask(task.id);

    try {
      if (!tg?.initData || !BACKEND_URL) {
        throw new Error('Connection not available. Cannot start tasks offline.');
      }

      console.log('Starting task:', task.task_name);

      // Start task and get URL
      const startRes = await fetch(`${BACKEND_URL}/api/start-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          initData: tg.initData, 
          taskName: task.task_name 
        }),
      });

      const startResult = await startRes.json();
      
      if (!startRes.ok) {
        throw new Error(startResult.error || 'Failed to start task');
      }

      console.log('Task started, opening URL:', startResult.url);

      // Open the external link
      if (tg && tg.openLink) {
        tg.openLink(startResult.url);
      } else {
        window.open(startResult.url, '_blank');
      }

      // Show verification toast
      showToast('Verifying task...', 'info');

      // Auto-verify after a short delay
      setTimeout(() => {
        if (!processingTask) return; // Don't verify if user already handled it
        handleVerifyTask(task);
      }, 2000);

    } catch (error) {
      console.error('Start task error:', error);
      
      if (tg && tg.showPopup) {
        tg.showPopup({
          title: 'Error',
          message: error.message,
          buttons: [{ type: 'ok' }]
        });
      } else {
        alert(error.message);
      }
    } finally {
      setProcessingTask(null);
    }
  };

  // Handle task verification - SAME FOR ALL USERS
  const handleVerifyTask = async (task) => {
    if (task.disabled || task.completed) return;

    setProcessingTask(task.id);

    try {
      if (!tg?.initData || !BACKEND_URL) {
        throw new Error('Connection not available. Cannot verify tasks offline.');
      }

      console.log('Verifying task:', task.task_name);

      const verifyRes = await fetch(`${BACKEND_URL}/api/verify-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          initData: tg.initData, 
          taskName: task.task_name 
        }),
      });

      const verifyResult = await verifyRes.json();
      
      if (!verifyRes.ok) {
        throw new Error(verifyResult.error || 'Verification failed');
      }

      console.log('Verification result:', verifyResult);

      // Show result toast
      if (verifyResult.completed) {
        showToast(`Task complete! +${verifyResult.reward} points earned`, 'success');
        
        // Haptic feedback for success
        if (tg && tg.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }
        
        // Refresh tasks to update UI
        await fetchTasks();
      } else {
        showToast(verifyResult.message || 'Task not yet completed', 'warning');
      }

    } catch (error) {
      console.error('Verify task error:', error);
      showToast(error.message || 'Verification failed', 'error');
    } finally {
      setProcessingTask(null);
    }
  };

  // Show loading state - SAME FOR ALL USERS
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div>
          <LoaderCircle className="w-8 h-8 text-accent" />
        </div>
      </div>
    );
  }

  // Show error state - SAME FOR ALL USERS
  if (error) {
    return (
      <div className="p-4 min-h-screen bg-background text-primary flex items-center justify-center">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-red-600/20 border border-red-500 rounded-lg p-6">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-primary mb-2">Connection Error</h1>
            <p className="text-secondary text-sm mb-4">{error}</p>
            <button
              onClick={fetchTasks}
              className="bg-accent hover:bg-accent/80 text-background px-4 py-2 rounded-lg font-bold transition-colors flex items-center space-x-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 bg-background text-primary min-h-screen">
      {/* Header - SAME FOR ALL USERS */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center mb-2">
          <Gift className="w-8 h-8 mr-3 text-accent" />
          <h1 className="text-3xl font-bold">Tasks</h1>
        </div>
        <p className="text-secondary">Complete tasks to earn rewards</p>
      </motion.div>

      {/* Tasks List - SAME FOR ALL USERS */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Gift className="w-16 h-16 text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-secondary mb-2">No tasks available</h3>
            <p className="text-sm text-secondary">Check back later for new tasks!</p>
          </motion.div>
        ) : (
          tasks.map((task, index) => (
            <motion.div
              key={task.id}
              className={`bg-nav p-6 rounded-lg border transition-all duration-200 ${
                task.completed 
                  ? 'border-green-500 bg-green-600/10' 
                  : task.disabled 
                    ? 'border-gray-600 opacity-50' 
                    : 'border-gray-700 hover:border-accent'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-primary mb-2">{task.name}</h3>
                  <p className="text-secondary text-sm mb-4">{task.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1 text-accent">
                      <Gift className="w-4 h-4" />
                      <span>{task.reward} points</span>
                    </div>
                    
                    {task.completed && (
                      <div className="flex items-center space-x-1 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Completed</span>
                      </div>
                    )}
                    
                    {task.disabled && (
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>Coming Soon</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button - SAME FOR ALL USERS */}
                <div className="ml-4">
                  {task.completed ? (
                    <div className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>Done</span>
                    </div>
                  ) : task.disabled ? (
                    <div className="bg-gray-600 text-gray-300 px-4 py-2 rounded-lg font-bold cursor-not-allowed">
                      <Clock className="w-5 h-5" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartTask(task)}
                      disabled={processingTask === task.id}
                      className="bg-accent hover:bg-accent/80 text-background px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingTask === task.id ? (
                        <>
                          <LoaderCircle className="w-5 h-5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-5 h-5" />
                          <span>Start</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Toast Notification - SAME FOR ALL USERS */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-600' :
              toast.type === 'error' ? 'bg-red-600' :
              toast.type === 'warning' ? 'bg-yellow-600' :
              'bg-blue-600'
            } text-white font-bold`}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TasksPage;
