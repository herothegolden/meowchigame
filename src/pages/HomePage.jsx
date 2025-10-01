import React, { useState } from "react";
import { motion } from "framer-motion";
import GlobalPulse from "../components/GlobalPulse";

const HomePage = () => {
  const [openCard, setOpenCard] = useState(null);

  const cards = [
    {
      num: "3.14",
      teaser: "👉 3.14 — White Day / Pi Day\n👉 💖 Girls get 42% OFF",
      content: `🍰 3.14 = White Day, Pi Day и День Маршмеллоу
Наблюдается 14 марта — ровно через месяц после Дня Святого Валентина и через 6 дней после 8 марта.
Традиция: девушки дарят подарки мужчинам, которые раньше угощали их шоколадом или цветами.
💖 Бонус Meowchi: Все девушки получают скидку 42%.`,
    },
    {
      num: "11",
      teaser: "👉 11 — Singles Day & Double Joy\n👉 🎉 11% if single / 22% with a friend",
      content: `🐾 11 = Двойные лапки, двойная радость
В Азии 11/11 — День холостяка: друзья собираются вместе, чтобы праздновать свободу и угощаться вкусняшками.
Потому что вдвоём всегда вкуснее.
🎉 Бонус Meowchi:
Если ты один — скидка 11%.
Купи ещё для друга → скидка 22%.`,
    },
    {
      num: "42",
      teaser: "👉 42 — The Ultimate Answer Pack\n👉 🍪 Buy 42 → Free Gift Box + Boosters",
      content: `📖 42 = Ответ на жизнь, вселенную и десерт
Вдохновлено книгой Дугласа Адамса «Автостопом по галактике».
Для Meowchi 42 — это «формула идеального десерта».
🍪 Легендарный бонус:
Купи 42 печенья Meowchi → получи:
🎁 Подарочную коробку Meowchi
⚡ x2 Time Boosters
💣 x2 Cookie Bombs
✨ x2 Double Points
🌌 Доступно только 42 игрокам в месяц.`,
    },
    {
      num: "🔒",
      teaser: "👉 🔒 Mystery Locked Card\n👉 👀 Unlock at Level 11 or $49",
      content: `🔒 The Secret Scroll
Некоторые тайны нельзя подарить — их нужно заслужить.
Открой на уровне 11 или купи за $49.
📜 Внутри:
«Секретная книга рецептов Meowchi» (эксклюзивная загрузка)
⚡ x3 Time Boosters
💣 x3 Cookie Bombs
✨ x3 Double Points
👀 Откроется только самым любопытным.`,
    },
  ];

  const openTelegramOrder = () => {
    window.open("https://t.me/MeowchiOrders_Bot", "_blank");
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans relative flex flex-col">
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

        {/* Why Meowchi Section */}
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

        {/* Global Pulse + Cards */}
        <div className="space-y-8">
          <GlobalPulse />

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
                <p className="text-gray-300 text-base leading-relaxed whitespace-pre-line">
                  {item.content}
                </p>
              ) : (
                <p className="text-gray-400 whitespace-pre-line">{item.teaser}</p>
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

      {/* Footer Section */}
      <footer className="border-t border-white/10 py-6 mt-8">
        <div className="flex justify-center space-x-6 text-2xl">
          
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
