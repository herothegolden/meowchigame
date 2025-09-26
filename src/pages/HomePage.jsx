import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="w-full bg-[#121212] text-white font-sans">
      {/* HERO */}
      <section className="min-h-screen flex flex-col md:flex-row items-center justify-center px-6 md:px-16 py-20 bg-gradient-to-b from-[#121212] to-[#1a1a1a]">
        <div className="flex-1 text-left space-y-6">
          <h1 className="text-5xl md:text-7xl font-extrabold uppercase tracking-tight">
            Чётко. Стильно. 쫀득.
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-lg">
            Это Meowchi — мраморные маршмеллоу-куки из Ташкента.
            Вкус, который тянется, текстура, которая попадает в ваши Stories.
            <span className="block mt-2 text-white">Your new viral obsession.</span>
          </p>
          <button className="mt-6 px-8 py-4 bg-teal-500 text-black rounded-full font-bold text-lg flex items-center hover:bg-teal-400 transition">
            Заказать сейчас <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 mt-10 md:mt-0 flex items-center justify-center">
          <div className="w-72 h-72 bg-white rounded-3xl" /> {/* Image placeholder */}
        </div>
      </section>

      {/* ABOUT */}
      <section className="px-6 md:px-16 py-20 bg-gradient-to-r from-pink-100 to-pink-200 text-black rounded-t-3xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-4">Почему Meowchi особенный?</h2>
            <p className="text-lg text-gray-800">
              Meowchi — больше, чем печенье. Это{" "}
              <span className="font-semibold">쫀득-текстура</span>, которая делает каждый укус{" "}
              <span className="italic">ASMR moment</span>.
              Мраморный рисунок, эстетика для Instagram, вкус, который объединяет друзей.
              Сделано в Ташкенте, вдохновлено Korean dessert culture, создано для того,
              чтобы стать global trend.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-80 h-80 bg-white rounded-3xl" /> {/* Image placeholder */}
          </div>
        </div>
      </section>

      {/* MAGIC NUMBER */}
      <section className="px-6 md:px-16 py-20 bg-gradient-to-r from-purple-200 to-pink-200 text-black">
        <h2 className="text-4xl font-bold text-center mb-12">Magic Number: 314 11 42</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { num: "3.14", text: "White Day & Pi Day — наш день." },
            { num: "11", text: "двойные лапки, double snacks, двойная радость." },
            { num: "42", text: "The Answer to Life… and dessert." },
          ].map((card, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="p-8 bg-white rounded-3xl shadow-lg text-center"
            >
              <div className="text-5xl font-extrabold mb-4">{card.num}</div>
              <p className="text-gray-700">{card.text}</p>
            </motion.div>
          ))}
        </div>
        <p className="text-center mt-8 text-gray-700">
          Нажми, расшарь, unlock the secret. Meowchi — это не только 쫀득쿠키, это целая вселенная.
        </p>
      </section>

      {/* AMBASSADOR */}
      <section className="px-6 md:px-16 py-20 bg-gradient-to-r from-amber-100 to-yellow-200 text-black">
        <h2 className="text-4xl font-bold mb-6">Ambassador Program</h2>
        <p className="text-lg mb-12">
          Meowchi двигается не инфлюенсерами, а обычными людьми. Your vibe, твои друзья, твой Meowchi.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "15% комиссия", desc: "с первой покупки" },
            { title: "Free starter pack", desc: "для твоего контента" },
            { title: "Referral link", desc: "уникальная ссылка для друзей" },
          ].map((card, i) => (
            <div key={i} className="p-8 bg-white rounded-3xl shadow-lg">
              <h3 className="font-bold text-xl mb-2">{card.title}</h3>
              <p className="text-gray-700">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="px-6 md:px-16 py-20 bg-gradient-to-r from-green-100 to-teal-200 text-black">
        <h2 className="text-4xl font-bold mb-12 text-center">Наши продукты</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: "Strawberry Oreo", desc: "розовое настроение, playful, вирусный фаворит." },
            { name: "Matcha Fig", desc: "earthy + aesthetic, для тех, кто ценит баланс." },
            { name: "Choco Mango", desc: "тропик vibes, шоколад + манго." },
          ].map((product, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="p-8 bg-white rounded-3xl shadow-lg flex flex-col items-center"
            >
              <div className="w-48 h-48 bg-gray-100 mb-4 rounded-2xl" /> {/* Image placeholder */}
              <h3 className="font-bold text-xl mb-2">{product.name}</h3>
              <p className="text-gray-700 text-center">{product.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ORDER */}
      <section className="px-6 md:px-16 py-20 bg-gradient-to-r from-gray-100 to-gray-200 text-black">
        <div className="max-w-2xl mx-auto p-10 bg-white rounded-3xl shadow-lg text-center">
          <h2 className="text-4xl font-bold mb-6">Как заказать?</h2>
          <ul className="space-y-3 text-lg text-gray-700 mb-6">
            <li>🚚 Доставка по Ташкенту: сегодня или завтра</li>
            <li>❄️ Хранение: 20 дней в холодильнике</li>
            <li>☎️ Телефон: 314 11 42</li>
          </ul>
          <button className="px-8 py-4 bg-teal-500 text-black rounded-full font-bold text-lg hover:bg-teal-400 transition">
            Order via Telegram
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-16 py-12 bg-[#0d0d0d] text-center text-gray-300">
        <div className="flex justify-center space-x-8 mb-6">
          <div className="w-10 h-10 bg-white rounded-full" /> {/* Icon placeholder */}
          <div className="w-10 h-10 bg-white rounded-full" />
          <div className="w-10 h-10 bg-white rounded-full" />
        </div>
        <p className="text-sm">
          Meowchi — viral texture, локальный вкус, глобальные vibes.
        </p>
      </footer>
    </div>
  );
}
