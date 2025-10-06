import React from "react";
import { motion } from "framer-motion";

const OverviewTab = () => {
  const lifeStats = [
    {
      title: "Съедено печенек",
      value: "800 295",
      subtitle: "Статистически этого хватит, чтобы изменить гравитацию.",
      gradient: "from-[#BBA88C]/30 to-[#9C8872]/20",
    },
    {
      title: "Уровень дзена",
      value: "475ч 30м",
      subtitle: "Время потрачено с пользой. Наверное.",
      gradient: "from-[#89B7A0]/30 to-[#6E9986]/20",
    },
    {
      title: "Настроение по мощности",
      value: "0 %",
      subtitle: "Система стабильна. Эмоции не обязательны. 쫀득 — да.",
      gradient: "from-[#9C8FB7]/30 to-[#7B6A9B]/20",
    },
    {
      title: "Социальная энергия",
      value: "1 день streak",
      subtitle: "Ты поговорил с людьми. Герой. Теперь можно лечь.",
      gradient: "from-[#B69A8C]/30 to-[#9A7D6D]/20",
    },
    {
      title: "Приглашено друзей",
      value: "11",
      subtitle: "Каждый получил полотенце. Никто не вернул.",
      gradient: "from-[#8BA6B7]/30 to-[#6C899A]/20",
    },
    {
      title: "Счётчик мяу",
      value: "63",
      subtitle:
        "Ответ на главный вопрос жизни, Вселенной и текстуры — это мяу.",
      gradient: "from-[#BEB29A]/30 to-[#A0917E]/20",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 gap-x-3 gap-y-3"
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
          className={`p-4 rounded-lg border border-white/10 shadow-md backdrop-blur-sm bg-gradient-to-br ${stat.gradient} flex flex-col justify-center items-center text-center min-h-[130px]`}
        >
          <p className="text-[15px] font-semibold text-white mb-1 leading-tight">
            {stat.title}
          </p>
          <p className="text-[26px] font-extrabold text-white mb-1 leading-none">
            {stat.value}
          </p>
          <p className="text-[13px] text-[#AEB4BE] leading-snug max-w-[90%]">
            {stat.subtitle}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default OverviewTab;
