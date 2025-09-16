import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Phone, Send, ChevronRight } from "lucide-react";

/**
 * Minimal, dependency-free IntersectionObserver hook.
 * Mounts children only when scrolled into view → faster first paint.
 */
function useInView(options = { root: null, rootMargin: "0px", threshold: 0.1 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        io.disconnect(); // trigger once
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
  }, [options]);

  return { ref, inView };
}

/** Pastel palette (Tailwind classes) used consistently across cards */
const theme = {
  bgDeep: "bg-[#0E3A3A]", // deep teal background (premium)
  cardShadow: "shadow-[0_12px_30px_rgba(0,0,0,0.2)]",
  mint: "bg-[#D6F3E6]",
  cream: "bg-[#F4EFE7]",
  blush: "bg-[#FBE2E5]",
  lavender: "bg-[#E8E6FF]",
  coral: "bg-[#FFDAD2]",
  mintText: "text-[#0E3A3A]",
};

const SectionTitle = ({ children }) => (
  <h2 className="text-2xl font-semibold text-white/95 tracking-tight">{children}</h2>
);

const HomePage = () => {
  const [tg, setTg] = useState(null);
  const [galleryModal, setGalleryModal] = useState(null);

  // Easter egg state: track last taps of 3141142; unlock after 3 full sequences.
  const [seq, setSeq] = useState("");
  const [unlocks, setUnlocks] = useState(0);

  useEffect(() => {
    const t = window.Telegram?.WebApp;
    if (t) {
      t.ready();
      setTg(t);
    }
  }, []);

  const handleSequenceTap = (digit) => {
    setSeq((prev) => {
      const next = (prev + digit).slice(-7); // keep last 7 digits
      if (next === "3141142") {
        const count = unlocks + 1;
        setUnlocks(count);
        if (count >= 3) {
          setUnlocks(0);
          setSeq("");
          tg?.showPopup({
            title: "🎁 Secret Unlocked",
            message: "Discount code: MEOWCHI42",
            buttons: [{ text: "OK", type: "ok" }],
          });
        }
        return "";
      }
      return next;
    });
  };

  // Floating marshmallow cube CTA
  const FloatingCube = useMemo(
    () => (
      <motion.button
        aria-label="Order Now"
        className="fixed z-40 bottom-16 right-5 w-12 h-12 rounded-2xl bg-white/95 text-[#0E3A3A] font-bold border border-white/70"
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        onClick={() =>
          tg?.showPopup({
            title: "Order Meowchi",
            message: "Open our Telegram bot to place an order.",
            buttons: [{ text: "Open Bot", type: "url", url: "https://t.me/MeowchiOrders_Bot" }],
          })
        }
      >
        ◻︎
      </motion.button>
    ),
    [tg]
  );

  return (
    <div className={`min-h-screen ${theme.bgDeep} font-inter`}>
      {/* ---------- HERO (card-on-dark) ---------- */}
      <section className="px-4 pt-10 pb-6 max-w-md mx-auto">
        <motion.div
          className={`rounded-3xl ${theme.cream} ${theme.cardShadow} p-5 relative overflow-hidden`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* subtle background lines */}
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#0E3A3A" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/90 flex items-center justify-center border border-black/5">
              <img
                src="/assets/meowchi-mascot.png"
                alt="Meowchi"
                className="w-10 h-10 object-contain"
                onError={(e) => (e.currentTarget.style.opacity = "0")}
              />
            </div>
            <div>
              <p className="text-sm text-[#0E3A3A]/70">MEOWCHI | 쫀득쿠키</p>
              <h1 className="text-xl font-semibold text-[#0E3A3A]">Viral Marshmallow Cookies</h1>
            </div>
          </div>

          <p className="mt-5 text-[#0E3A3A]/80">
            Мраморные маршмеллоу-куки из Ташкента. Premium texture. Slow, elegant, unforgettable.
          </p>

          <div className="mt-6 flex gap-3">
            <button
              className="flex-1 bg-[#0E3A3A] text-white rounded-full py-3 font-semibold shadow-lg shadow-[#0E3A3A]/30"
              onClick={() => tg?.openTelegramLink("https://t.me/MeowchiOrders_Bot")}
            >
              Заказать сейчас
            </button>
            <button className="flex-1 border border-[#0E3A3A]/30 text-[#0E3A3A] rounded-full py-3 font-semibold">
              Стать амбассадором
            </button>
          </div>
        </motion.div>
      </section>

      {/* ---------- ABOUT (large pastel card) ---------- */}
      <LazyCard appearDelay={0.1} className={`${theme.mint} text-[#0E3A3A]`}>
        <SectionTitle>О Meowchi</SectionTitle>
        <p className="mt-2">
          Мы готовим корейские <span className="font-semibold">쫀득-куки</span> с фирменной текстурой:
          нежно-тягучие, с мраморным рисунком и чистой эстетикой. Местное производство, мировой вкус.
        </p>
      </LazyCard>

      {/* ---------- MAGIC NUMBER (stacked floating cards) ---------- */}
      <section className="px-4 max-w-md mx-auto space-y-4 mt-4">
        <SectionTitle>Magic Number: 314 11 42</SectionTitle>

        <MagicCard
          className={`${theme.lavender}`}
          number="3.14"
          caption="White Day & Pi Day"
          onTap={() => {
            handleSequenceTap("314".replace(".", "")); // push 314
            tg?.showPopup({
              title: "3.14",
              message:
                "Desserts are like love... infinite and occasionally circular.",
              buttons: [{ text: "OK", type: "ok" }],
            });
          }}
        />

        <MagicCard
          className={`${theme.blush}`}
          number="11"
          caption="Twin Paws, Double Snacks"
          onTap={() => {
            handleSequenceTap("11");
            tg?.showPopup({
              title: "11",
              message:
                "Good things come in twos — like marshmallow cubes and wholesome moods.",
              buttons: [{ text: "OK", type: "ok" }],
            });
          }}
        />

        <MagicCard
          className={`${theme.coral}`}
          number="42"
          caption="The Answer to Life (and Dessert)"
          onTap={() => {
            handleSequenceTap("42");
            tg?.showPopup({
              title: "42",
              message: "Life’s big answer? Start with dessert.",
              buttons: [{ text: "OK", type: "ok" }],
            });
          }}
        />

        <p className="text-white/60 text-xs mt-1">
          (Tap 3.14 → 11 → 42 three times to unlock a secret.)
        </p>
      </section>

      {/* ---------- AMBASSADOR (three pastel cards) ---------- */}
      <section className="px-4 max-w-md mx-auto mt-8">
        <SectionTitle>Амбассадорская программа</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
          <FeatureCard bg={theme.blush} emoji="💸" title="Комиссия" text="15% с первой покупки" />
          <FeatureCard bg={theme.mint} emoji="🎁" title="Стартовый набор" text="Free starter pack" />
          <FeatureCard bg={theme.lavender} emoji="🔗" title="Referral" text="Уникальная ссылка" />
        </div>
        <button className="mt-4 w-full bg-white text-[#0E3A3A] rounded-full py-3 font-semibold">
          Присоединиться
        </button>
      </section>

      {/* ---------- PRODUCT CARDS (like sauces) ---------- */}
      <section className="px-4 max-w-md mx-auto mt-8">
        <SectionTitle>Галерея вкусов</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          {[
            { img: "/assets/card-strawberry.jpg", title: "Strawberry Oreo", bg: theme.cream },
            { img: "/assets/card-matcha.jpg", title: "Matcha Fig", bg: theme.mint },
            { img: "/assets/card-choco.jpg", title: "Choco Mango", bg: theme.coral },
          ].map((p, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.98 }}
              className={`rounded-3xl overflow-hidden text-left ${p.bg} ${theme.cardShadow}`}
              onClick={() => setGalleryModal(p)}
            >
              <div className="aspect-[16/11] w-full bg-white/60">
                <img
                  src={p.img}
                  alt={p.title}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.opacity = "0")}
                />
              </div>
              <div className="p-4">
                <p className="font-semibold text-[#0E3A3A]">{p.title}</p>
                <p className="text-[#0E3A3A]/60 text-sm">쫀득 moment • premium texture</p>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ---------- ORDER CARD (checkout-style) ---------- */}
      <section className="px-4 max-w-md mx-auto my-8">
        <motion.div
          className={`rounded-3xl ${theme.cream} ${theme.cardShadow} p-5`}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#0E3A3A]">Готов заказать?</h3>
            <span className="text-xs text-[#0E3A3A]/60">Tashkent only</span>
          </div>

          <div className="mt-4 space-y-2 text-[#0E3A3A]">
            <Row label="Delivery" value="🚚 Same day / next day" />
            <Row label="Storage" value="❄️ 20 days (fridge)" />
            <Row label="Phone" value="314 11 42" />
          </div>

          <button
            className="mt-5 w-full bg-[#0E3A3A] text-white rounded-full py-3 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#0E3A3A]/30"
            onClick={() => tg?.openTelegramLink("https://t.me/MeowchiOrders_Bot")}
          >
            Заказать через Telegram <ChevronRight size={18} />
          </button>
        </motion.div>
      </section>

      {/* ---------- FOOTER (dark) ---------- */}
      <footer className="px-4 pt-6 pb-12 max-w-md mx-auto text-white/80">
        <div className="flex items-center justify-center gap-6">
          <a href="https://instagram.com/meowchi.lab" aria-label="Instagram">
            <Instagram className="w-6 h-6 hover:scale-110 transition" />
          </a>
          <a href="https://t.me/MeowchiOrders_Bot" aria-label="Telegram">
            <Send className="w-6 h-6 hover:scale-110 transition" />
          </a>
          <a href="tel:+998913141142" aria-label="Phone">
            <Phone className="w-6 h-6 hover:scale-110 transition" />
          </a>
        </div>
        <p className="text-center mt-3 text-sm">Meowchi — viral texture, local flavor, global vibe.</p>
      </footer>

      {/* Floating CTA cube */}
      {FloatingCube}

      {/* Modal for product cards */}
      {galleryModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setGalleryModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl overflow-hidden max-w-md w-[92%]"
          >
            <div className="aspect-[16/11] w-full bg-gray-100">
              <img
                src={galleryModal.img}
                alt={galleryModal.title}
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.opacity = "0")}
              />
            </div>
            <div className="p-5 text-[#0E3A3A]">
              <h3 className="text-lg font-semibold">{galleryModal.title}</h3>
              <p className="text-sm opacity-70 mt-1">
                Premium chewy marble. Tap “Order via Telegram” on the homepage to buy.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

