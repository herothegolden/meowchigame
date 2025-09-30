import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Global Pulse Component
const GlobalPulse = () => {
  const [justSold, setJustSold] = useState('Viral Classic');
  const [totalEaten, setTotalEaten] = useState(0);
  const [activePlayers, setActivePlayers] = useState(37);
  const [newPlayers, setNewPlayers] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);

  // Check if within active hours (10AM - 10PM)
  const isWithinActiveHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 22;
  };

  // Initialize daily counters from localStorage or reset if new day
  useEffect(() => {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('pulseDate');
    
    if (storedDate !== today) {
      // New day - reset counters
      localStorage.setItem('pulseDate', today);
      localStorage.setItem('totalEaten', '0');
      localStorage.setItem('newPlayers', '0');
      setTotalEaten(0);
      setNewPlayers(0);
    } else {
      // Same day - restore from localStorage
      setTotalEaten(parseInt(localStorage.getItem('totalEaten') || '0', 10));
      setNewPlayers(parseInt(localStorage.getItem('newPlayers') || '0', 10));
    }

    // Check for midnight reset every minute
    const midnightCheck = setInterval(() => {
      const currentDate = new Date().toDateString();
      if (currentDate !== localStorage.getItem('pulseDate')) {
        localStorage.setItem('pulseDate', currentDate);
        localStorage.setItem('totalEaten', '0');
        localStorage.setItem('newPlayers', '0');
        setTotalEaten(0);
        setNewPlayers(0);
      }
    }, 60000); // Check every minute

    return () => clearInterval(midnightCheck);
  }, []);

  // Just Sold logic - ~400 swaps per day during active hours
  useEffect(() => {
    let timeoutId;
    
    const scheduleNextSwap = () => {
      if (!isWithinActiveHours()) {
        // If outside active hours, check again in 5 minutes
        timeoutId = setTimeout(scheduleNextSwap, 5 * 60 * 1000);
        return;
      }
      
      // Random interval between 1-20 minutes, weighted toward shorter intervals
      // Weights: 30% (1min), 25% (3min), 20% (5min), 15% (10min), 10% (20min)
      const random = Math.random() * 100;
      let interval;
      
      if (random < 30) interval = 60; // 1 minute
      else if (random < 55) interval = 180; // 3 minutes
      else if (random < 75) interval = 300; // 5 minutes
      else if (random < 90) interval = 600; // 10 minutes
      else interval = 1200; // 20 minutes
      
      timeoutId = setTimeout(() => {
        // Swap product
        setJustSold(prev => prev === 'Viral Matcha' ? 'Viral Classic' : 'Viral Matcha');
        
        // Increment total eaten
        setTotalEaten(prev => {
          const newTotal = prev + 1;
          localStorage.setItem('totalEaten', newTotal.toString());
          setPulseKey(k => k + 1); // Trigger pulse animation
          return newTotal;
        });
        
        // Schedule next swap
        scheduleNextSwap();
      }, interval * 1000);
    };
    
    scheduleNextSwap();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Active Players logic - random changes during active hours
  useEffect(() => {
    let timeoutId;
    
    const scheduleNextUpdate = () => {
      if (!isWithinActiveHours()) {
        // If outside active hours, check again in 5 minutes
        timeoutId = setTimeout(scheduleNextUpdate, 5 * 60 * 1000);
        return;
      }
      
      // Random interval between 2-8 minutes
      const interval = (2 + Math.random() * 6) * 60 * 1000;
      
      timeoutId = setTimeout(() => {
        // Random change between -5 and +10
        setActivePlayers(prev => {
          const change = Math.floor(Math.random() * 16) - 5;
          const newValue = prev + change;
          setPulseKey(k => k + 1); // Trigger pulse animation
          // Keep between 37 and 150
          return Math.max(37, Math.min(150, newValue));
        });
        
        scheduleNextUpdate();
      }, interval);
    };
    
    scheduleNextUpdate();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // New Players logic - slow random increases throughout the day
  useEffect(() => {
    let timeoutId;
    
    const scheduleNextUpdate = () => {
      // Random interval between 5-30 minutes
      const interval = (5 + Math.random() * 25) * 60 * 1000;
      
      timeoutId = setTimeout(() => {
        const today = new Date().toDateString();
        const storedDate = localStorage.getItem('pulseDate');
        
        if (storedDate === today) {
          setNewPlayers(prev => {
            if (prev >= 90) return prev; // Max reached
            
            const newValue = prev + 1;
            localStorage.setItem('newPlayers', newValue.toString());
            setPulseKey(k => k + 1); // Trigger pulse animation
            return newValue;
          });
        }
        
        scheduleNextUpdate();
      }, interval);
    };
    
    scheduleNextUpdate();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center space-y-3 py-6"
    >
      <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent mb-4">
        🌍 Global Pulse
      </h2>
      
      <div className="space-y-2 text-gray-300">
        {/* Just Sold */}
        <div className="text-base">
          🛒 Just Sold: {' '}
          <motion.span
            key={justSold}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.4 }}
            className="font-semibold text-emerald-300"
          >
            {justSold}
          </motion.span>
        </div>
        
        {/* Total Eaten */}
        <div className="text-base">
          🍪 {' '}
          <motion.span
            key={`eaten-${totalEaten}`}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.4 }}
            className="font-semibold text-emerald-300"
          >
            {totalEaten}
          </motion.span>
          {' '} Meowchis eaten today
        </div>
        
        {/* Active Players */}
        <div className="text-base">
          👥 {' '}
          <motion.span
            key={`active-${activePlayers}-${pulseKey}`}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.4 }}
            className="font-semibold text-emerald-300"
          >
            {activePlayers}
          </motion.span>
          {' '} active players right now
        </div>
        
        {/* New Players */}
        <div className="text-base">
          🎉 {' '}
          <motion.span
            key={`new-${newPlayers}`}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.4 }}
            className="font-semibold text-emerald-300"
          >
            {newPlayers}
          </motion.span>
          {' '} new players joined today
        </div>
      </div>
    </motion.div>
  );
};

