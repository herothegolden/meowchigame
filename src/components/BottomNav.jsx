import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Swords, ShoppingCart, CheckSquare, Handshake, Trophy } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/game', icon: Swords, label: 'Game' },
  { path: '/shop', icon: ShoppingCart, label: 'Shop' },
  { path: '/profile', icon: User, label: 'Profile' },
];

// Example of how you might handle more than 4-5 items.
// For now, we'll stick to 4 main ones for a clean look.
// You could add Tasks, Leaderboards etc. to a "More" menu or a secondary nav.

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-nav border-t border-gray-700 flex justify-around items-center">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
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
