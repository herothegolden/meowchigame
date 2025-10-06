import React from "react";
import { motion } from "framer-motion";

// Helper: convert seconds → "Xч Yм"
const formatPlayTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0ч 0м";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}ч ${mins}м`;
};

const OverviewTab = ({ stats, streakInfo, onUpdate }) => {
  const totalPoints = (stats?.points || 0).toLocaleString();
  const totalPlay =
    typeof stats?.totalPlayTime === "string"
      ? stats.totalPlayTime
      : formatPlayTime(stats?.totalPlayTime || 0);
  const highScoreToday = (stats?.high_score_today || 0).toLocaleString();
  const dailyStreak = stats?.daily_streak || 0;
  const meowTaps = stats?.meow_taps || 0;

  const lifeStats = [
    {
      title: "Съедено печенек",
      value: totalPoints,
      subtitle: "Гравитация дрожит. Ещё чуть-чуть — и мы улетим.",
      tint: "from-[#c6b09a]/30 via-[#a98f78]/15 to-[#7d6958]/10",
    },
    {
      title: "Уровень дзена",
      value: totalPlay,
      subtitle: "Чем больше часов, тем тише мысли.",
      tint: "from-[#9db8ab]/30 via-[#7d9c8b]/15 to-[#587265]/10",
    },
    {
      title: "Настроение по мощности",
      value: highScoreToday,
      subtitle: "Рекорд дня. Система сияет, ты тоже.",
      tint: "from-[#b3a8cf]/30 via-[#9c8bbd]/15 to-[#756a93]/10",
    },
    {
      title: "Социальная энергия",
      value: `${dailyStreak} ${dailyStreak === 1} `,
      subtitle:
        dailyStreak > 0
          ? "Ты говорил с людьми. Герой дня."
          : "Пора снова выйти в Meowchiverse.",
      tint: "from-[#b79b8e]/30 via-[#9c8276]/15 to-[#6c5a51]/10",
    },
    {
      title: "Приглашено друзей",
      value: "11",
      subtitle: "Каждый получил полотенце. Никто не вернул.",
      tint: "from-[#a1b7c8]/30 via-[#869dac]/15 to-[#5d707d]/10",
    },
    {
      title: "Счётчик мяу",
      value:
        meowTaps >= 314
          ? "314"
          : `${meowTaps.toLocaleString()}`,
      subtitle:
        meowTaps >= 314
          ? "Совершенство достигнуто — мир в равновесии."
          : "Нажимай дальше. Мяу ждёт.",
      tint: "from-[#c7bda3]/30 via-[#a79a83]/15 to-[#756c57]/10",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {lifeStats.map((stat, i) => (
        <motion.div
          key={i}
          whileHover={{
            scale: 1.015,
            boxShadow: "0 8px 22px rgba(255,255,255,0.06)",
          }}
          transition={{ type: "spring", stiffness: 180, damping: 18 }}
          className={`relative rounded-2xl border border-white/10 
                      bg-gradient-to-br ${stat.tint}
                      backdrop-blur-xl p-5 h-[155px] 
                      flex flex-col justify-center items-center text-center 
                      shadow-[0_0_20px_rgba(0,0,0,0.25)] overflow-hidden`}
        >
          {/* Top reflection */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />
          {/* Inner glow */}
          <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5 shadow-inner pointer-events-none" />

          <div className="flex flex-col items-center justify-center space-y-2 max-w-[88%]">
            <p className="text-[13.5px] font-medium text-gray-200 tracking-wide leading-tight">
              {stat.title}
            </p>
            <p className="text-[24px] font-extrabold text-white leading-none tracking-tight drop-shadow-sm">
              {stat.value}
            </p>
            <p className="text-[12.5px] text-gray-400 leading-snug">
              {stat.subtitle}
            </p>
          </div>

          {/* Bottom fade for depth */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent pointer-events-none rounded-b-2xl" />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default OverviewTab;
