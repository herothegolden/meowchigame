import React from "react";
import { motion } from "framer-motion";

const OverviewTab = () => {
  const lifeStats = [
    {
      title: "Съедено печенек",
      value: "800 295",
      subtitle: "Гравитация дрожит. Ещё чуть-чуть — и мы улетим.",
      gradient: "from-[#BBA88C]/15 to-[#9C8872]/5",
    },
    {
      title: "Уровень дзена",
      value: "475ч 30м",
      subtitle: "Чем больше часов, тем тише мысли.",
      gradient: "from-[#89B7A0]/15 to-[#6E9986]/5",
    },
    {
      title: "Настроение по мощности",
      value: "0 %",
      subtitle: "Система стабильна. Эмоции в спячке.",
      gradient: "from-[#9C8FB7]/15 to-[#7B6A9B]/5",
    },
    {
      title: "Социальная энергия",
      value: "1 день",
      subtitle: "Ты говорил с людьми. Герой дня.",
      gradient: "from-[#B69A8C]/15 to-[#9A7D6D]/5",
    },
    {
      title: "Приглашено друзей",
      value: "11",
      subtitle: "Каждый получил полотенце. Никто не вернул.",
      gradient: "from-[#8BA6B7]/15 to-[#6C899A]/5",
    },
    {
      title: "Счётчик мяу",
      value: "63",
      subtitle: "Ответ найден. Это — мяу.",
      gradient: "from-[#BEB29A]/15 to-[#9E8F79]/5",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 sm:gap-4 relative"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {lifeStats.map((stat, i) => (
        <motion.div
          key={i}
          whileHover={{
            scale: 1.02,
            boxShadow: "0 4px 18px rgba(255,255,255,0.07)",
          }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className={`rounded-2xl border border-white/10 bg-gradient-to-br ${stat.gradient} backdrop-blur-md
          flex flex-col justify-center items-center text-center min-h-[140px] sm:min-h-[160px] 
          px-4 py-5 transition-all duration-200`}
        >
          <p className="text-[14px] sm:text-[15px] font-medium text-white/80 mb-[6px] leading-none">
            {stat.title}
          </p>
          <p className="text-[30px] sm:text-[32px] font-extrabold text-white mb-[6px] leading-none tracking-tight">
            {stat.value}
          </p>
          <p className="text-[13px] sm:text-[14px] text-white/60 leading-snug max-w-[88%]">
            {stat.subtitle}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default OverviewTab;
