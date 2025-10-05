// src/pages/ShopPage/ShopItemCard.jsx
// v2 — Right-Aligned Layout, Large Owned Text, No Animations

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
        <div className="text-left">
          <p className="font-bold text-primary text-base">{item.name}</p>
          <p className="text-sm text-secondary">{item.description}</p>
        </div>
      </div>

      {/* Right: owned + button */}
      <div className="flex flex-col items-center justify-center min-w-[7rem] text-right">
        {item.type === "consumable" && (
          <p className="text-amber-400 font-bold text-xl mb-2">
            Owned: {ownedQuantity}
          </p>
        )}

        {isOwned && item.type === "permanent" ? (
          <div className="flex items-center text-green-400 font-bold py-2 px-4">
            <CheckCircle className="w-5 h-5 mr-2" />
            Owned
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
