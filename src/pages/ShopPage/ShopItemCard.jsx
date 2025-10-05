// src/pages/ShopPage/ShopItemCard.jsx
// v4 — Unified Layout with Inter Font (No Logic Change, Russian Text)

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

  return (
    <div
      className="bg-nav p-4 rounded-lg border border-gray-700 flex flex-col justify-between text-white font-inter"
      style={{
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Top Icon + Header */}
      <div className="flex items-start space-x-3 mb-2">
        <div className="text-accent">{icon}</div>
        <div className="flex flex-col text-left space-y-1">
          {/* Header + Text Layout */}
          {item.name.includes("Time") && (
            <>
              <p className="font-semibold text-base flex items-center">
                ⏰ Тайм-Бусти
              </p>
              <p className="text-sm font-medium uppercase tracking-wide">
                КОГДА ВРЕМЯ — ПРОСТО ИНГРЕДИЕНТ В РЕЦЕПТЕ СЧАСТЬЯ.
              </p>
              <div className="text-sm font-medium leading-snug mt-2 space-y-1">
                <p>🕒 +10 СЕКУНД НАСЛАЖДЕНИЯ</p>
                <p>
                  ЕЩЁ НЕМНОГО, ЧТОБЫ УСЛЫШАТЬ ЭТО ИДЕАЛЬНОЕ “ЧПОНЬК!” — МОМЕНТ
                  ЧИСТЫХ 쫀득-ВИБОВ.
                </p>
              </div>
            </>
          )}

          {item.name.includes("Bomb") && (
            <>
              <p className="font-semibold text-base flex items-center">
                💣 쿠키-Бомбы
              </p>
              <p className="text-sm font-medium uppercase tracking-wide">
                ИНОГДА ЖИЗНЬ — ЭТО ПРОСТО СЛАДКИЙ ВЗРЫВ ОЖИДАНИЙ.
              </p>
              <div className="text-sm font-medium leading-snug mt-2 space-y-1">
                <p>💥 COOKIE BOMB</p>
                <p>
                  БУМ! ОЧИЩАЕТ 3×3 ПОЛЕ И ОСТАВЛЯЕТ ПОСЛЕ СЕБЯ ВКУСНЫЙ ХАОС.  
                  쫀득-ВИБЫ ГАРАНТИРОВАНЫ.
                </p>
              </div>
            </>
          )}

          {item.name.includes("Points") && (
            <>
              <p className="font-semibold text-base flex items-center">
                ✨ Множители Очков
              </p>
              <p className="text-sm font-medium uppercase tracking-wide">
                ДЛЯ ТЕХ, КТО ИГРАЕТ НЕ РАДИ ПОБЕДЫ, А РАДИ ВАЙБА.
              </p>
              <div className="text-sm font-medium leading-snug mt-2 space-y-1">
                <p>⬆️ ДВОЙНЫЕ ОЧКИ</p>
                <p>
                  2× ОЧКОВ. 2× ТЕКСТУРЫ. 쫀득-ВИБЫ НА ПРЕДЕЛЕ ДОПУСТИМОГО
                  СЧАСТЬЯ.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Row: Owned + Price Button */}
      <div className="flex items-center justify-between mt-4">
        {/* Owned count */}
        {item.type === "consumable" && (
          <p className="text-amber-400 font-bold text-lg">
            У тебя: {ownedQuantity}
          </p>
        )}

        {/* Owned (permanent) or Buy button */}
        {isOwned && item.type === "permanent" ? (
          <div className="flex items-center text-green-400 font-semibold py-2 px-4">
            <CheckCircle className="w-5 h-5 mr-2" />
            Куплено
          </div>
        ) : (
          <button
            onClick={() => onPurchase(item.id)}
            disabled={!canAfford || isPurchasing}
            className={`font-semibold py-2 px-4 rounded-md flex items-center justify-center ${
              canAfford
                ? "bg-yellow-400 text-black"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
            style={{
              fontFamily:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
            }}
          >
            {isPurchasing ? (
              <LoaderCircle className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Star className="w-4 h-4 mr-2" />
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
