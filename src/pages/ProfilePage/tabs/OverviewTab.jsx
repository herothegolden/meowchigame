import React from "react";
import { motion } from "framer-motion";

// NOTE: formatPlayTime kept for backward-compat in case other places still import it,
// but it is no longer used for the “Уровень дзена” card.
const formatPlayTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0ч 0м";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}ч ${mins}м`;
};

const OverviewTab = ({ stats, streakInfo, onUpdate }) => {
  // Existing metrics
  const totalPoints = (stats?.points || 0).toLocaleString();

  // ✅ NEW SOURCE for the Zen card: lifetime games played (plain integer)
  const zenGamesCount = (stats?.games_played || 0).toLocaleString();

  const highScoreToday = (stats?.high_score_today || stats?.high_score || 0).toLocaleString();
  const dailyStreak = stats?.daily_streak || 0;

  // Other cards (unchanged behavior)
  const invitedFriends = (stats?.invited_friends || 11).toLocaleString(); // keep existing placeholder if used
  const meowTaps = stats?.meow_taps || 0;

  const lifeStats = [
    {
      title: "Съедено печенек",
      value: totalPoints,
      subtitle: "Гравитация дрожит. Ещё чуть-чуть — и мы улетим.",
      tint: "from-[#c6b09a]/30 via-[#a98f78]/15 to-[#7d6958]/10",
    },
    {
      // 🔁 Title & subtitle remain EXACTLY the same — only value changed
      title: "Уровень дзена",
      value: zenGamesCount, // ← games played (integer), not time
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
      value: `${dailyStreak}`,
      subtitle:
        dailyStreak > 0
          ? "Ты говорил с людьми. Герой дня."
          : "Пора снова выйти в Meowchiverse.",
      tint: "from-[#b79b8e]/30 via-[#9c8276]/15 to-[#6c5a51]/10",
    },
    {
      title: "Приглашено друзей",
      value: invitedFriends,
      subtitle: "Каждый получил полотенце. Никто не вернул.",
      tint: "from-[#a1b7c9]/30 via-[#839aaf]/15 to-[#5f7385]/10",
    },
    {
      title: "Счётчик мяу",
      value: meowTaps >= 314 ? "314" : `${meowTaps.toLocaleString()}`,
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
      {lifeStats.map((stat, idx) => (
        <motion.div
          key={idx}
          className="relative rounded-2xl p-4 bg-gradient-to-br border border-white/5 overflow-hidden"
          style={{
            backgroundImage:
              `linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.12))`,
          }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.02 * idx }}
        >
          {/* Soft tint */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${stat.tint}`}
            aria-hidden="true"
          />

          {/* Inner content */}
          <div className="relative space-y-2">
            <h3 className="text-[13px] font-semibold text-gray-200 tracking-wide">
              {stat.title}
            </h3>
            <div className="text-4xl font-extrabold text-white/95 leading-tight select-none">
              {stat.value}
            </div>
            <p className="text-[12.5px] text-gray-400 leading-snug">
              {stat.subtitle}
            </p>
          </div>

          {/* Subtle bottom fade for depth */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent pointer-events-none rounded-b-2xl" />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default OverviewTab;