/* ---------- Reusable little components ---------- */

const LazyCard = ({ children, className = "", appearDelay = 0 }) => {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className="px-4 max-w-md mx-auto">
      <motion.div
        className={`rounded-3xl p-5 mt-2 ${className} ${theme.cardShadow}`}
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.5, delay: appearDelay }}
      >
        {children}
      </motion.div>
    </div>
  );
};

const MagicCard = ({ className = "", number, caption, onTap }) => (
  <motion.button
    whileTap={{ scale: 0.985 }}
    onClick={onTap}
    className={`w-full rounded-3xl p-5 text-left ${className} ${theme.cardShadow}`}
  >
    <p className="text-4xl font-bold text-[#0E3A3A]">{number}</p>
    <p className="text-[#0E3A3A]/70 mt-1">{caption}</p>
  </motion.button>
);

const FeatureCard = ({ bg, emoji, title, text }) => (
  <motion.div
    whileHover={{ y: -2 }}
    className={`rounded-3xl p-5 ${bg} ${theme.cardShadow}`}
  >
    <div className="text-3xl">{emoji}</div>
    <p className="mt-2 font-semibold text-[#0E3A3A]">{title}</p>
    <p className="text-[#0E3A3A]/70 text-sm">{text}</p>
  </motion.div>
);

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-[#0E3A3A]/70">{label}</span>
    <span className="font-medium text-[#0E3A3A]">{value}</span>
  </div>
);

export default HomePage;
