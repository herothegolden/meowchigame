import React from 'react';
import { motion } from 'framer-motion';

const OverviewTab = () => {
  const lifeStats = [
    {
      emoji: '🍪',
      title: 'Cookies Consumed',
      value: '800,295',
      subtitle: 'а ведь обещал “только один.”',
      gradient: 'from-[#FFF4E0]/40 to-[#FFD6A5]/20',
    },
    {
      emoji: '🧘‍♂️',
      title: 'Chill Level',
      value: '475h 30m',
      subtitle: 'в Meowchiverse — терапия с эффектом сахара.',
      gradient: 'from-[#E6FFF1]/40 to-[#B2F2D0]/20',
    },
    {
      emoji: '⚡',
      title: 'Power Mood',
      value: '0',
      subtitle: 'сегодня вибы стабильные.',
      gradient: 'from-[#F0E6FF]/40 to-[#D8B4FE]/20',
    },
    {
      emoji: '💬',
      title: 'Social Energy',
      value: '1 день streak',
      subtitle: 'неплохо для интроверта.',
      gradient: 'from-[#FFE6E0]/40 to-[#FFC6A5]/20',
    },
    {
      emoji: '🌈',
      title: 'Texture Rank',
      value: '#42 Worldwide',
      subtitle: 'за вклад в культуру 쫀득.',
      gradient: 'from-[#E0F4FF]/40 to-[#A5D8FF]/20',
    },
    {
      emoji: '💤',
      title: 'Snack Time Saved',
      value: '∞ минут',
      subtitle: 'и всё ещё голоден.',
      gradient: 'from-[#FFFDE6]/40 to-[#FFF1B2]/20',
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 gap-x-3 gap-y-4 relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
    >
      {lifeStats.map((stat, i) => (
        <motion.div
          key={i}
          whileHover={{
            scale: 1.02,
            boxShadow: '0 0 12px rgba(255,255,255,0.08)',
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className={`p-4 rounded-lg border border-white/10 shadow-md backdrop-blur-sm bg-gradient-to-br ${stat.gradient}`}
        >
          <div className="flex flex-col justify-center h-full">
            <p className="text-[15px] font-semibold text-white mb-1">
              {stat.emoji} {stat.title}
            </p>
            <p className="text-[20px] font-bold text-white mb-0.5">
              {stat.value}
            </p>
            <p className="text-[13px] text-[#AEB4BE] leading-snug">
              {stat.subtitle}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default OverviewTab;
