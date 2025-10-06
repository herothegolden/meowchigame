import React from "react";
import { motion } from "framer-motion";

const OverviewTab = () => {
  const lifeStats = [
    {
      emoji: "🍪",
      title: "Cookies",
      value: "800,295",
      subtitle: "а ведь обещал только один.",
      gradient: "from-[#BBA88C]/30 to-[#9C8872]/20",
    },
    {
      emoji: "🧘‍♂️",
      title: "Chill Level",
      value: "475h 30m",
      subtitle: "в Meowchiverse — терапия с сахаром.",
      gradient: "from-[#89B7A0]/30 to-[#6E9986]/20",
    },
    {
      emoji: "⚡",
      title: "Power Mood",
      value: "0",
      subtitle: "вибы стабильные.",
      gradient: "from-[#9C8FB7]/30 to-[#7B6A9B]/20",
    },
    {
      emoji: "💬",
      title: "Social Energy",
      value: "1 день",
      subtitle: "неплохо для интроверта.",
      gradient: "from-[#B69A8C]/30 to-[#9A7D6D]/20",
    },
    {
      emoji: "🌈",
      title: "Texture Rank",
      value: "#42 World",
      subtitle: "вклад в культуру 쫀득.",
      gradient: "from-[#8BA6B7]/30 to-[#6C899A]/20",
    },
    {
      emoji: "💤",
      title: "Snack Time",
      value: "∞ минут",
      subtitle: "и всё ещё голоден.",
      gradient: "from-[#BEB29A]/30 to-[#A0917E]/20",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 gap-x-3 gap-y-3 relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
    >
      {lifeStats.map((stat, i) => (
        <motion.div
          key={i}
          whileHover={{
            scale: 1.02,
            boxShadow: "0 0 10px rgba(255,255,255,0.08)",
          }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className={`p-4 rounded-lg border border-white/10 shadow-md backdrop-blur-sm bg-gradient-to-br ${stat.gradient} flex flex-col justify-center items-center min-h-[120px] text-center`}
        >
          <p className="text-[15px] font-semibold text-white mb-1">
            {stat.emoji} {stat.title}
          </p>
          <p className="text-[19px] font-bold text-white mb-0.5">
            {stat.value}
          </p>
          <p className="text-[13px] text-[#AEB4BE] leading-snug">
            {stat.subtitle}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default OverviewTab;
