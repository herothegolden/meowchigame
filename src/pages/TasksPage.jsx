import React, { useState } from 'react';
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
  Award
} from 'lucide-react';

const TasksPage = () => {
  const [activeTab, setActiveTab] = useState('main');

  // 🐾 Main Tasks Tab
  const mainTasks = [
    {
      id: 1,
      emoji: '🐱',
      name: 'Join the Cat Cult',
      description: 'Join the Meowchi Telegram Group',
      reward: 'Cat Paw Emoji Badge',
      icon: Users,
      completed: false
    },
    {
      id: 2,
      emoji: '📸',
      name: 'Cat-stagram Star',
      description: 'Follow Meowchi Instagram',
      reward: 'Insta Frame cosmetic',
      icon: Instagram,
      completed: false
    },
    {
      id: 3,
      emoji: '🐾',
      name: 'Recruit Your Cat Crew',
      description: 'Invite 2 friends',
      reward: 'Golden Honey Jar booster',
      icon: Gift,
      completed: false
    }
  ];

  // 📅 Daily Tasks Tab
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

  const TaskCard = ({ task, isDaily = false }) => (
    <motion.div
      className={`bg-nav p-4 rounded-lg border border-gray-700 flex items-center justify-between ${
        task.completed ? 'opacity-50' : ''
      }`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center space-x-4 flex-1">
        <div className="text-2xl">{task.emoji}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-primary truncate">{task.name}</h3>
          <p className="text-sm text-secondary">{task.description}</p>
          <div className="flex items-center mt-1">
            <Star className="w-3 h-3 text-accent mr-1" />
            <span className="text-xs text-accent">{task.reward}</span>
          </div>
        </div>
      </div>
      
      <button
        className={`px-4 py-2 rounded-lg font-bold transition-all duration-200 ${
          task.completed
            ? 'bg-green-600 text-white cursor-default'
            : 'bg-accent text-background hover:bg-accent/90'
        }`}
        disabled={task.completed}
      >
        {task.completed ? (
          <div className="flex items-center">
            <CheckSquare className="w-4 h-4 mr-1" />
            Done
          </div>
        ) : (
          'Start'
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
          <Award className="w-5 h-5 mb-1 mr-2" />
          <span className="font-medium">🐾 Main Tasks</span>
        </button>
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md transition-all duration-200 ${
            activeTab === 'daily' 
              ? 'bg-accent text-background' 
              : 'text-secondary hover:text-primary hover:bg-background/20'
          }`}
        >
          <Clock className="w-5 h-5 mb-1 mr-2" />
          <span className="font-medium">📅 Daily Tasks</span>
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
    </div>
  );
};

export default TasksPage;
