import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

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

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    const fetchUserData = async () => {
      try {
        if (!tg || !tg.initData || !BACKEND_URL) {
          console.log('Demo mode active');
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
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center text-white">
        {/* Background video */}
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
          className="text-4xl font-extrabold"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          MEOWCHI | 쫀득쿠키
        </motion.h1>
        <p className="mt-4 text-lg max-w-lg">
          Вирусные маршмеллоу-куки из Ташкента. Chewy, marbled, bouncy.
        </p>
        <div className="flex gap-4 mt-8">
          <motion.button
            whileHover={{ scale: 1.1, rotate: -1 }}
            whileTap={{ scale: 0.95 }}
            className="bg-teal-400 text-black font-bold py-3 px-6 rounded-full"
            onClick={() => tg?.openTelegramLink("https://t.me/MeowchiOrders_Bot")}
          >
            Заказать сейчас
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 1 }}
            whileTap={{ scale: 0.95 }}
            className="border-2 border-pink-400 text-pink-400 font-bold py-3 px-6 rounded-full"
          >
            Стать амбассадором
          </motion.button>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute bottom-10 text-white"
        >
          <ChevronDown className="w-8 h-8" />
          <p className="text-sm">Scroll for Magic Number ↓</p>
        </motion.div>
      </section>

      {/* About Section */}
      <section className="min-h-screen bg-beige flex flex-col md:flex-row items-center justify-center p-8 gap-8">
        <img
          src="/assets/meowchi-jar.jpg"
          alt="Meowchi Cookies"
          className="rounded-lg shadow-lg w-full md:w-1/2 hover:scale-105 transition-transform"
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
      <section className="min-h-screen">
        {[
          { num: "3.14", text: "White Day & Pi Day — infinite desserts!", quote: "Desserts are like love... infinite and occasionally circular." },
          { num: "11", text: "Twin Paws, Double Snacks", quote: "Good things come in twos — like marshmallow cubes and wholesome moods." },
          { num: "42", text: "The Answer to Life (and Dessert)", quote: "Life’s big answer? Start with dessert." },
        ].map((item, i) => (
          <motion.div
            key={i}
            className={`h-screen flex flex-col items-center justify-center text-center p-8`}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h2
              className="text-6xl font-extrabold"
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
            <p className="mt-4 text-lg">{item.text}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
};

export default HomePage;
