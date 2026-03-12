import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsAPI } from '../lib/api';

const SettingsContext = createContext();

const defaultSettings = {
  id: '',
  name: 'Mijn Restaurant',
  logo_url: null,
  primary_color: '#5A6B5D',
  secondary_color: '#E8E6E1',
  currency: 'EUR',
  currency_symbol: '€',
};

// Convert hex to HSL for CSS variables
function hexToHSL(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: h = 0;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Apply colors to CSS variables
function applyColorsToCSS(primaryColor, secondaryColor) {
  const root = document.documentElement;
  
  if (primaryColor) {
    const primaryHSL = hexToHSL(primaryColor);
    root.style.setProperty('--primary', primaryHSL);
    root.style.setProperty('--ring', primaryHSL);
  }
  
  if (secondaryColor) {
    const secondaryHSL = hexToHSL(secondaryColor);
    root.style.setProperty('--secondary', secondaryHSL);
    root.style.setProperty('--muted', secondaryHSL);
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Apply colors when settings change
  useEffect(() => {
    if (settings.primary_color || settings.secondary_color) {
      applyColorsToCSS(settings.primary_color, settings.secondary_color);
    }
  }, [settings.primary_color, settings.secondary_color]);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.get();
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const response = await settingsAPI.update(newSettings);
      setSettings(response.data);
      // Apply colors immediately after update
      applyColorsToCSS(response.data.primary_color, response.data.secondary_color);
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const value = {
    settings,
    loading,
    fetchSettings,
    updateSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
