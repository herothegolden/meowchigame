import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Check, Loader } from 'lucide-react';
import { apiCall, showSuccess, showError } from '../../utils/api';

const PRODUCTS = [
  {
    id: 'strawberry_oreo_jar_100',
    name: "Jar Cubes",
    weight: "100gr",
    price: 85000,
    stock: 50,
    imageUrl: 'https://ik.imagekit.io/59r2kpz8r/Option3.webp?updatedAt=1756918223729'
  },
  {
    id: 'strawberry_oreo_mini_box_125',
    name: "Mini Box Cubes",
    weight: "125gr",
    price: 95000,
    stock: 30,
    imageUrl: 'https://ik.imagekit.io/59r2kpz8r/Option2.webp?updatedAt=1756918223593'
  },
  {
    id: 'strawberry_oreo_gift_box_300',
    name: "Gift Box Bars",
    weight: "300gr",
    price: 270000,
    stock: 15,
    imageUrl: 'https://ik.imagekit.io/59r2kpz8r/Option3(1).webp?updatedAt=1756918223931'
  }
];

const OrderPage = () => {
  const [selectedFlavor, setSelectedFlavor] = useState('classic');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setOrderSuccess(false);
  };

  const incrementQuantity = () => {
    if (selectedProduct && quantity < selectedProduct.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    return selectedProduct.price * quantity;
  };

  const formatPrice = (price) => {
    return `${price.toLocaleString()} UZS`;
  };

  const handleSubmitOrder = async () => {
    if (!selectedProduct) {
      showError('Please select a product');
      return;
    }

    if (quantity < 1) {
      showError('Quantity must be at least 1');
      return;
    }

    if (quantity > selectedProduct.stock) {
      showError(`Only ${selectedProduct.stock} items available`);
      return;
    }

    setIsSubmitting(true);

    try {
      const flavorPrefix = selectedFlavor === 'classic' 
        ? 'Viral Classic Strawberry & Oreo' 
        : 'Viral Matcha Strawberry & Oreo';
      
      const fullProductName = `${flavorPrefix} ${selectedProduct.name}`;

      const result = await apiCall('/api/create-order', {
        productId: selectedProduct.id,
        productName: fullProductName,
        quantity: quantity,
        totalAmount: calculateTotal()
      });

      setOrderSuccess(true);
      showSuccess('Order submitted! Admin will contact you via Telegram.');

      setTimeout(() => {
        setSelectedProduct(null);
        setQuantity(1);
        setOrderSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Order submission error:', error);
      showError(error.message || 'Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-nav p-8 rounded-lg border border-accent text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Check className="w-16 h-16 text-accent mx-auto mb-4" />
          </motion.div>
          <h2 className="text-2xl font-bold text-primary mb-2">Order Submitted!</h2>
          <p className="text-secondary mb-4">
            Our admin will contact you via Telegram to arrange payment and delivery.
          </p>
          <div className="bg-accent/10 p-4 rounded-lg border border-accent/30">
            <p className="text-sm text-primary">
              <strong>Order Details:</strong>
            </p>
            <p className="text-sm text-secondary mt-2">
              {selectedProduct?.name} x{quantity}
            </p>
            <p className="text-lg font-bold text-accent mt-2">
              {formatPrice(calculateTotal())}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-primary mb-2">Order Cookies</h1>
        <p className="text-secondary text-sm">Select your product and quantity</p>
      </motion.div>

      {/* Flavor Selection */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex gap-3">
          <button
            onClick={() => setSelectedFlavor('classic')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              selectedFlavor === 'classic'
                ? 'bg-pink-500 text-white border-2 border-pink-400'
                : 'bg-nav text-secondary border-2 border-gray-700 hover:border-pink-400/50'
            }`}
          >
            Viral Classic
            <div className="text-xs font-normal mt-1">Strawberry & Oreo</div>
          </button>
          
          <button
            onClick={() => setSelectedFlavor('matcha')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              selectedFlavor === 'matcha'
                ? 'bg-green-500 text-white border-2 border-green-400'
                : 'bg-nav text-secondary border-2 border-gray-700 hover:border-green-400/50'
            }`}
          >
            Viral Matcha
            <div className="text-xs font-normal mt-1">Strawberry & Oreo</div>
          </button>
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
            onClick={() => handleProductSelect(product)}
            className={`bg-nav p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedProduct?.id === product.id
                ? 'border-accent shadow-lg shadow-accent/20'
                : 'border-gray-700 hover:border-accent/50'
            }`}
          >
            <div className="flex items-center space-x-4">
              {/* Product Image */}
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-accent/10">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-primary font-bold text-sm mb-1">{product.name}</h3>
                <p className="text-secondary text-xs mb-1">{product.weight}</p>
                <div className="flex items-center justify-between">
                  <span className="text-accent font-bold">{formatPrice(product.price)}</span>
                  <span className="text-xs text-secondary">Stock: {product.stock}</span>
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedProduct?.id === product.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex-shrink-0"
                >
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                    <Check className="w-4 h-4 text-background" />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quantity Selector - Always Visible */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-nav p-6 rounded-lg border border-gray-700 mb-6"
      >
        <h3 className="text-primary font-bold mb-4">Select Quantity</h3>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={decrementQuantity}
            disabled={quantity <= 1 || !selectedProduct}
            className="w-12 h-12 rounded-full bg-accent/20 hover:bg-accent/30 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Minus className="w-5 h-5 text-accent" />
          </button>

          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{quantity}</div>
            <div className="text-xs text-secondary mt-1">
              Max: {selectedProduct ? selectedProduct.stock : 0}
            </div>
          </div>

          <button
            onClick={incrementQuantity}
            disabled={!selectedProduct || quantity >= (selectedProduct?.stock || 0)}
            className="w-12 h-12 rounded-full bg-accent/20 hover:bg-accent/30 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5 text-accent" />
          </button>
        </div>

        {/* Pricing Summary */}
        <div className="bg-accent/10 p-4 rounded-lg border border-accent/30 space-y-3">
          {/* Available Discounts */}
          <div className="space-y-1">
            <p className="text-xs text-secondary font-semibold mb-1">Available Discounts:</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary">• Game tester & contributor</span>
              <span className="text-secondary">20%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary">• Social media contributor</span>
              <span className="text-secondary">20%</span>
            </div>
          </div>

          <div className="border-t border-accent/20 pt-3 space-y-2">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Subtotal:</span>
              <span className="text-primary font-semibold">
                {formatPrice(calculateTotal())}
              </span>
            </div>

            {/* Discounts */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Discounts:</span>
              <span className="text-primary font-semibold">-0 UZS</span>
            </div>

            {/* Total */}
            <div className="border-t border-accent/20 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-secondary font-semibold">Total:</span>
                <span className="text-xl font-bold text-accent">
                  {formatPrice(calculateTotal())}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Submit Button - Always Visible */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="fixed bottom-20 left-0 right-0 p-4 bg-background border-t border-gray-700 z-40"
      >
        <button
          onClick={handleSubmitOrder}
          disabled={isSubmitting || !selectedProduct}
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
              <span>Submit Order</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};

export default OrderPage;
