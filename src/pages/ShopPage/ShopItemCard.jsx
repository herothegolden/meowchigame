// src/pages/ShopPage/ShopItemCard.jsx
// v4 — Pastel Gradient Design + Russian Text, No Function Change

import React from "react";
import { Star, LoaderCircle, CheckCircle } from "lucide-react";

const ShopItemCard = ({
  item,
  userPoints,
  onPurchase,
  isOwned,
  ownedQuantity = 0,
  isPurchasing,
  icon,
}) => {
  const canAfford = userPoints >= item.price;

  // determine pastel gradient by category
  const getGradient = () => {
    if (item.name.includes("Time")) return "from-[#C6FFE0] to-[#B2F5EA]"; // Mint
    if (item.name.includes("Bomb")) return "from-[#FFD6E8] to-[#FFC6C6]"; // Rose
    if (item.name.includes("Points")) return "from-[#E4D7FF] to-[#DAD0FF]"; // Lilac
    return "from-[#F8F8F8] to-[#EAEAEA]";
  };

  return (
    <div
      className={`bg-gradient-to-r ${getGradient()} text-gray-900 rounded-2xl p-4 mb-3 flex flex-col justify-between shadow-sm`}
    >
      {/* HEADER / TITLE */}
      <div className="mb-2">
        {item.name.includes("Time") && (
          <>
            <p className="text-[18px] font-semibold mb-0.5">⏰ Тайм-Бусти</p>
            <p className="text-[13px] text-[#9AA0A6] mb-1">(Time Boosters)</p>
            <p className="text-[15px] font-medium">쫀득 Vibe Upgrade ⏳</p>
            <p className="text-[15px]">
              +10 секунд наслаждения<br />
              Ещё немного, чтобы поймать тот идеальный момент чпоньк!<br />
              Время = вкус, не цифра.
            </p>
          </>
        )}

        {item.name.includes("Bomb") && (
          <>
            <p className="text-[18px] font-semibold mb-0.5">💣 쿠키-Бомбы</p>
            <p className="text-[13px] text-[#9AA0A6] mb-1">(Cookie Bombs)</p>
            <p className="text-[15px] font-medium">Cookie Bomb 💥</p>
            <p className="text-[15px]">
              Начни с мягким взрывом — очисти 3×3 поле и оставь за собой сладкий хаос.<br />
              쫀득-вибы гарантированы.
            </p>
          </>
        )}

        {item.name.includes("Points") && (
          <>
            <p className="text-[18px] font-semibold mb-0.5">✨ Множители Очков</p>
            <p className="text-[13px] text-[#9AA0A6] mb-1">(Point Multipliers)</p>
            <p className="text-[15px] font-medium">Двойные Очки ⬆️</p>
            <p className="text-[15px]">
              2× очков. 2× текстуры. 쫀득-вибы на пределе допустимого счастья.<br />
              Игра ради вайба, а не ради победы.
            </p>
          </>
        )}
      </div>

      {/* FOOTER BAR */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-[14px] font-bold">
          У тебя: {ownedQuantity.toLocaleString()}
        </div>

        {isOwned && item.type === "permanent" ? (
          <div className="flex items-center text-green-600 font-bold">
            <CheckCircle className="w-4 h-4 mr-1" />
            Куплено
          </div>
        ) : (
          <button
            onClick={() => onPurchase(item.id)}
            disabled={!canAfford || isPurchasing}
            className={`font-bold text-[14px] rounded-full py-1 px-4 flex items-center justify-center ${
              canAfford
                ? "bg-yellow-400 text-black"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isPurchasing ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Star className="w-4 h-4 mr-1" />
                {item.price.toLocaleString()}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ShopItemCard;
