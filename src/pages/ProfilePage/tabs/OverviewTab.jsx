import React from 'react';
import { motion } from 'framer-motion';

const OverviewTab = () => {
  const lifeStats = [
    {
      emoji: '🍪',
      title: 'Cookies Consumed',
      value: '800,295',
      subtitle: 'а ведь обещал “только один.”',
      tint: 'bg-amber-100/10',
    },
    {
      emoji: '🧘‍♂️',
      title: 'Chill Level',
      value: '475h 30m',
      subtitle: 'в Meowchiverse — терапия с эффектом сахара.',
      tint: 'bg-mint-100/10',
    },
    {
      emoji: '⚡',
      title: 'Power Mood',
      value: '0',
      subtitle: 'Сегодня: 0 — но вибы стабильные.',
      tint: 'bg-lilac-100/10',
    },
    {
      emoji: '💬',
      title: 'Social Energy',
      value: '1 день streak',
      subtitle: 'неплохо для интроверта.',
      tint: 'bg-peach-100/10',
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 gap-4 relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
    >
      {lifeStats.map((stat, i) => (
        <div
          key={i}
          className={`p-4 rounded-lg border border-white/10 shadow-md backdrop-blur-sm ${stat.tint}`}
        >
          <p className="text-[15px] font-semibold text-white mb-1">
            {stat.emoji} {stat.title}
          </p>
          <p className="text-xl font-bold text-white mb-0.5">
            {stat.value}
          </p>
          <p className="text-[13px] text-gray-400 leading-snug">
            {stat.subtitle}
          </p>
        </div>
      ))}
    </motion.div>
  );
};

export default OverviewTab;