const HomePage = () => {
  const [openCard, setOpenCard] = useState(null);

  const cards = [
    {
      num: "3.14",
      teaser: "День любви и бесконечной сладости.",
      title: "День любви и бесконечной сладости",
      content: `🍰 White Day в Корее + Pi Day во всём мире. 
14 марта — официальный день рождения Meowchi. 
На "Pi Party" всё круглое: пончики, макаруны, даже пицца с маршмеллоу. 
Каждый год Meowchi выкладывает 3.14 из маршмеллоу на огромном торте.`,
      tagline: "«Бесконечность на вкус как маршмеллоу.»",
    },
    {
      num: "11",
      teaser: "Двойные лапки, двойная радость.",
      title: "Двойные лапки, двойная радость",
      content: `🐾 11 — магический код дружбы. 
Если съесть два печенья ровно в 11:11, желание сбудется! 
Meowchi верит: счастье приходит парами — двойные снеки, двойные эмоции, двойные друзья.`,
      tagline: "«Никогда не перекусывай в одиночку.»",
    },
    {
      num: "42",
      teaser: "Ответ на жизнь и десерт.",
      title: "Ответ на жизнь и десерт",
      content: `📖 Книга 42 — легендарный сборник идеальных десертов Вселенной. 
Каждый рецепт открывает маленькое приключение. 
Фанаты придумывают свои формулы «42» — например, 42 капли шоколада + 42 секунды счастья.`,
      tagline: "«Секрет жизни — в тянучести.»",
    },
  ];

  // helper function to open telegram bot
  const openTelegramOrder = () => {
    window.open("https://t.me/MeowchiOrders_Bot", "_blank");
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans relative flex flex-col">
      {/* Spotlight Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-radial from-purple-900/40 via-black to-black"></div>

      <div className="flex-grow max-w-2xl mx-auto px-6 py-12 space-y-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg leading-tight">
            Чётко. <br />
            Стильно. <br />
            쫀득.
          </h1>
          <p className="text-lg text-gray-300 leading-relaxed">
            Это Meowchi — мраморные маршмеллоу-куки из Ташкента. <br />
            Вкус, который тянется, текстура, которая попадает в ваши Stories.
          </p>
          <p className="text-white font-semibold text-lg">
            Your new viral obsession.
          </p>

          {/* Hero Image */}
          <div className="w-full flex justify-center my-4">
            <img
              src="https://ik.imagekit.io/59r2kpz8r/Meowchi/1.webp?updatedAt=1758888700434"
              alt="Meowchi Hero"
              className="w-64 h-64 object-cover rounded-2xl shadow-[0_0_20px_rgba(0,255,200,0.4)] border border-white/10"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={openTelegramOrder}
            className="px-6 py-3 rounded-full font-semibold text-black bg-gradient-to-r from-emerald-400 to-teal-300 shadow-lg hover:shadow-emerald-500/50"
          >
            Заказать сейчас →
          </motion.button>
        </motion.div>

        {/* Why Meowchi */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl"
        >
          <h2 className="text-2xl font-bold mb-3">
            Почему Meowchi особенный?
          </h2>
          <p className="text-gray-300 leading-relaxed mb-3">
            Meowchi — больше, чем печенье. Это{" "}
            <span className="font-semibold text-white">쫀득-текстура</span>,
            которая делает каждый укус{" "}
            <span className="italic">ASMR moment</span>. Мраморный рисунок,
            эстетика для Instagram, вкус, который объединяет друзей. Сделано в
            Ташкенте, вдохновлено Korean dessert culture, создано для того,
            чтобы стать <span className="font-semibold">global trend</span>.
          </p>
          <p className="mt-3 text-emerald-300 italic font-medium">
            Chewy. Marble. Shareable.
          </p>
          <div className="w-full flex justify-center mt-4">
            <img
              src="https://ik.imagekit.io/59r2kpz8r/Meowchi/2.webp?updatedAt=1758888699837"
              alt="About Meowchi"
              className="w-full max-w-md h-auto rounded-2xl shadow-[0_0_20px_rgba(0,255,200,0.4)] border border-white/10"
            />
          </div>
        </motion.div>

        {/* Global Pulse - REPLACES Magic Number Header */}
        <GlobalPulse />

        {/* Magic Number Cards - KEPT BELOW Global Pulse */}
        <div className="space-y-8">
          <h3 className="text-center text-3xl font-extrabold mb-6 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg tracking-[0.2em]">
            314 11 42
          </h3>
          {cards.map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02 }}
              onClick={() => setOpenCard(openCard === i ? null : i)}
              className="cursor-pointer p-8 rounded-3xl bg-gradient-to-b from-black/60 to-black/80 backdrop-blur-lg border border-emerald-400/10 shadow-[0_0_20px_rgba(0,255,200,0.4)] text-center space-y-3 transition-all"
            >
              <h3 className="text-5xl font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,255,200,0.6)]">
                {item.num}
              </h3>
              {openCard === i ? (
                <>
                  <h4 className="text-xl text-emerald-200">{item.title}</h4>
                  <p className="text-gray-300 text-base leading-relaxed whitespace-pre-line">
                    {item.content}
                  </p>
                  <p className="italic text-emerald-300 text-sm border-t border-emerald-400/20 pt-2">
                    {item.tagline}
                  </p>
                </>
              ) : (
                <p className="text-gray-400">{item.teaser}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Products Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center">Наши продукты</h2>
          <div className="grid grid-cols-1 gap-6">
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-pink-400/40 shadow-[0_0_20px_rgba(255,0,150,0.3)]"
            >
              <img
                src="https://ik.imagekit.io/59r2kpz8r/Meowchi/3.webp?updatedAt=1758892681518"
                alt="Viral Strawberry & Oreo"
                className="w-full h-40 object-cover rounded-lg shadow-[0_0_20px_rgba(255,0,150,0.3)] border border-white/10 mb-4"
              />
              <h3 className="text-xl font-semibold">Viral Strawberry & Oreo</h3>
              <p className="text-gray-300 text-sm">
                розовое настроение, playful, вирусный фаворит.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-emerald-400/40 shadow-[0_0_20px_rgba(0,255,200,0.3)]"
            >
              <div className="w-full h-40 bg-white/10 rounded-lg mb-4"></div>
              <h3 className="text-xl font-semibold">
                Matcha Strawberry & Oreo
              </h3>
              <p className="text-gray-300 text-sm">
                earthy + strawberry twist, эстетика для тех, кто ценит баланс.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Order Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl text-center space-y-4"
        >
          <h2 className="text-xl font-bold">Как заказать?</h2>
          <p>🚚 Доставка по Ташкенту (Yandex Taxi)</p>
          <p>❄️ Хранение: 30 дней в холодильнике</p>
          <p>
            ☎️ Телефон:{" "}
            
              href="tel:+998913141142"
              className="text-emerald-300 hover:underline"
            >
              +998 91 314 11 42
            </a>
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={openTelegramOrder}
            className="px-6 py-3 rounded-full font-semibold text-black bg-gradient-to-r from-emerald-400 to-teal-300 shadow-lg hover:shadow-emerald-500/50"
          >
            Order via Telegram
          </motion.button>
        </motion.div>
      </div>

      {/* Footer Section with inline SVGs */}
      <footer className="border-t border-white/10 py-6 mt-8">
        <div className="flex justify-center space-x-6 text-2xl">
          {/* Telegram */}
          
            href="https://t.me/meowchi_lab"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-300 hover:text-emerald-400 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-7 h-7"
            >
              <path d="M9.999 15.5 9.5 20a.5.5 0 0 0 .8.4l3.2-2.4 3.8 2.9c.5.4 1.2.1 1.3-.5L21 4.6c.1-.7-.6-1.2-1.2-.9L2.7 11.4c-.7.3-.7 1.3.1 1.5l5.1 1.5 10.6-6.6-8.5 8.7Z" />
            </svg>
          </a>

          {/* Instagram */}
          
            href="https://www.instagram.com/meowchi.lab/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-500 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-7 h-7"
            >
              <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm4.5 3a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" />
            </svg>
          </a>
        </div>
        <p className="text-center text-gray-500 text-sm mt-3">
          © {new Date().getFullYear()} Meowchi. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default HomePage;
