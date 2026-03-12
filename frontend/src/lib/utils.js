import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format currency
export function formatCurrency(amount, symbol = '$') {
  return `${symbol}${Number(amount).toFixed(2)}`;
}

// Format date/time
export function formatDateTime(date) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Format time only
export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Calculate time elapsed in minutes
export function getTimeElapsed(date) {
  const now = new Date();
  const created = new Date(date);
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);
  return diffMins;
}

// Format time elapsed for display
export function formatTimeElapsed(date) {
  const mins = getTimeElapsed(date);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

// Get timer status class based on elapsed time
export function getTimerStatus(date, warningMins = 10, criticalMins = 20) {
  const mins = getTimeElapsed(date);
  if (mins >= criticalMins) return 'critical';
  if (mins >= warningMins) return 'warning';
  return 'ok';
}

// Generate QR code URL using external service
export function getQRCodeURL(data, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

// Dietary tag colors and icons
export const dietaryTagConfig = {
  vegetarian: { label: 'Vegetarian', color: 'bg-green-100 text-green-800', icon: '🥬' },
  vegan: { label: 'Vegan', color: 'bg-emerald-100 text-emerald-800', icon: '🌱' },
  'gluten-free': { label: 'Gluten Free', color: 'bg-amber-100 text-amber-800', icon: '🌾' },
  seafood: { label: 'Seafood', color: 'bg-blue-100 text-blue-800', icon: '🐟' },
  spicy: { label: 'Spicy', color: 'bg-red-100 text-red-800', icon: '🌶️' },
  nuts: { label: 'Contains Nuts', color: 'bg-orange-100 text-orange-800', icon: '🥜' },
};

// Order status config
export const orderStatusConfig = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', borderColor: 'border-l-blue-500' },
  preparing: { label: 'Preparing', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', borderColor: 'border-l-yellow-500' },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', borderColor: 'border-l-green-500' },
  served: { label: 'Served', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', borderColor: 'border-l-gray-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', borderColor: 'border-l-red-500' },
};

// Local storage helpers
export const storage = {
  getCart: () => {
    try {
      return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch {
      return [];
    }
  },
  setCart: (cart) => {
    localStorage.setItem('cart', JSON.stringify(cart));
  },
  clearCart: () => {
    localStorage.removeItem('cart');
  },
  getTable: () => {
    try {
      return JSON.parse(localStorage.getItem('current_table') || 'null');
    } catch {
      return null;
    }
  },
  setTable: (table) => {
    localStorage.setItem('current_table', JSON.stringify(table));
  },
  clearTable: () => {
    localStorage.removeItem('current_table');
  },
};
