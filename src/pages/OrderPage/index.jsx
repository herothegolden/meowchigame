// Path: frontend/src/pages/OrderPage/index.jsx
// v3 — Applies 42% Meow promo when arriving with ?promo=MEOW42&claim=<id>
// - On mount: verifies & consumes claim via /api/activate-promo
// - Pricing: shows Discounts = 42% and recalculates Total
// - All other UI/flows unchanged

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Loader, Trash2 } from 'lucide-react';
import { apiCall, showSuccess, showError } from '../../utils/api';

const PRODUCTS = [
  {
    id: 'jar_100',
    name: "Jar Cubes",
    weight: "100gr",
    price: 85000,
    stock: 50,
    imageUrl: 'https://ik.imagekit.io/59r2kpz8r/Option3.webp?updatedAt=1756918223729'
  },
  {
    id: 'mini_box_125',
    name: "Mini Box Cubes",
    weight: "125gr",
    price: 95000,
    stock: 30,
    imageUrl: 'https://ik.imagekit.io/59r2kpz8r/Option2.webp?updatedAt=1756918223593'
  },
  {
    id: 'gift_box_300',
    name: "Gift Box Bars",
    weight: "300gr",
    price: 270000,
    stock: 15,
    imageUrl: 'https://ik.imagekit.io/59r2kpz8r/Option3(1).webp?updatedAt=1756918223931'
  }
];

