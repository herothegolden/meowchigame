import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Instagram, Phone, Send } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const HomePage = () => {
  const [tg, setTg] = useState(null);
  const [galleryModal, setGalleryModal] = useState(null);
  const [secretClicks, setSecretClicks] = useState([]);

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    if (telegram) {
      telegram.ready();
      setTg(telegram);
    }
  }, []);

  // Easter Egg logic
  const handleSecretClick = (num) => {
    const sequence = [...secretClicks, num].slice(-7); // keep last 7 taps
    setSecretClicks(sequence);

    if (sequence.join("") === "3141142") {
      tg?.showPopup({
        title: "🎁 Secret Unlocked",
        message: "Discount code: MEOWCHI42",
        buttons: [{ text: "OK", type: "ok" }],
      });
      setSecretClicks([]);
    }
  };

  return (
    <div className="w-full font-inter text-gray-800">
      {/* Floating Marshmallow Cube */}
      <motion.div
        className="fixed w-12 h-12 bg-white rounded-lg shadow-lg cursor-pointer z-50"
        animate={{ x: ["10%", "80%", "50%"], y: ["20%", "60%", "30%"] }}
        transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
        onClick={() =>
          tg?.showPopup({
            title: "Order Now",
            message: "Tap below to order Meowchi Cookies!",
            buttons: [
              { text: "Open Bot", type: "url", url: "https://t.me/MeowchiOrders_Bot" },
              { text: "Close", type: "cancel" },
            ],
          })
        }
      />

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center text-white bg-gradient-to-r from-teal-300 via-pink-200 to-amber-100">
        <motion.h1
          className="text-6xl font-extrabold drop-shadow-lg"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          MEOWCHI | 쫀득쿠키
        </motion.h1>
        <p className="mt-6 text-xl max-w-xl text-black/80">
          Вирусные маршмеллоу-куки из Ташкента. Premium, chewy, and mysterious.
        </p>
        <div className="flex gap-6 mt-10">
          <button
            className="bg-white text-teal-500 font-bold py-3 px-8 rounded-full shadow-lg transition hover:shadow-teal-400/70 hover:scale-105"
            onClick={() => tg?.openTelegramLink("https://t.me/MeowchiOrders_Bot")}
          >
            Заказать сейчас
          </button>
          <button className="border-2 border-white text-white font-bold py-3 px-8 rounded-full shadow-lg transition hover:shadow-pink-400/70 hover:scale-105">
            Стать амбассадором
          </button>
        </div>
        <div className="absolute bottom-10 text-white animate-bounce">
          <ChevronDown className="w-8 h-8 mx-auto" />
          <p className="text-sm">Scroll for Magic Number ↓</p>
        </div>
      </section>

      {/* About Section */}
      <section className="min-h-screen bg-gradient-to-r from-amber-50 to-pink-50 flex flex-col md:flex-row items-center justify-center p-12 gap-12">
        <img
          src="/assets/meowchi-mascot.png"
          alt="Meowchi Mascot"
          className="rounded-lg shadow-xl w-60 md:w-80 hover:scale-105 transition-transform"
        />
        <div className="md:w-1/2 bg-white/70 rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900">О Meowchi</h2>
          <p className="mt-4">
            Мы создаём корейские <span className="text-pink-500">쫀득쿠ки</span> прямо в Ташкенте.
            Каждый батон — это мраморный рисунок, ручная работа и уникальный вкус.
          </p>
          <p className="mt-4">
            쫀득 текстура, эстетика премиум-десерта и уютный мистический вайб — всё это Meowchi.
          </p>
        </div>
      </section>

      {/* Magic Numbers */}
      <section>
        {[
          { num: "3.14", text: "White Day & Pi Day", quote: "Desserts are like love... infinite and occasionally circular." },
          { num: "11", text: "Twin Paws, Double Snacks", quote: "Good things come in twos — like marshmallow cubes and wholesome moods." },
          { num: "42", text: "The Answer to Life (and Dessert)", quote: "Life’s big answer? Start with dessert." },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="h-screen flex flex-col items-center justify-center text-center bg-gradient-to-r from-purple-100 via-pink-100 to-teal-100 p-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            onClick={() => {
              handleSecretClick(item.num);
              tg?.showPopup({
                title: item.num,
                message: item.quote,
                buttons: [{ text: "OK", type: "ok" }],
              });
            }}
          >
            <motion.h2
              className="text-7xl font-extrabold text-gray-900 drop-shadow-lg cursor-pointer"
              initial={{ scale: 0.8 }}
              whileInView={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {item.num}
            </motion.h2>
            <p className="mt-6 text-xl text-gray-700">{item.text}</p>
          </motion.div>
        ))}
      </section>

      {/* Ambassador Program */}
      <section className="min-h-screen bg-gradient-to-r from-pink-50 to-amber-50 p-12 text-center">
        <h2 className="text-3xl font-bold mb-10">Амбассадорская программа</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: "💸", title: "Комиссия", desc: "15% с первой покупки" },
            { icon: "🎁", title: "Стартовый набор", desc: "Бесплатный набор для старта" },
            { icon: "🔗", title: "Ссылка", desc: "Уникальная ссылка для друзей" },
          ].map((card, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="bg-white/80 rounded-xl shadow-lg p-8 transition hover:shadow-pink-200"
            >
              <div className="text-4xl">{card.icon}</div>
              <h3 className="text-xl font-bold mt-4">{card.title}</h3>
              <p className="mt-2">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Product Gallery */}
      <section className="min-h-screen bg-gradient-to-r from-teal-50 to-pink-50 p-12">
        <h2 className="text-3xl font-bold text-center mb-10">Галерея вкусов</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {["strawberry.jpg", "matcha.jpg", "choco.jpg"].map((img, i) => (
            <div
              key={i}
              className="relative rounded-xl overflow-hidden shadow-lg cursor-pointer transition hover:shadow-pink-200"
              onClick={() => setGalleryModal(img)}
            >
              <img src={`/assets/${img}`} alt="Cookie" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                <p className="text-white text-lg">쫀득 moment 🍓</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Order CTA */}
      <section className="bg-teal-400 text-center py-20 text-white">
        <h2 className="text-3xl font-bold mb-6">Готов заказать?</h2>
        <button
          className="bg-white text-teal-500 font-bold py-4 px-10 rounded-full shadow-lg text-xl transition hover:scale-105 hover:shadow-teal-300"
          onClick={() => tg?.openTelegramLink("https://t.me/MeowchiOrders_Bot")}
        >
          Заказать через Telegram →
        </button>
        <div className="flex justify-center gap-6 mt-6 text-lg">
          <span>🚚 Доставка по Ташкенту</span>
          <span>❄️ 20 дней в холодильнике</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12 text-center space-y-4">
        <div className="flex justify-center gap-8">
          <a href="https://instagram.com/meowchi.lab"><Instagram className="w-6 h-6 hover:scale-110" /></a>
          <a href="https://t.me/MeowchiOrders_Bot"><Send className="w-6 h-6 hover:scale-110" /></a>
          <a href="tel:+998913141142"><Phone className="w-6 h-6 hover:scale-110" /></a>
        </div>
        <p className="text-lg font-semibold">314 11 42</p>
        <p className="text-sm opacity-80">Meowchi — viral texture, local flavor, global vibe.</p>
      </footer>

      {/* Gallery Modal */}
      {galleryModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setGalleryModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl overflow-hidden max-w-lg"
          >
            <img src={`/assets/${galleryModal}`} alt="Cookie" className="w-full" />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
