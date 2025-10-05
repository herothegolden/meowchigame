// src/pages/ShopPage/ShopItemCard.jsx
// v5 — Inter Font, Unified with App Style (No Logic Change)

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
    <div className="bg-nav p-4 rounded-lg border border-gray-700 flex flex-col justify-between text-primary font-inter">
      {/* Top Section */}
      <div className="flex items-start space-x-3 mb-3">
        <div className="text-accent">{icon}</div>
        <div className="flex flex-col text-left space-y-2">
          {item.name.includes("Time") && (
            <>
              <p className="text-base font-semibold flex items-center text-primary">
                ⏰ Тайм-Бусти
              </p>
              <p className="text-sm text-secondary">
                Когда время — просто ингредиент в рецепте счастья.
              </p>
              <p className="text-sm text-secondary">
                +10 секунд наслаждения. Ещё немного, чтобы услышать это
                идеальное “чпоньк!” — момент чистых 쫀득-вибов.
              </p>
            </>
          )}

          {item.name.includes("Bomb") && (
            <>
              <p className="text-base font-semibold flex items-center text-primary">
                💣 쿠키-Бомбы
              </p>
              <p className="text-sm text-secondary">
                Иногда жизнь — это просто сладкий взрыв ожиданий.
              </p>
              <p className="text-sm text-secondary">
                Cookie Bomb очищает 3×3 поле и оставляет за собой вкусный хаос.
                쫀득-вибы гарантированы.
              </p>
            </>
          )}

          {item.name.includes("Points") && (
            <>
              <p className="text-base font-semibold flex items-center text-primary">
                ✨ Множители очков
              </p>
              <p className="text-sm text-secondary">
                Для тех, кто играет не ради победы, а ради вайба.
              </p>
              <p className="text-sm text-secondary">
                Двойные очки: 2× текстуры, 2× удовольствие. 쫀득-вибы на пределе
                допустимого счастья.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Footer Row */}
      <div className="flex items-center justify-between mt-4">
        {item.type === "consumable" && (
          <p className="text-amber-400 font-medium text-base">
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
            className={`font-semibold py-2 px-4 rounded-md flex items-center justify-center transition-all ${
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
