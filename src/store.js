// src/store.js
import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Coins
  coins: 150,
  setCoins: (valueOrUpdater) => set((state) => ({
    coins: typeof valueOrUpdater === 'function' ? valueOrUpdater(state.coins) : valueOrUpdater
  })),

  // Settings
  settings: { haptics: true, sound: true, theme: "system" },
  setSettings: (valueOrUpdater) => set((state) => ({
    settings: typeof valueOrUpdater === 'function' ? valueOrUpdater(state.settings) : valueOrUpdater
  })),

  // User Profile
  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),

  // User Stats
  userStats: null,
  setUserStats: (stats) => set({ userStats: stats }),
}));
