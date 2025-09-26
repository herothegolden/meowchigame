import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaTelegramPlane, FaInstagram } from "react-icons/fa";

const HomePage = () => {
  const [openCard, setOpenCard] = useState(null);

  const cards = [
    {
      num: "3.14",
      teaser: "День любви и бесконечной сладости.",
      title: "День любви и бесконечной сладости",
      content: `🍰 White Day в Корее + Pi Day во всём мире. 
14 марта — официальный день рождения Meowchi. 
На “Pi Party” всё круглое: пончики, макаруны, даже пицца с маршмеллоу. 
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

        {/* Magic Number Section */}
        <div className="space-y-8">
          <h2 className="text-center text-2xl font-extrabold mb-2 tracking-widest text-gray-200">
            MAGIC NUMBER:
          </h2>
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
            <a
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

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 mt-12">
        <div className="flex justify-center space-x-6">
          <a
            href="https://t.me/meowchi_lab"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-emerald-300 transition"
          >
            <FaTelegramPlane size={28} />
          </a>
          <a
            href="https://www.instagram.com/meowchi.lab/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-pink-400 transition"
          >
            <FaInstagram size={28} />
          </a>
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">
          Meowchi — viral texture, локальный вкус, глобальные vibes.
        </p>
      </footer>
    </div>
  );
};

export default HomePage;
