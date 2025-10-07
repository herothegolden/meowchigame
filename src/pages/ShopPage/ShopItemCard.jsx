// src/pages/ShopPage/ShopItemCard.jsx
// v7 — Compact Layout, Equal Buttons, Aligned Footer (No Logic Change)

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
    <div className="bg-nav p-3 rounded-lg border border-gray-700 flex flex-col justify-between text-primary font-inter">
      {/* Top Section */}
      <div className="flex items-start space-x-3">
        <div className="text-accent mt-0.5">{icon}</div>
        <div className="flex flex-col text-left space-y-1 leading-snug">
          {item.name.includes("Time") && (
            <>
              <p className="text-[15px] font-semibold text-primary">
                ⏰ Тайм-Бусти
              </p>
              <p className="text-[13.5px] text-secondary">
                Когда хочешь ещё чуть-чуть 쫀득-времени.
              </p>
              <p className="text-[13.5px] text-secondary">
                +10 сек. чистого наслаждения.
              </p>
            </>
          )}

          {item.name.includes("Bomb") && (
            <>
              <p className="text-[15px] font-semibold text-primary">
                💣 쿠키-Бомбы
              </p>
              <p className="text-[13.5px] text-secondary">
                Бум — сладкий хаос и чистые 쫀득-вибы.
              </p>
              <p className="text-[13.5px] text-secondary">
                Очищает 3×3 поле.
              </p>
            </>
          )}

          {item.name.includes("Points") && (
            <>
              <p className="text-[15px] font-semibold text-primary">
                ✨ Множители Очков
              </p>
              <p className="text-[13.5px] text-secondary">
                2× очков. 2× текстуры. 쫀득-вибы ×2.
              </p>
              <p className="text-[13.5px] text-secondary">
                Игра ради вайба.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Footer Row */}
      <div className="flex items-center justify-between mt-3">
        {item.type === "consumable" && (
          <p className="text-amber-400 font-medium text-base text-right flex-1 mr-4">
            У тебя: {ownedQuantity}
          </p>
        )}

        {isOwned && item.type === "permanent" ? (
          <div className="flex items-center text-green-400 font-semibold py-2 px-4">
            <CheckCircle className="w-5 h-5 mr-2" />
            Куплено
          </div>
        ) : (
          <button
            onClick={() => onPurchase(item.id)}
            disabled={!canAfford || isPurchasing}
            className={`font-semibold rounded-md flex items-center justify-center w-[110px] h-[40px] transition-all ${
              canAfford
                ? "bg-yellow-400 text-black hover:bg-yellow-300"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
            style={{
              fontFamily:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
            }}
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
