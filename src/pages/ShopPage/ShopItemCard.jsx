// src/pages/ShopPage/ShopItemCard.jsx
// v3.1 — Russian Text Polished Layout (No logic or layout changes)

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
    <div className="bg-nav p-4 rounded-lg flex items-center justify-between border border-gray-700">
      {/* Left: icon, name, description */}
      <div className="flex items-start space-x-3">
        <div className="text-accent">{icon}</div>
        <div className="text-left space-y-1">
          {/* 🛍 Meowchi Shop localized & rearranged for clarity */}
          {item.name.includes("Time") && (
            <>
              <p className="font-bold text-primary text-base">⏰ Тайм-Бусти</p>
              <p className="text-sm text-secondary">
                Когда время — просто ингредиент в рецепте счастья.
              </p>
              <div className="mt-2 text-secondary text-sm leading-snug">
                <p className="mb-1">🕒 +10 секунд наслаждения</p>
                <p>
                  Ещё немного, чтобы услышать это идеальное “чпоньк!” —
                  момент чистых 쫀득-вибов.
                </p>
              </div>
            </>
          )}

          {item.name.includes("Bomb") && (
            <>
              <p className="font-bold text-primary text-base">💣 쿠키-Бомбы</p>
              <p className="text-sm text-secondary">
                Иногда жизнь — это просто сладкий взрыв ожиданий.
              </p>
              <div className="mt-2 text-secondary text-sm leading-snug">
                <p className="mb-1">💥 Cookie Bomb</p>
                <p>
                  Бум! Очищает 3×3 поле и оставляет после себя
                  вкусный хаос.
                </p>
              </div>
            </>
          )}

          {item.name.includes("Points") && (
            <>
              <p className="font-bold text-primary text-base">
                ✨ Множители Очков
              </p>
              <p className="text-sm text-secondary">
                Для тех, кто играет не ради победы, а ради вайба.
              </p>
              <div className="mt-2 text-secondary text-sm leading-snug">
                <p className="mb-1">⬆️ Двойные Очки</p>
                <p>
                  2× очков. 2× текстуры. 쫀득-вибы на пределе допустимого
                  счастья.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: owned + button */}
      <div className="flex flex-col items-center justify-center min-w-[7rem] text-right">
        {item.type === "consumable" && (
          <p className="text-amber-400 font-bold text-xl mb-2">
            У тебя: {ownedQuantity}
          </p>
        )}

        {isOwned && item.type === "permanent" ? (
          <div className="flex items-center text-green-400 font-bold py-2 px-4">
            <CheckCircle className="w-5 h-5 mr-2" />
            Куплено
          </div>
        ) : (
          <button
            onClick={() => onPurchase(item.id)}
            disabled={!canAfford || isPurchasing}
            className={`font-bold py-2 px-4 rounded-lg flex items-center justify-center w-28 ${
              canAfford
                ? "bg-accent text-background"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
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
