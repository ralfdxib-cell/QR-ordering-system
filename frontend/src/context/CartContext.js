import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../lib/utils';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [table, setTable] = useState(null);

  // Load cart and table from localStorage on mount
  useEffect(() => {
    setCart(storage.getCart());
    setTable(storage.getTable());
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    storage.setCart(cart);
  }, [cart]);

  // Save table to localStorage whenever it changes
  useEffect(() => {
    if (table) {
      storage.setTable(table);
    }
  }, [table]);

  // Add item to cart
  const addToCart = (item, quantity = 1, selectedModifiers = [], specialInstructions = '') => {
    const cartItem = {
      id: `${item.id}-${Date.now()}`, // Unique cart item ID
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      image: item.image_url,
      quantity,
      modifiers: selectedModifiers,
      specialInstructions,
      subtotal: calculateItemSubtotal(item.price, quantity, selectedModifiers),
    };

    setCart(prev => [...prev, cartItem]);
    return cartItem;
  };

  // Calculate item subtotal including modifiers
  const calculateItemSubtotal = (basePrice, quantity, modifiers) => {
    const modifierTotal = modifiers.reduce((sum, mod) => sum + (mod.price || 0), 0);
    return (basePrice + modifierTotal) * quantity;
  };

  // Update item quantity
  const updateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(cartItemId);
      return;
    }

    setCart(prev => prev.map(item => {
      if (item.id === cartItemId) {
        const modifierTotal = item.modifiers.reduce((sum, mod) => sum + (mod.price || 0), 0);
        return {
          ...item,
          quantity: newQuantity,
          subtotal: (item.price + modifierTotal) * newQuantity,
        };
      }
      return item;
    }));
  };

  // Remove item from cart
  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    storage.clearCart();
  };

  // Set current table
  const setCurrentTable = (tableData) => {
    setTable(tableData);
  };

  // Clear table
  const clearTable = () => {
    setTable(null);
    storage.clearTable();
  };

  // Calculate cart total
  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  // Get cart item count
  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const value = {
    cart,
    table,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setCurrentTable,
    clearTable,
    getCartTotal,
    getCartCount,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
