import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Instagram, Phone, Send } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const MOCK_USER_DATA = {
  id: 1,
  telegram_id: 123456789,
  first_name: 'Demo User',
  username: 'demouser',
};

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [isConnected, setIsConnected] = useState(false);
  const [galleryModal, setGalleryModal] = useState(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    const fetchUserData = async () => {
      try {
        if (!tg || !tg.initData || !BACKEND_URL) {
          setConnectionStatus('Demo mode - using mock data');
          setUser(MOCK_USER_DATA);
          setIsConnected(false);
          setLoading(false);
          return;
        }

        tg.ready();
        setConnectionStatus('Fetching user data...');

        const res = await fetch(`${BACKEND_URL}/api/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        });

        const userData = await res.json();
        setUser(userData);
        setConnectionStatus('Connected to server');
        setIsConnected(true);

      } catch (err) {
        console.error('Error fetching user data:', err);
        setUser(MOCK_USER_DATA);
        setConnectionStatus('Error: Demo mode active');
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-secondary">{connectionStatus}</p>
      </div>
    );
  }

  const tg = window.Telegram?.WebApp;

  return (
    <div className="w-full font-inter text-gray-800">
      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center text-white">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover -z-10"
        >
          <source src="/assets/marshmallow-stretch.mp4" type="video/mp4" />
        </video>
        <div className="bg-black/40 absolute top-0 left-0 w-full h-full -z-10"></div>

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
          <motion.button
            whileHover={{ scale: 1.05, rotate: -1 }}
            whileTap={{ scale: 0.95 }}
            className="bg-teal-400 text-black font-bold py-3 px-6 rounded-full shadow-lg"
            onClick={() => tg?.openTelegramLink("https://t.me/MeowchiOrders_Bot")}
          >
            Заказать сейчас
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, rotate: 1 }}
            whileTap={{ scale: 0.95 }}
            className="border-2 border-pink-400 text-pink-400 font-bold py-3 px-6 rounded-full shadow-lg"
          >
            Стать амбассадором
          </motion.button>
        </div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute bottom-10 text-white"
        >
          <ChevronDown className="w-8 h-8 mx-auto" />
          <p className="text-sm">Scroll for Magic Number ↓</p>
        </motion.div>
      </section>

      {/* About Section */}
      <section className="min-h-screen bg-gradient-to-r from-amber-50 to-pink-50 flex flex-col md:flex-row items-center justify-center p-12 gap-8">
        <img
          src="/assets/meowchi-jar.jpg"
          alt="Meowchi Cookies"
          className="rounded-lg shadow-xl w-full md:w-1/2 hover:scale-105 transition-transform"
        />
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

      {/* Magic Number Section */}
      <section>
        {[
          { num: "3.14", color: "from-teal-100 to-pink-100", text: "White Day & Pi Day", quote: "Desserts are like love... infinite and occasionally circular." },
          { num: "11", color: "from-pink-100 to-purple-100", text: "Twin Paws, Double Snacks", quote: "Good things come in twos — like marshmallow cubes and wholesome moods." },
          { num: "42", color: "from-purple-100 to-indigo-100", text: "The Answer to Life (and Dessert)", quote: "Life’s big answer? Start with dessert." },
        ].map((item, i) => (
          <motion.div
            key={i}
            className={`h-screen flex flex-col items-center justify-center text-center bg-gradient-to-r ${item.color} p-8`}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h2
              className="text-7xl font-extrabold cursor-pointer"
              initial={{ scale: 0.8 }}
              whileInView={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              onClick={() => tg?.showPopup({
                title: item.num,
                message: item.quote,
                buttons: [{ text: "OK", type: "ok" }]
              })}
            >
              {item.num}
            </motion.h2>
            <p className="mt-4 text-xl">{item.text}</p>
          </motion.div>
        ))}
      </section>

      {/* Ambassador Section */}
      <section className="min-h-screen bg-gradient-to-r from-pink-50 to-amber-50 p-12 text-center">
        <h2 className="text-3xl font-bold mb-10">Амбассадорская программа</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: "💸", title: "Комиссия", desc: "15% с первой покупки" },
            { icon: "🎁", title: "Стартовый набор", desc: "Бесплатный набор для старта" },
            { icon: "🔗", title: "Ссылка", desc: "Уникальная ссылка для друзей" },
          ].map((card, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05, rotate: 1 }}
              className="bg-white rounded-lg shadow-lg p-6 space-y-2"
            >
              <div className="text-4xl">{card.icon}</div>
              <h3 className="text-xl font-bold">{card.title}</h3>
              <p>{card.desc}</p>
            </motion.div>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          className="mt-8 bg-pink-400 text-white font-bold py-3 px-8 rounded-full shadow-lg"
        >
          Присоединиться
        </motion.button>
      </section>

      {/* Product Gallery */}
      <section className="min-h-screen bg-gradient-to-r from-teal-50 to-pink-50 p-12">
        <h2 className="text-3xl font-bold text-center mb-10">Галерея вкусов</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {["strawberry.jpg", "matcha.jpg", "choco.jpg"].map((img, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="relative rounded-lg overflow-hidden shadow-lg cursor-pointer"
              onClick={() => setGalleryModal(img)}
            >
              <img src={`/assets/${img}`} alt="Cookie" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                <p className="text-white text-lg">쫀득 moment 🍓</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Order Now */}
      <section className="bg-teal-400 text-center py-20 text-white">
        <h2 className="text-3xl font-bold mb-6">Готов заказать?</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          className="bg-white text-teal-500 font-bold py-4 px-10 rounded-full shadow-lg text-xl"
          onClick={() => tg?.openTelegramLink("https://t.me/MeowchiOrders_Bot")}
        >
          Заказать через Telegram →
        </motion.button>
        <div className="flex justify-center gap-6 mt-6 text-lg">
          <span>🚚 Доставка по Ташкенту</span>
          <span>❄️ 20 дней в холодильнике</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-12 text-center space-y-4">
        <div className="flex justify-center gap-6">
          <a href="https://instagram.com/meowchi.lab"><Instagram className="w-6 h-6 hover:scale-110" /></a>
          <a href="https://t.me/MeowchiOrders_Bot"><Send className="w-6 h-6 hover:scale-110" /></a>
          <a href="tel:+998913141142"><Phone className="w-6 h-6 hover:scale-110" /></a>
        </div>
        <p className="text-lg font-semibold">314 11 42</p>
        <p className="text-sm opacity-80">Meowchi — viral texture, local flavor, global vibe.</p>
      </footer>

      {/* Modal */}
      {galleryModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setGalleryModal(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl overflow-hidden max-w-lg"
          >
            <img src={`/assets/${galleryModal}`} alt="Cookie" className="w-full" />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
