// src/components/BottomNav.jsx - Complete with audio integration
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Swords, ShoppingCart } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/game', icon: Swords, label: 'Game' },
  { path: '/shop', icon: ShoppingCart, label: 'Shop' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const BottomNav = () => {
  const { playButtonClick } = useAudio();

  const handleNavClick = () => {
    // Play audio feedback for navigation
    playButtonClick();
    
    // Trigger haptic feedback if available
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-nav border-t border-gray-700 flex justify-around items-center">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={handleNavClick}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full transition-colors duration-200 ${
              isActive ? 'text-accent' : 'text-secondary hover:text-primary'
            }`
          }
        >
          <item.icon size={24} />
          <span className="text-xs mt-1">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
