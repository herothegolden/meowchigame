import React from "react";
import { motion } from "framer-motion";

const OverviewTab = () => {
  const lifeStats = [
    {
      title: "Съедено печенек",
      value: "800 295",
      subtitle: "Гравитация дрожит. Ещё чуть-чуть — и мы улетим.",
      gradient: "from-[#A0886B]/30 to-[#705C44]/10",
    },
    {
      title: "Уровень дзена",
      value: "475ч 30м",
      subtitle: "Чем больше часов, тем тише мысли.",
      gradient: "from-[#709C89]/30 to-[#4D7262]/10",
    },
    {
      title: "Настроение по мощности",
      value: "0 %",
      subtitle: "Система стабильна. Эмоции в спячке.",
      gradient: "from-[#7E75A5]/30 to-[#5B5378]/10",
    },
    {
      title: "Социальная энергия",
      value: "1 день",
      subtitle: "Ты говорил с людьми. Герой дня.",
      gradient: "from-[#8C6F63]/30 to-[#59473F]/10",
    },
    {
      title: "Приглашено друзей",
      value: "11",
      subtitle: "Каждый получил полотенце. Никто не вернул.",
      gradient: "from-[#6F889B]/30 to-[#465866]/10",
    },
    {
      title: "Счётчик мяу",
      value: "63",
      subtitle: "Ответ найден. Это — мяу.",
      gradient: "from-[#9C9278]/30 to-[#6B624D]/10",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 gap-4 relative"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {lifeStats.map((stat, i) => (
        <motion.div
          key={i}
          whileHover={{
            scale: 1.015,
            boxShadow: "0 4px 14px rgba(255,255,255,0.06)",
          }}
          transition={{ type: "spring", stiffness: 180, damping: 18 }}
          className={`rounded-2xl border border-white/10 bg-gradient-to-br ${stat.gradient}
                      backdrop-blur-md p-5 flex flex-col justify-center items-center 
                      text-center min-h-[150px] shadow-[0_0_20px_rgba(0,0,0,0.2)]`}
        >
          <p className="text-[14px] font-medium text-gray-200 mb-2 tracking-wide">
            {stat.title}
          </p>
          <p className="text-[28px] font-extrabold text-white mb-2 leading-none">
            {stat.value}
          </p>
          <p className="text-[13px] text-gray-400 leading-snug max-w-[85%]">
            {stat.subtitle}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default OverviewTab;
