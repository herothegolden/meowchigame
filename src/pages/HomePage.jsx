import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Instagram, Phone, Send } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Hero = ({ tg }) => (
  <section className="relative h-screen flex flex-col items-center justify-center text-center text-white bg-gradient-to-r from-teal-400 to-pink-400">
    <motion.h1
      className="text-5xl font-extrabold drop-shadow-lg"
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      MEOWCHI | 쫀득쿠키
    </motion.h1>
    <p className="mt-4 text-lg max-w-xl">
      Вирусные маршмеллоу-куки из Ташкента. Chewy, marbled, bouncy.
    </p>
    <div className="flex gap-4 mt-8">
      <button
        className="bg-white text-teal-500 font-bold py-3 px-6 rounded-full shadow-lg transition hover:scale-105"
        onClick={() => tg?.openTelegramLink("https://t.me/MeowchiOrders_Bot")}
      >
        Заказать сейчас
      </button>
      <button
        className="border-2 border-white text-white font-bold py-3 px-6 rounded-full shadow-lg transition hover:scale-105"
      >
        Стать амбассадором
      </button>
    </div>
    <div className="absolute bottom-10 text-white animate-bounce">
      <ChevronDown className="w-8 h-8 mx-auto" />
      <p className="text-sm">Scroll for Magic Number ↓</p>
    </div>
  </section>
);

const LazySection = ({ children }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return <div ref={ref}>{inView && children}</div>;
};

const HomePage = () => {
  const [tg, setTg] = useState(null);

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    if (telegram) {
      telegram.ready();
      setTg(telegram);
    }
    // Background fetch (doesn't block UI)
    if (BACKEND_URL && telegram?.initData) {
      fetch(`${BACKEND_URL}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: telegram.initData }),
      }).catch(() => {});
    }
  }, []);

  return (
    <div className="w-full font-inter text-gray-800">
      <Hero tg={tg} />

      {/* About Section */}
      <LazySection>
        <section className="min-h-screen bg-gradient-to-r from-amber-50 to-pink-50 flex flex-col md:flex-row items-center justify-center p-12 gap-8">
          <div className="md:w-1/2 space-y-4">
            <h2 className="text-3xl font-bold">О Meowchi</h2>
            <p>
              Мы создаём корейские <span className="text-pink-500">쫀득쿠ки</span> прямо в Ташкенте.
              Каждый батон — это мраморный рисунок, ручная работа и уникальный вкус.
            </p>
            <p>
              쫀득 текстура, визуальный кайф и доступная роскошь — десерт для всех.
            </p>
          </div>
        </section>
      </LazySection>

      {/* Magic Number Section */}
      <LazySection>
        <section>
          {[
            { num: "3.14", text: "White Day & Pi Day", quote: "Desserts are like love... infinite and occasionally circular." },
            { num: "11", text: "Twin Paws, Double Snacks", quote: "Good things come in twos — like marshmallow cubes and wholesome moods." },
            { num: "42", text: "The Answer to Life (and Dessert)", quote: "Life’s big answer? Start with dessert." },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="h-screen flex flex-col items-center justify-center text-center bg-gradient-to-r from-teal-50 to-pink-50 p-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              onClick={() => tg?.showPopup({
                title: item.num,
                message: item.quote,
                buttons: [{ text: "OK", type: "ok" }]
              })}
            >
              <motion.h2
                className="text-7xl font-extrabold cursor-pointer"
                initial={{ scale: 0.8 }}
                whileInView={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                {item.num}
              </motion.h2>
              <p className="mt-4 text-xl">{item.text}</p>
            </motion.div>
          ))}
        </section>
      </LazySection>

      {/* Ambassador Section */}
      <LazySection>
        <section className="min-h-screen bg-gradient-to-r from-pink-50 to-amber-50 p-12 text-center">
          <h2 className="text-3xl font-bold mb-10">Амбассадорская программа</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "💸", title: "Комиссия", desc: "15% с первой покупки" },
              { icon: "🎁", title: "Стартовый набор", desc: "Бесплатный набор для старта" },
              { icon: "🔗", title: "Ссылка", desc: "Уникальная ссылка для друзей" },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-lg shadow-lg p-6 space-y-2 transition hover:scale-105">
                <div className="text-4xl">{card.icon}</div>
                <h3 className="text-xl font-bold">{card.title}</h3>
                <p>{card.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </LazySection>

      {/* Order Now */}
      <LazySection>
        <section className="bg-teal-400 text-center py-20 text-white">
          <h2 className="text-3xl font-bold mb-6">Готов заказать?</h2>
          <button
            className="bg-white text-teal-500 font-bold py-4 px-10 rounded-full shadow-lg text-xl transition hover:scale-105"
            onClick={() => tg?.openTelegramLink("https://t.me/MeowchiOrders_Bot")}
          >
            Заказать через Telegram →
          </button>
          <div className="flex justify-center gap-6 mt-6 text-lg">
            <span>🚚 Доставка по Ташкенту</span>
            <span>❄️ 20 дней в холодильнике</span>
          </div>
        </section>
      </LazySection>

      {/* Footer */}
      <LazySection>
        <footer className="bg-slate-800 text-white py-12 text-center space-y-4">
          <div className="flex justify-center gap-6">
            <a href="https://instagram.com/meowchi.lab"><Instagram className="w-6 h-6 hover:scale-110" /></a>
            <a href="https://t.me/MeowchiOrders_Bot"><Send className="w-6 h-6 hover:scale-110" /></a>
            <a href="tel:+998913141142"><Phone className="w-6 h-6 hover:scale-110" /></a>
          </div>
          <p className="text-lg font-semibold">314 11 42</p>
          <p className="text-sm opacity-80">Meowchi — viral texture, local flavor, global vibe.</p>
        </footer>
      </LazySection>
    </div>
  );
};

export default HomePage;
