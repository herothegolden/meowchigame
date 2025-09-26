// HomePage.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Send } from "lucide-react";

/** Small helpers */
const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut", delay } },
});

const GlassCard = ({ className = "", children }) => (
  <div
    className={[
      "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.25)]",
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

const PlaceholderImage = ({ className = "" }) => (
  <div
    className={[
      "bg-white rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
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
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white">
      {/* subtle film grain */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.07] [background-image:radial-gradient(black_1px,transparent_1px)] [background-size:3px_3px]"></div>

      {/* ============== HERO ============== */}
      <section className="relative px-5 pt-16 pb-14 md:pt-24 md:pb-24 max-w-[1100px] mx-auto">
        {/* spotlight gradient */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_70%_20%,rgba(71,206,197,0.18),rgba(0,0,0,0)_60%)]" />
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Hero copy */}
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show" className="space-y-6">
            <h1 className="text-[44px] leading-[1.05] md:text-[68px] md:leading-[1.02] font-extrabold tracking-tight">
              Чётко. Стильно. <span className="inline-block">쫀득.</span>
            </h1>
            <p className="text-[17px] md:text-[18px] text-white/80 max-w-[42ch]">
              Это Meowchi — мраморные маршмеллоу-куки из Ташкента. Вкус, который тянется,
              текстура, которая попадает в ваши Stories. <span className="text-white">Your new viral obsession.</span>
            </p>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openBot}
                className="group inline-flex items-center gap-2 rounded-full px-6 py-3 bg-[#48D2C1] text-[#0B0B0C] font-semibold shadow-[0_12px_30px_rgba(72,210,193,0.35)]"
              >
                Заказать сейчас <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </motion.button>
            </div>
          </motion.div>

          {/* Hero visual placeholder */}
          <motion.div
            variants={fadeUp(0.1)}
            initial="hidden"
            animate="show"
            className="aspect-[4/3] md:aspect-[5/4]"
          >
            <PlaceholderImage className="w-full h-full" />
          </motion.div>
        </div>
      </section>

      {/* ============== ABOUT ============== */}
      <section className="px-5 py-10 md:py-16 max-w-[1100px] mx-auto">
        <GlassCard className="p-6 md:p-10">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Почему Meowchi особенный?</h2>
              <p className="text-white/85 text-[16.5px] leading-relaxed">
                Meowchi — больше, чем печенье. Это <b>쫀득-текстура</b>, которая делает каждый укус
                <i> ASMR moment</i>. Мраморный рисунок, эстетика для Instagram, вкус, который объединяет друзей.
                Сделано в Ташкенте, вдохновлено Korean dessert culture, создано для того, чтобы стать global trend.
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
      <section className="px-5 py-12 md:py-18 max-w-[1100px] mx-auto">
        <div className="mb-8 text-center">
          <h3 className="text-2xl md:text-3xl font-bold">Magic Number: 314 11 42</h3>
          <p className="text-white/70 mt-2">
            Нажми, расшарь, unlock the secret. Meowchi — это не только 쫀득쿠키, это целая вселенная.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "3.14", d: "White Day & Pi Day — наш день." },
            { n: "11", d: "двойные лапки, double snacks, двойная радость." },
            { n: "42", d: "The Answer to Life… and dessert." },
          ].map((card, i) => (
            <motion.div
              key={card.n}
              whileHover={{ y: -4, scale: 1.02 }}
              className="rounded-3xl bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] border border-white/10 p-7 text-center shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
            >
              <div className="text-6xl font-extrabold tracking-tight mb-2">{card.n}</div>
              <div className="text-white/75">{card.d}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============== AMBASSADOR ============== */}
      <section className="px-5 py-12 md:py-18 max-w-[1100px] mx-auto">
        <div className="mb-6">
          <h3 className="text-2xl md:text-3xl font-bold">Ambassador Program</h3>
          <p className="text-white/75 mt-2">
            Meowchi двигается не инфлюенсерами, а обычными людьми. Your vibe, твои друзья, твой Meowchi.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { t: "15% комиссия", s: "с первой покупки" },
            { t: "Free starter pack", s: "для твоего контента" },
            { t: "Referral link", s: "уникальная ссылка для друзей" },
          ].map((item) => (
            <GlassCard key={item.t} className="p-7 border-white/15">
              <div className="text-xl font-semibold">{item.t}</div>
              <div className="text-white/70 mt-1">{item.s}</div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ============== PRODUCTS ============== */}
      <section className="px-5 py-12 md:py-18 max-w-[1100px] mx-auto">
        <div className="mb-8 text-center">
          <h3 className="text-2xl md:text-3xl font-bold">Наши продукты</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: "Strawberry Oreo", desc: "розовое настроение, playful, вирусный фаворит." },
            { name: "Matcha Fig", desc: "earthy + aesthetic, для тех, кто ценит баланс." },
            { name: "Choco Mango", desc: "тропик vibes, шоколад + манго." },
          ].map((p) => (
            <motion.div
              key={p.name}
              whileHover={{ y: -4 }}
              className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
            >
              <div className="p-5">
                <div className="aspect-square">
                  <PlaceholderImage className="w-full h-full rounded-2xl" />
                </div>
                <div className="mt-4">
                  <div className="text-lg font-semibold">{p.name}</div>
                  <div className="text-white/70 text-[15px]">{p.desc}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============== ORDER ============== */}
      <section className="px-5 py-12 md:py-18 max-w-[900px] mx-auto">
        <GlassCard className="p-8 md:p-10 text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">Как заказать?</h3>
          <ul className="text-white/80 space-y-2 mb-6">
            <li>🚚 Доставка по Ташкенту: сегодня или завтра</li>
            <li>❄️ Хранение: 20 дней в холодильнике</li>
            <li>☎️ Телефон: 314 11 42</li>
          </ul>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openBot}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 bg-[#48D2C1] text-[#0B0B0C] font-semibold shadow-[0_12px_30px_rgba(72,210,193,0.35)]"
          >
            <Send className="w-5 h-5" />
            Order via Telegram
          </motion.button>
        </GlassCard>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="px-5 py-12 border-t border-white/10">
        <div className="max-w-[1100px] mx-auto text-center">
          <div className="mx-auto flex justify-center gap-3">
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