const OrderPage = () => {
  const location = useLocation();

  const [selectedFlavor, setSelectedFlavor] = useState('classic');
  const [cart, setCart] = useState([]);
  const [selectedCartItemId, setSelectedCartItemId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showFlavorBurst, setShowFlavorBurst] = useState(null); // 'classic' or 'matcha'

  // ✅ Meow promo state
  const [promoActive, setPromoActive] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [claimId, setClaimId] = useState(null);
  const [verifyingPromo, setVerifyingPromo] = useState(false);

  // Haptics
  const triggerHaptic = (style = 'light') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  // Flavor selection handlers
  const handleFlavorSelect = (flavor) => {
    triggerHaptic('light');
    setSelectedFlavor(flavor);
    setShowFlavorBurst(flavor);
    setTimeout(() => setShowFlavorBurst(null), 800);
  };
  const handleCardKeyDown = (flavor) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFlavorSelect(flavor);
    }
  };

  // Cart helpers
  const handleAddToCart = (product) => {
    triggerHaptic('medium');
    const flavorPrefix = selectedFlavor === 'classic' ? 'Viral Classic' : 'Viral Matcha';
    const shortName = `${flavorPrefix} ${product.name.split(' ')[0]}`; // "Viral Classic Jar"
    const fullProductName = `${flavorPrefix} Strawberry & Oreo ${product.name}`;

    const cartItem = {
      id: `${selectedFlavor}_${product.id}_${Date.now()}`,
      productId: product.id,
      flavor: selectedFlavor,
      displayName: shortName,
      fullName: fullProductName,
      quantity: 1,
      unitPrice: product.price,
      totalPrice: product.price
    };

    const newCart = [...cart, cartItem];
    setCart(newCart);
    setSelectedCartItemId(cartItem.id); // Auto-select newly added item
  };

  const handleRemoveFromCart = (itemId) => {
    triggerHaptic('medium');
    const newCart = cart.filter(item => item.id !== itemId);
    setCart(newCart);
    if (selectedCartItemId === itemId) {
      setSelectedCartItemId(newCart.length > 0 ? newCart[0].id : null);
    }
  };

  const handleSelectCartItem = (itemId) => {
    triggerHaptic('light');
    setSelectedCartItemId(itemId);
  };

  const getSelectedItem = () => cart.find(item => item.id === selectedCartItemId);

  const incrementQuantity = () => {
    triggerHaptic('light');
    const selectedItem = getSelectedItem();
    if (!selectedItem) return;

    const newCart = cart.map(item => {
      if (item.id === selectedCartItemId) {
        const newQuantity = item.quantity + 1;
        return { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity };
      }
      return item;
    });
    setCart(newCart);
  };

  const decrementQuantity = () => {
    triggerHaptic('light');
    const selectedItem = getSelectedItem();
    if (!selectedItem || selectedItem.quantity <= 1) return;

    const newCart = cart.map(item => {
      if (item.id === selectedCartItemId) {
        const newQuantity = item.quantity - 1;
        return { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity };
      }
      return item;
    });
    setCart(newCart);
  };

  // Pricing helpers
  const calculateSubtotal = () => cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const formatPrice = (price) => `${price.toLocaleString()} UZS`;

  const subtotal = useMemo(() => calculateSubtotal(), [cart]);
  const discountAmount = useMemo(
    () => (promoActive ? Math.floor(subtotal * (discountPercent / 100)) : 0),
    [promoActive, discountPercent, subtotal]
  );
  const finalTotal = useMemo(() => Math.max(subtotal - discountAmount, 0), [subtotal, discountAmount]);

  // Submit order (unchanged, but now uses finalTotal)
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      showError('Please add items to your cart');
      return;
    }
    triggerHaptic('heavy');
    setIsSubmitting(true);
    try {
      const result = await apiCall('/api/create-order', {
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.fullName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        totalAmount: finalTotal
      });

      setOrderSuccess(true);
      showSuccess('Order submitted! Admin will contact you via Telegram.');
      setTimeout(() => {
        setCart([]);
        setSelectedCartItemId(null);
        setOrderSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Order submission error:', error);
      showError(error.message || 'Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ One-time promo activation when arriving from Profile CTA
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const promo = params.get('promo');
    const cid = params.get('claim');

    if (promo === 'MEOW42' && cid && !promoActive) {
      (async () => {
        try {
          setVerifyingPromo(true);
          const res = await apiCall('/api/activate-promo', { claimId: cid });
          if (res?.success && res?.discountPercent === 42) {
            setPromoActive(true);
            setDiscountPercent(42);
            setClaimId(cid);
            showSuccess('Скидка 42% активирована');
          } else {
            showError(res?.error || 'Не удалось активировать скидку');
          }
        } catch (e) {
          showError(e?.message || 'Ошибка активации скидки');
        } finally {
          setVerifyingPromo(false);
        }
      })();
    }
  }, [location.search, promoActive]);

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-nav p-8 rounded-lg border border-accent text-center max-w-md"
        >
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
            <ShoppingCart className="w-16 h-16 text-accent mx-auto mb-4" />
          </motion.div>
          <h2 className="text-2xl font-bold text-primary mb-2">Order Submitted!</h2>
          <p className="text-secondary mb-4">Our admin will contact you via Telegram to arrange payment and delivery.</p>
          <div className="bg-accent/10 p-4 rounded-lg border border-accent/30">
            <p className="text-sm text-primary">
              <strong>Total Items:</strong> {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </p>
            <p className="text-lg font-bold text-accent mt-2">{formatPrice(finalTotal)}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const selectedItem = getSelectedItem();

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-primary mb-2">Закажи свои 쫀득쿠ки</h1>
        <p className="text-secondary text-sm">
          Strawberry & Oreo vibes прямо в Ташкенте ✨{promoActive && ' • Активирована скидка 42%'}
        </p>
      </motion.div>

      {/* Flavor Selection (Cards replace buttons) */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Classic Card */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={selectedFlavor === 'classic'}
            onClick={() => handleFlavorSelect('classic')}
            onKeyDown={handleCardKeyDown('classic')}
            className={`rounded-2xl border-2 p-3 bg-white/5 backdrop-blur-lg transition-all
              ${selectedFlavor === 'classic'
                ? 'border-pink-400'
                : 'border-gray-700 hover:border-pink-400/50'}`}
          >
            <div className="rounded-xl overflow-hidden">
              <video
                src="https://ik.imagekit.io/59r2kpz8r/G2.webm/ik-video.mp4?updatedAt=1759689992885"
                className="w-full h-36 object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                decoding="async"
              />
            </div>
            <div className="mt-3">
              <h3 className="text-primary font-semibold leading-tight">Viral Classic</h3>
              <p className="text-xs text-secondary">🍓 + Oreo = культовый вкус</p>
            </div>
          </div>

          {/* Matcha Card */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={selectedFlavor === 'matcha'}
            onClick={() => handleFlavorSelect('matcha')}
            onKeyDown={handleCardKeyDown('matcha')}
            className={`rounded-2xl border-2 p-3 bg-white/5 backdrop-blur-lg transition-all
              ${selectedFlavor === 'matcha'
                ? 'border-green-400'
                : 'border-gray-700 hover:border-green-400/50'}`}
          >
            <div className="rounded-xl overflow-hidden">
              <video
                src="https://ik.imagekit.io/59r2kpz8r/G3.webm/ik-video.mp4?updatedAt=1759691005917"
                className="w-full h-36 object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                decoding="async"
              />
            </div>
            <div className="mt-3">
              <h3 className="text-primary font-semibold leading-tight">Viral Matcha</h3>
              <p className="text-xs text-secondary">🍵 + Oreo = новый obsession</p>
            </div>
          </div>

          {/* Flavor Burst Animation */}
          <AnimatePresence>
            {showFlavorBurst && (
              <div className="sm:col-span-2 relative">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {[0, 1, 2, 3, 4].map((index) => {
                    const angle = (index * 72) - 90;
                    const distance = 60;
                    const x = Math.cos((angle * Math.PI) / 180) * distance;
                    const y = Math.sin((angle * Math.PI) / 180) * distance;
                    return (
                      <motion.div
                        key={`burst-${index}`}
                        initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                        animate={{
                          scale: [0, 1.5, 1.2],
                          x, y,
                          opacity: [1, 1, 0],
                          rotate: Math.random() * 360
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute text-4xl"
                      >
                        {showFlavorBurst === 'classic' ? '🍓' : '🍵'}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Products Grid */}
      <div className="space-y-4 mb-6">
        {PRODUCTS.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            onClick={() => handleAddToCart(product)}
            className="bg-nav p-4 rounded-lg border-2 border-gray-700 hover:border-accent/50 cursor-pointer transition-all"
          >
            <div className="flex items-center space-x-4">
              {/* Product Image */}
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-accent/10">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-primary font-bold text-sm mb-1">{product.name} ({product.weight})</h3>
                <p className="text-accent font-bold mb-1">{formatPrice(product.price)} • Stock: {product.stock}</p>
                <p className="text-secondary text-xs">
                  {product.id === 'jar_100' && '✨ 쫀득 момент в каждой банке'}
                  {product.id === 'mini_box_125' && '🎁 компактный формат для stories'}
                  {product.id === 'gift_box_300' && '📦 premium набор для sharing'}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cart and Quantity Section - Only show if cart has items */}
      {cart.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-nav p-6 rounded-lg border border-gray-700 mb-6">
          <h3 className="text-primary font-bold mb-4">Выбери сколько баночек счастья 🍪</h3>

          {/* Quantity Controls */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={decrementQuantity}
              disabled={!selectedItem || selectedItem.quantity <= 1}
              className="w-12 h-12 rounded-full bg-accent/20 hover:bg-accent/30 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <Minus className="w-5 h-5 text-accent" />
            </button>

            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{selectedItem ? selectedItem.quantity : 0}</div>
              <div className="text-xs text-secondary mt-1">{selectedItem ? selectedItem.displayName : 'Select item'}</div>
            </div>

            <button
              onClick={incrementQuantity}
              disabled={!selectedItem}
              className="w-12 h-12 rounded-full bg-accent/20 hover:bg-accent/30 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <Plus className="w-5 h-5 text-accent" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="mb-4 space-y-3">
            <p className="text-xs text-secondary font-semibold mb-2">Order Items:</p>
            {cart.map((item, index) => (
              <div
                key={item.id}
                onClick={() => handleSelectCartItem(item.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedCartItemId === item.id
                    ? 'bg-accent/20 border-2 border-accent'
                    : 'bg-background border-2 border-transparent hover:border-accent/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary mb-1">{index + 1}. {item.displayName}</p>
                    <p className="text-xs text-secondary">
                      Qty: {item.quantity} × {formatPrice(item.unitPrice)} = {formatPrice(item.totalPrice)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveFromCart(item.id); }}
                    className="text-red-500 hover:text-red-400 transition-colors ml-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Summary */}
          <div className="bg-accent/10 p-4 rounded-lg border border-accent/30 space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-secondary font-semibold mb-1">💡 Доступные бонусы:</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary">🎮 Тестер игры + участник</span>
                <span className="text-secondary">–20%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary">📱 Поддержка в соцсетях</span>
                <span className="text-secondary">–20%</span>
              </div>
            </div>

            <div className="border-t border-accent/20 pt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Subtotal:</span>
                <span className="text-primary font-semibold">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">
                  Discounts{promoActive ? ' (MEOW42)' : ''}:
                </span>
                <span className="text-primary font-semibold">
                  -{formatPrice(discountAmount)}
                </span>
              </div>

              <div className="border-t border-accent/20 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-secondary font-semibold">Итого:</span>
                  <span className="text-xl font-bold text-accent">{formatPrice(finalTotal)}</span>
                </div>
                <p className="text-xs text-secondary text-right mt-1 italic">(да, так вкусно и так доступно 😋)</p>
              </div>
            </div>

            {verifyingPromo && (
              <p className="text-xs text-secondary mt-1">Проверяем скидку…</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Submit Button - Always Visible */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-6">
        <button
          onClick={handleSubmitOrder}
          disabled={isSubmitting || cart.length === 0}
          className="w-full bg-accent hover:bg-accent/90 disabled:bg-gray-700 disabled:cursor-not-allowed text-background font-bold py-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Submitting Order...</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" />
              <span>🚀 Оформить заказ ({cart.length} items)</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};

export default OrderPage;
