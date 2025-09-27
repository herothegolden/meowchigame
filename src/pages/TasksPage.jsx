import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  Star, 
  Users, 
  Instagram, 
  Gift,
  Clock,
  Gamepad2,
  Coffee,
  Moon,
  Zap,
  Camera,
  Heart,
  Target,
  Award,
  LoaderCircle,
  ExternalLink
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const TasksPage = () => {
  const [activeTab, setActiveTab] = useState('main');
  const [mainTasks, setMainTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [processingTask, setProcessingTask] = useState(null);
  const [toast, setToast] = useState(null);
  const [completedTaskId, setCompletedTaskId] = useState(null);
  
  const tg = window.Telegram?.WebApp;

  // Toast system
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Mock main tasks for demo mode
  const MOCK_MAIN_TASKS = [
    {
      id: 1,
      name: 'Join the Cat Cult',
      task_name: 'telegram_group_join',
      description: 'Join the Meowchi Telegram Group',
      reward: 'Cat Paw Emoji Badge',
      reward_points: 500,
      icon: Users,
      completed: false,
      url: 'https://t.me/meowchi_lab'
    },
    {
      id: 2,
      name: 'Cat-stagram Star',
      task_name: 'instagram_follow',
      description: 'Follow Meowchi Instagram',
      reward: 'Insta Frame cosmetic',
      reward_points: 300,
      icon: Instagram,
      completed: false,
      url: 'https://www.instagram.com/meowchi.lab/'
    },
    {
      id: 3,
      name: 'Recruit Your Cat Crew',
      task_name: 'invite_friends',
      description: 'Invite 2 friends',
      reward: 'Golden Honey Jar booster',
      reward_points: 1000,
      icon: Gift,
      completed: false,
      disabled: true // Not implemented yet
    }
  ];

  // Static daily tasks (unchanged)
  const dailyTasks = [
    {
      id: 1,
      emoji: '🍓',
      name: 'Feed the Hungry Stray',
      description: 'Collect 10 strawberries today',
      reward: 'Berry Boost points',
      icon: Heart,
      completed: false
    },
    {
      id: 2,
      emoji: '⏰',
      name: 'Pi Moment of Truth',
      description: 'Log in exactly at 3:14',
      reward: '31.4 bonus points',
      icon: Clock,
      completed: false
    },
    {
      id: 3,
      emoji: '🍪',
      name: 'Double Snack Attack',
      description: 'Play exactly 2 games (not 1, not 3)',
      reward: 'Perfect Balance badge',
      icon: Gamepad2,
      completed: false
    },
    {
      id: 4,
      emoji: '☕',
      name: 'Espresso Meowchi',
      description: 'Log in before 10am, Meowchi will sip coffee',
      reward: 'Morning Energy boost',
      icon: Coffee,
      completed: false
    },
    {
      id: 5,
      emoji: '🌙',
      name: 'Midnight Mischief',
      description: 'Log in after midnight; reward doubles if you meow in chat',
      reward: 'Night Owl badge',
      icon: Moon,
      completed: false
    },
    {
      id: 6,
      emoji: '🐾',
      name: 'Paw-fect Rhythm',
      description: 'Tap Meowchi 11 times in a row without missing',
      reward: 'Rhythm Master title',
      icon: Target,
      completed: false
    },
    {
      id: 7,
      emoji: '😂',
      name: 'Oops, My Paw Slipped',
      description: 'Make one useless swap that doesn\'t match',
      reward: 'Clumsy Cat charm',
      icon: Zap,
      completed: false
    },
    {
      id: 8,
      emoji: '💤',
      name: 'Nap with Meowchi',
      description: 'Stay idle for 20 seconds mid-game',
      reward: 'Sleepy bonus',
      icon: Moon,
      completed: false
    },
    {
      id: 9,
      emoji: '🎉',
      name: 'Chaos Cat',
      description: 'Trigger 3 cascades in a single move',
      reward: 'Chain Reaction badge',
      icon: Zap,
      completed: false
    },
    {
      id: 10,
      emoji: '📸',
      name: 'Send Meowchi a Selfie',
      description: 'Share a score card in chat',
      reward: 'Social Butterfly badge',
      icon: Camera,
      completed: false
    }
  ];

  // Load main tasks from backend
  const loadMainTasks = async () => {
    setLoading(true);
    
    try {
      if (!tg?.initData || !BACKEND_URL) {
        console.log('Demo mode: Using mock main tasks');
        setMainTasks(MOCK_MAIN_TASKS);
        setIsConnected(false);
        setLoading(false);
        return;
      }

      console.log('Loading main tasks from backend...');

      const res = await fetch(`${BACKEND_URL}/api/get-user-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Main tasks loaded:', data.tasks);
        
        // Map backend tasks to frontend format
        const mappedTasks = data.tasks.map(task => ({
          id: task.id,
          name: task.name,
          task_name: task.task_name,
          description: task.task_name === 'telegram_group_join' 
            ? 'Join the Meowchi Telegram Group'
            : 'Follow Meowchi Instagram',
          reward: task.task_name === 'telegram_group_join'
            ? 'Cat Paw Emoji Badge'
            : 'Insta Frame cosmetic',
          reward_points: task.reward_points,
          icon: task.task_name === 'telegram_group_join' ? Users : Instagram,
          completed: task.completed,
          completedAt: task.completedAt,
          url: task.url
        }));

        // Add the unimplemented third task
        mappedTasks.push({
          id: 3,
          name: 'Recruit Your Cat Crew',
          task_name: 'invite_friends',
          description: 'Invite 2 friends',
          reward: 'Golden Honey Jar booster',
          reward_points: 1000,
          icon: Gift,
          completed: false,
          disabled: true
        });
        
        setMainTasks(mappedTasks);
        setIsConnected(true);
      } else {
        throw new Error(`Failed to fetch tasks: ${res.status}`);
      }
    } catch (err) {
      console.error('Main tasks fetch error:', err);
      setMainTasks(MOCK_MAIN_TASKS);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle task start (open link and track)
  const handleStartTask = async (task) => {
    if (task.disabled || task.completed) return;

    setProcessingTask(task.id);

    try {
      if (!isConnected || !tg?.initData || !BACKEND_URL) {
        // Demo mode - just open link
        console.log('Demo: Opening link for task:', task.name);
        if (tg && tg.openLink) {
          tg.openLink(task.url);
        } else {
          window.open(task.url, '_blank');
        }
        
        const message = `Demo: Opened ${task.name} link\n\n⚠️ This is demo mode only.`;
        if (tg && tg.showPopup) {
          tg.showPopup({
            title: 'Demo Mode',
            message: message,
            buttons: [{ type: 'ok' }]
          });
        } else {
          alert(message);
        }
        setProcessingTask(null);
        return;
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

  // Handle task verification
  const handleVerifyTask = async (task) => {
    if (task.disabled || task.completed) return;

    setProcessingTask(task.id);

    try {
      if (!isConnected || !tg?.initData || !BACKEND_URL) {
        setProcessingTask(null);
        return;
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

      // Show result toast instead of popup
      if (verifyResult.completed) {
        showToast(`Task complete! 🎉 +${verifyResult.rewardPoints} points`, 'success');
        setCompletedTaskId(task.id);
        setTimeout(() => setCompletedTaskId(null), 1000); // Clear shake animation
        
        if (tg && tg.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }
      } else {
        showToast('Verification failed. Please complete the action first.', 'error');
        
        if (tg && tg.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('warning');
        }
      }

      // Refresh task list to show updated status
      setTimeout(() => {
        loadMainTasks();
      }, 1000);

    } catch (error) {
      console.error('Verify task error:', error);
      
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

  // Load tasks on component mount
  useEffect(() => {
    loadMainTasks();
  }, []);

  // Reload tasks when user returns to app (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isConnected) {
        console.log('App became visible, refreshing task status...');
        setTimeout(() => {
          loadMainTasks();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected]);

  const TaskCard = ({ task, isDaily = false }) => (
    <motion.div
      className={`bg-nav p-4 rounded-lg border border-gray-700 flex items-center justify-between ${
        task.completed ? 'opacity-75 border-green-500' : task.disabled ? 'opacity-50' : ''
      }`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ 
        opacity: 1, 
        x: 0,
        // Shake animation when task is completed
        ...(completedTaskId === task.id ? {
          x: [0, -10, 10, -10, 10, 0],
          transition: { duration: 0.6 }
        } : {})
      }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: task.disabled ? 1 : 1.02 }}
    >
      <div className="flex items-center space-x-4 flex-1">
        <div className="text-2xl">
          {isDaily ? task.emoji : 
           task.id === 1 ? '🐱' : 
           task.id === 2 ? '📸' : '🐾'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold truncate ${task.completed ? 'text-green-400' : 'text-primary'}`}>
            {task.name}
          </h3>
          <p className="text-sm text-secondary">{task.description}</p>
          <div className="flex items-center mt-1">
            <Star className="w-3 h-3 text-accent mr-1" />
            <span className="text-xs text-accent">
              {isDaily ? task.reward : `${task.reward_points} points + ${task.reward}`}
            </span>
          </div>
        </div>
      </div>
      
      <button
        onClick={() => isDaily ? null : task.completed ? null : handleStartTask(task)}
        disabled={task.disabled || task.completed || processingTask === task.id}
        className={`px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center space-x-2 ${
          task.completed
            ? 'bg-green-600 text-white cursor-default'
            : task.disabled
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : processingTask === task.id
            ? 'bg-blue-600 text-white cursor-wait'
            : 'bg-accent text-background hover:bg-accent/90'
        }`}
      >
        {task.completed ? (
          <>
            <CheckSquare className="w-4 h-4" />
            <span>Done</span>
          </>
        ) : task.disabled ? (
          <span>Soon</span>
        ) : (
          <>
            {processingTask === task.id ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            <span>Start</span>
          </>
        )}
      </button>
    </motion.div>
  );

  return (
    <div className="p-4 space-y-6 bg-background text-primary">
      {/* Header */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center mb-2">
          <CheckSquare className="w-8 h-8 mr-3 text-accent" />
          <h1 className="text-3xl font-bold">Tasks & Challenges</h1>
        </div>
        <p className="text-secondary">Complete tasks to earn rewards and badges</p>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center space-x-2 text-secondary">
          <LoaderCircle className="w-5 h-5 animate-spin" />
          <span>Loading tasks...</span>
        </div>
      )}

      {/* Tab Navigation */}
      <motion.div
        className="flex bg-nav rounded-lg border border-gray-700 p-1"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <button
          onClick={() => setActiveTab('main')}
          className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md transition-all duration-200 ${
            activeTab === 'main' 
              ? 'bg-accent text-background' 
              : 'text-secondary hover:text-primary hover:bg-background/20'
          }`}
        >
          <Award className="w-5 h-5 mr-2" />
          <span className="font-medium">Main Tasks</span>
        </button>
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md transition-all duration-200 ${
            activeTab === 'daily' 
              ? 'bg-accent text-background' 
              : 'text-secondary hover:text-primary hover:bg-background/20'
          }`}
        >
          <Clock className="w-5 h-5 mr-2" />
          <span className="font-medium">Daily Tasks</span>
        </button>
      </motion.div>

      {/* Task Content */}
      <motion.div className="space-y-3" layout>
        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div
              key="main-tasks"
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {mainTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <TaskCard task={task} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'daily' && (
            <motion.div
              key="daily-tasks"
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {dailyTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <TaskCard task={task} isDaily={true} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`fixed bottom-20 left-4 right-4 p-4 rounded-lg shadow-lg z-50 flex items-center space-x-3 ${
              toast.type === 'success' ? 'bg-green-600' : 
              toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            }`}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
          >
            {toast.type === 'info' && <LoaderCircle className="w-5 h-5 animate-spin text-white" />}
            {toast.type === 'success' && <CheckSquare className="w-5 h-5 text-white" />}
            {toast.type === 'error' && <ExternalLink className="w-5 h-5 text-white" />}
            <span className="text-white font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TasksPage;
