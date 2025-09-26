import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const HomePage = () => {
  const [openCard, setOpenCard] = useState(null);

  const cards = [
    {
      num: "3.14",
      teaser: "День любви и бесконечной сладости.",
      full: (
        <>
          💮 <span className="font-semibold">White Day в Корее + Pi Day во всём мире.</span>
          <br />
          14 марта — официальный день рождения Meowchi.
          <br />
          На “Pi Party” всё круглое: пончики, макаруны, даже пицца с маршмеллоу.
          <br />
          Каждый год Meowchi выкладывает 3.14 из маршмеллоу на огромном торте.
          <br />
          <span className="text-emerald-300 italic">
            «Бесконечность на вкус как маршмеллоу.»
          </span>
        </>
      ),
    },
    {
      num: "11",
      teaser: "Двойные лапки, двойная радость.",
      full: (
        <>
          🐾 <span className="font-semibold">11 — магический код дружбы.</span>
          <br />
          Если съесть два печенья ровно в 11:11, желание сбудется!
          <br />
          Meowchi верит: счастье приходит парами — двойные снеки, двойные эмоции, двойные друзья.
          <br />
          <span className="text-emerald-300 italic">
            «Никогда не перекусывай в одиночку.»
          </span>
        </>
      ),
    },
    {
      num: "42",
      teaser: "Ответ на жизнь и десерт.",
      full: (
        <>
          📖 <span className="font-semibold">Книга 42</span> — легендарный сборник идеальных десертов Вселенной.
          <br />
          Каждый рецепт открывает маленькое приключение.
          <br />
          Фанаты придумывают свои формулы «42» — например, 42 капли шоколада + 42 секунды счастья.
          <br />
          <span className="text-emerald-300 italic">«Секрет жизни — в тянучести.»</span>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Spotlight Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-radial from-purple-900/40 via-black to-black"></div>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-12">
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
          <motion.button
            whileHover={{ scale: 1.05 }}
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
          {/* Image Placeholder */}
          <div className="w-full h-40 bg-white/10 rounded-lg mt-4 flex items-center justify-center">
            <span className="text-gray-400">[ Image Placeholder ]</span>
          </div>
        </motion.div>

        {/* Magic Number Section */}
        <div className="space-y-6">
          <h2 className="text-center text-2xl font-bold mb-4">
            Magic Number: 314 11 42
          </h2>
          {cards.map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02 }}
              onClick={() => setOpenCard(openCard === i ? null : i)}
              className="cursor-pointer p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg text-center"
            >
              <h3 className="text-3xl font-extrabold text-white drop-shadow-md mb-2">
                {item.num}
              </h3>
              <p className="text-gray-300">{item.teaser}</p>

              <AnimatePresence>
                {openCard === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-4 text-gray-300 leading-relaxed text-sm text-left"
                  >
                    {item.full}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Products Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center">Наши продукты</h2>
          <div className="grid grid-cols-1 gap-6">
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-pink-400/40 shadow-lg"
            >
              <div className="w-full h-40 bg-white/10 rounded-lg mb-4"></div>
              <h3 className="text-xl font-semibold">Viral Strawberry & Oreo</h3>
              <p className="text-gray-300 text-sm">
                розовое настроение, playful, вирусный фаворит.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-emerald-400/40 shadow-lg"
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
          <p>🚚 Доставка по Ташкенту: сегодня или завтра</p>
          <p>❄️ Хранение: 20 дней в холодильнике</p>
          <p>☎️ Телефон: 314 11 42</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="px-6 py-3 rounded-full font-semibold text-black bg-gradient-to-r from-emerald-400 to-teal-300 shadow-lg hover:shadow-emerald-500/50"
          >
            Order via Telegram
          </motion.button>
        </motion.div>

        <p className="text-center text-gray-400 text-sm pt-6">
          Meowchi — viral texture, локальный вкус, глобальные vibes.
        </p>
      </div>
    </div>
  );
};

export default HomePage;
