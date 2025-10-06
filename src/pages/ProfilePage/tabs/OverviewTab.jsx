import React, { useState } from "react";
import { motion } from "framer-motion";

const OverviewTab = () => {
  const [meowCount, setMeowCount] = useState(42);

  const handleMeow = () => {
    setMeowCount((prev) => prev + 1);
    // Optional: play sound or small sparkle animation
  };

  const lifeStats = [
    {
      emoji: "🍪",
      title: "Съедено печенек",
      value: "800 295",
      subtitle: "Статистически этого хватит, чтобы изменить гравитацию.",
      gradient: "from-[#BBA88C]/30 to-[#9C8872]/20",
    },
    {
      emoji: "🧘‍♂️",
      title: "Уровень дзена",
      value: "475 ч 30 м",
      subtitle: "Время потрачено с пользой. Наверное.",
      gradient: "from-[#89B7A0]/30 to-[#6E9986]/20",
    },
    {
      emoji: "⚡",
      title: "Настроение по мощности",
      value: "0 %",
      subtitle: "Система стабильна. Эмоции не обязательны. 쫀득 — да.",
      gradient: "from-[#9C8FB7]/30 to-[#7B6A9B]/20",
    },
    {
      emoji: "💬",
      title: "Социальная энергия",
      value: "1 день streak",
      subtitle: "Ты поговорил с людьми. Герой. Теперь можно лечь.",
      gradient: "from-[#B69A8C]/30 to-[#9A7D6D]/20",
    },
    {
      emoji: "🐾",
      title: "Приглашено друзей",
      value: "11",
      subtitle: "Каждый получил полотенце. Никто не вернул.",
      gradient: "from-[#8BA6B7]/30 to-[#6C899A]/20",
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
            scale: 1.03,
            boxShadow: "0 0 12px rgba(255,255,255,0.1)",
          }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className={`p-6 rounded-2xl border border-white/10 shadow-md backdrop-blur-sm bg-gradient-to-br ${stat.gradient} flex flex-col justify-center items-center text-center min-h-[180px]`}
        >
          <p className="text-[15px] font-semibold text-white/90 mb-2">
            {stat.emoji} {stat.title}
          </p>
          <p className="text-[60px] font-extrabold text-white leading-none mb-2">
            {stat.value}
          </p>
          <p className="text-[13px] text-[#AEB4BE] max-w-[90%]">
            {stat.subtitle}
          </p>
        </motion.div>
      ))}

      {/* Interactive Meow Counter */}
      <motion.div
        whileHover={{
          scale: 1.05,
          boxShadow: "0 0 16px rgba(255,255,255,0.15)",
        }}
        whileTap={{ scale: 0.97 }}
        onClick={handleMeow}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="p-6 rounded-2xl border border-white/10 shadow-md backdrop-blur-sm 
          bg-gradient-to-br from-[#BDA3B9]/30 to-[#A989A0]/20 
          flex flex-col justify-center items-center text-center min-h-[180px] select-none cursor-pointer"
      >
        <p className="text-[15px] font-semibold text-white/90 mb-2">
          😻 Счётчик мяу
        </p>
        <motion.p
          key={meowCount}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="text-[60px] font-extrabold text-white leading-none mb-2"
        >
          {meowCount}
        </motion.p>
        <p className="text-[13px] text-[#AEB4BE] max-w-[90%]">
          Ответ на главный вопрос жизни, Вселенной и текстуры — это мяу.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default OverviewTab;
