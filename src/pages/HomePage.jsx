import React from "react";

export default function HomePage() {
  return (
    <div className="min-h-screen w-full bg-black text-white font-sans">
      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-fuchsia-500/10 to-transparent blur-3xl rounded-full"></div>
        <h1 className="relative text-4xl md:text-6xl font-extrabold leading-tight z-10">
          Чётко. <br /> Стильно. <br /> 쫀득.
        </h1>
        <p className="relative mt-6 text-lg md:text-xl text-gray-300 z-10">
          Это Meowchi — мраморные маршмеллоу-куки из Ташкента.  
          Вкус, который тянется, текстура, которая попадает в ваши Stories. <br />
          <span className="text-white font-semibold">Your new viral obsession.</span>
        </p>
        <button className="relative mt-8 px-8 py-3 bg-emerald-500 text-black font-bold rounded-full shadow-lg hover:shadow-emerald-500/40 transition-all duration-300 z-10">
          Заказать сейчас →
        </button>
      </section>

      {/* ABOUT */}
      <section className="relative px-6 py-16">
        <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Почему Meowchi особенный?
          </h2>
          <p className="text-gray-300 leading-relaxed">
            Meowchi — больше, чем печенье. Это <b>쫀득-текстура</b>, которая делает каждый укус{" "}
            <i>ASMR moment</i>.  
            Мраморный рисунок, эстетика для Instagram, вкус, который объединяет друзей.  
            Сделано в Ташкенте, вдохновлено Korean dessert culture, создано для того, чтобы стать{" "}
            <b>global trend</b>.
          </p>
          <p className="mt-4 italic text-emerald-400">Chewy. Marble. Shareable.</p>
        </div>
      </section>

      {/* MAGIC NUMBER */}
      <section className="relative px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          Magic Number: 314 11 42
        </h2>
        <p className="text-center text-gray-400 mb-10">
          Нажми, расшарь, unlock the secret. Meowchi — это не только 쫀득쿠키, это целая вселенная.
        </p>
        <div className="space-y-6">
          {[
            { num: "3.14", desc: "White Day & Pi Day — наш день." },
            { num: "11", desc: "двойные лапки, double snacks, двойная радость." },
            { num: "42", desc: "The Answer to Life… and dessert." },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg p-6 text-center hover:shadow-emerald-500/30 transition-all"
            >
              <h3 className="text-4xl font-extrabold text-white drop-shadow-md mb-2">
                {item.num}
              </h3>
              <p className="text-gray-300">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="relative px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          Наши продукты
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              name: "Viral Strawberry & Oreo",
              desc: "розовое настроение, playful, вирусный фаворит.",
            },
            {
              name: "Matcha Strawberry & Oreo",
              desc: "earthy + strawberry twist, эстетика для тех, кто ценит баланс.",
            },
          ].map((p, i) => (
            <div
              key={i}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg p-6 flex flex-col items-center text-center hover:shadow-fuchsia-500/30 transition-all"
            >
              <div className="w-40 h-40 bg-white/10 rounded-xl mb-4"></div>
              <h3 className="text-lg font-bold text-white">{p.name}</h3>
              <p className="text-gray-300 text-sm mt-2">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ORDER */}
      <section className="relative px-6 py-16">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-6">Как заказать?</h2>
          <ul className="space-y-3 text-gray-300">
            <li>🚚 Доставка по Ташкенту: сегодня или завтра</li>
            <li>❄️ Хранение: 20 дней в холодильнике</li>
            <li>☎️ Телефон: 314 11 42</li>
          </ul>
          <button className="mt-8 px-8 py-3 bg-emerald-500 text-black font-bold rounded-full shadow-lg hover:shadow-emerald-500/40 transition-all duration-300">
            Order via Telegram
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative px-6 py-12 text-center text-gray-400 text-sm">
        Meowchi — viral texture, локальный вкус, глобальные vibes.
      </footer>
    </div>
  );
}
