// HomePage.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Send } from "lucide-react";

// Animation helper
const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut", delay } },
});

// Glass card component
const GlassCard = ({ className = "", children }) => (
  <div
    className={[
      "rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)]",
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

// White placeholder for images
const PlaceholderImage = ({ className = "" }) => (
  <div
    className={[
      "bg-white rounded-3xl shadow-[0_12px_30px_rgba(0,0,0,0.35)]",
      "w-full h-full",
      className,
    ].join(" ")}
  />
);

export default function HomePage() {
  const [tg, setTg] = useState(null);
  useEffect(() => {
    const t = window.Telegram?.WebApp;
    if (t) {
      t.ready();
      setTg(t);
    }
  }, []);

  const openBot = () => {
    const url = "https://t.me/MeowchiOrders_Bot";
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0A0B] text-white font-sans relative overflow-x-hidden">
      {/* subtle film grain */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.07] [background-image:radial-gradient(black_1px,transparent_1px)] [background-size:3px_3px]" />

      {/* ============== HERO ============== */}
      <section className="relative px-6 pt-20 pb-24 md:pt-28 md:pb-32 max-w-[1200px] mx-auto">
        {/* spotlight glow */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(65%_65%_at_70%_25%,rgba(72,210,193,0.22),rgba(0,0,0,0)_70%)]" />
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Copy */}
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show" className="space-y-6">
            <h1 className="text-[46px] md:text-[74px] font-extrabold leading-[1.05] tracking-tight">
              Чётко. Стильно. <span className="inline-block">쫀득.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/85 max-w-[42ch]">
              Это Meowchi — мраморные маршмеллоу-куки из Ташкента. Вкус, который тянется,
              текстура, которая попадает в ваши Stories.{" "}
              <span className="text-white font-semibold">Your new viral obsession.</span>
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={openBot}
              className="group inline-flex items-center gap-2 rounded-full px-7 py-3 bg-gradient-to-r from-[#48D2C1] to-[#4BE1AE] text-[#0A0A0B] font-bold text-lg shadow-[0_15px_35px_rgba(72,210,193,0.35)]"
            >
              Заказать сейчас
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </motion.button>
          </motion.div>

          {/* Hero Image */}
          <motion.div variants={fadeUp(0.1)} initial="hidden" animate="show" className="aspect-[4/3]">
            <PlaceholderImage className="w-full h-full" />
          </motion.div>
        </div>
      </section>

      {/* ============== ABOUT ============== */}
      <section className="px-6 py-16 md:py-20 max-w-[1100px] mx-auto">
        <GlassCard className="p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Почему Meowchi особенный?</h2>
              <p className="text-white/85 text-lg leading-relaxed">
                Meowchi — больше, чем печенье. Это <b>쫀득-текстура</b>, которая делает каждый укус{" "}
                <i>ASMR moment</i>. Мраморный рисунок, эстетика для Instagram, вкус, который
                объединяет друзей. Сделано в Ташкенте, вдохновлено Korean dessert culture, создано
                для того, чтобы стать global trend.
              </p>
              <div className="mt-4 text-white/60 italic">Chewy. Marble. Shareable.</div>
            </div>
            <div className="aspect-[4/3]">
              <PlaceholderImage className="w-full h-full" />
            </div>
          </div>
        </GlassCard>
      </section>

      {/* ============== MAGIC NUMBER ============== */}
      <section className="px-6 py-20 md:py-28 max-w-[1100px] mx-auto relative">
        {/* cosmic gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-700/30 via-fuchsia-500/20 to-pink-500/20 blur-3xl" />
        <div className="text-center mb-12">
          <h3 className="text-3xl md:text-4xl font-bold">Magic Number: 314 11 42</h3>
          <p className="text-white/70 mt-2">
            Нажми, расшарь, unlock the secret. Meowchi — это не только 쫀득쿠키, это целая вселенная.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { n: "3.14", d: "White Day & Pi Day — наш день." },
            { n: "11", d: "двойные лапки, double snacks, двойная радость." },
            { n: "42", d: "The Answer to Life… and dessert." },
          ].map((card) => (
            <motion.div
              key={card.n}
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(255,255,255,0.25)" }}
              className="rounded-3xl p-10 text-center bg-white/10 backdrop-blur-lg border border-white/20"
            >
              <div className="text-6xl font-extrabold tracking-tight mb-3 drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]">
                {card.n}
              </div>
              <p className="text-white/75">{card.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============== AMBASSADOR ============== */}
      <section className="px-6 py-16 md:py-20 max-w-[1100px] mx-auto">
        <div className="mb-10">
          <h3 className="text-3xl md:text-4xl font-bold">Ambassador Program</h3>
          <p className="text-white/70 mt-2">
            Meowchi двигается не инфлюенсерами, а обычными людьми. Your vibe, твои друзья, твой
            Meowchi.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { t: "15% комиссия", s: "с первой покупки" },
            { t: "Free starter pack", s: "для твоего контента" },
            { t: "Referral link", s: "уникальная ссылка для друзей" },
          ].map((item) => (
            <GlassCard key={item.t} className="p-8 hover:scale-[1.03] transition">
              <div className="text-xl font-semibold">{item.t}</div>
              <div className="text-white/70 mt-2">{item.s}</div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ============== PRODUCTS ============== */}
      <section className="px-6 py-20 md:py-24 max-w-[1100px] mx-auto relative">
        {/* pastel glow */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-pink-300/20 via-teal-300/20 to-purple-300/20 blur-3xl" />
        <div className="mb-12 text-center">
          <h3 className="text-3xl md:text-4xl font-bold">Наши продукты</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            { name: "Viral Strawberry & Oreo", desc: "розовое настроение, playful, вирусный фаворит." },
            { name: "Matcha Strawberry & Oreo", desc: "earthy + strawberry twist, эстетика для тех, кто ценит баланс." },
          ].map((p) => (
            <motion.div
              key={p.name}
              whileHover={{ y: -5 }}
              className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
            >
              <div className="p-6">
                <div className="aspect-square">
                  <PlaceholderImage className="w-full h-full rounded-2xl" />
                </div>
                <div className="mt-5">
                  <div className="text-lg font-semibold">{p.name}</div>
                  <div className="text-white/70 mt-1">{p.desc}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============== ORDER ============== */}
      <section className="px-6 py-20 md:py-24 max-w-[900px] mx-auto">
        <GlassCard className="p-10 text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">Как заказать?</h3>
          <ul className="text-white/80 space-y-3 mb-8 text-lg">
            <li>🚚 Доставка по Ташкенту: сегодня или завтра</li>
            <li>❄️ Хранение: 20 дней в холодильнике</li>
            <li>☎️ Телефон: 314 11 42</li>
          </ul>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openBot}
            className="inline-flex items-center gap-2 rounded-full px-8 py-3 bg-gradient-to-r from-[#48D2C1] to-[#4BE1AE] text-[#0A0A0B] font-bold text-lg shadow-[0_15px_35px_rgba(72,210,193,0.35)]"
          >
            <Send className="w-5 h-5" />
            Order via Telegram
          </motion.button>
        </GlassCard>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="px-6 py-12 border-t border-white/10">
        <div className="max-w-[1100px] mx-auto text-center">
          <div className="flex justify-center gap-3">
            <span className="w-4 h-4 rounded-full bg-white/30" />
            <span className="w-4 h-4 rounded-full bg-white/30" />
            <span className="w-4 h-4 rounded-full bg-white/30" />
          </div>
          <p className="mt-4 text-white/70 text-sm">
            Meowchi — viral texture, локальный вкус, глобальные vibes.
          </p>
        </div>
      </footer>
    </div>
  );
}
