import React from "react";
import { motion } from "framer-motion";

const OverviewTab = () => {
  const lifeStats = [
    {
      title: "Съедено печенек",
      value: "800 295",
      subtitle: "Гравитация дрожит. Ещё чуть-чуть — и мы улетим.",
      gradient: "from-[#D6C1A3]/20 to-[#BBA88C]/10",
    },
    {
      title: "Уровень дзена",
      value: "475ч 30м",
      subtitle: "Чем больше часов, тем тише мысли.",
      gradient: "from-[#9AB9A9]/20 to-[#6E9986]/10",
    },
    {
      title: "Настроение по мощности",
      value: "0 %",
      subtitle: "Система стабильна. Эмоции в спячке.",
      gradient: "from-[#9C8FB7]/20 to-[#7B6A9B]/10",
    },
    {
      title: "Социальная энергия",
      value: "1 день streak",
      subtitle: "Ты говорил с людьми. Герой дня.",
      gradient: "from-[#B69A8C]/20 to-[#9A7D6D]/10",
    },
    {
      title: "Приглашено друзей",
      value: "11",
      subtitle: "Каждый получил полотенце. Никто не вернул.",
      gradient: "from-[#8BA6B7]/20 to-[#6C899A]/10",
    },
    {
      title: "Счётчик мяу",
      value: "63",
      subtitle: "Ответ найден. Это — мяу.",
      gradient: "from-[#BEB29A]/20 to-[#9E8F79]/10",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 gap-x-3 gap-y-3 relative"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {lifeStats.map((stat, i) => (
        <motion.div
          key={i}
          whileHover={{
            scale: 1.03,
            boxShadow: "0 0 20px rgba(255,255,255,0.08)",
          }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className={`p-4 rounded-2xl border border-white/10 bg-gradient-to-br ${stat.gradient} backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex flex-col justify-center items-center min-h-[120px] text-center select-none transition-transform duration-200`}
        >
          <p className="text-[13px] text-[#D8D8D8] mb-1 font-medium tracking-wide">
            {stat.title}
          </p>
          <p className="text-[28px] font-bold text-white mb-1 leading-tight">
            {stat.value}
          </p>
          <p className="text-[12px] text-[#AEB4BE] max-w-[90%] leading-snug">
            {stat.subtitle}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default OverviewTab;
