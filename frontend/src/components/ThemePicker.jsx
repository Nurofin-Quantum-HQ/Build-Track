import React, { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { colors } from '../styles/designTokens';

// Utility to convert HEX to RGB
const hexToRgb = (hex) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return r + ", " + g + ", " + b;
};

// Utility to lighten/darken HEX
const adjustColor = (hex, amount) => {
  let usePound = false;
  if (hex[0] == "#") {
      hex = hex.slice(1);
      usePound = true;
  }
  let num = parseInt(hex, 16);
  let r = (num >> 16) + amount;
  if (r > 255) r = 255;
  else if  (r < 0) r = 0;
  let g = ((num >> 8) & 0x00FF) + amount;
  if (g > 255) g = 255;
  else if (g < 0) g = 0;
  let b = (num & 0x0000FF) + amount;
  if (b > 255) b = 255;
  else if (b < 0) b = 0;
  return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
};

export function ThemePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [themeColor, setThemeColor] = useState('#F97316');

  useEffect(() => {
    const saved = localStorage.getItem('bt_theme_color');
    if (saved) {
      setThemeColor(saved);
      applyTheme(saved);
    }
  }, []);

  const applyTheme = (color) => {
    const hover = adjustColor(color, -20); // darken
    const light = adjustColor(color, 30);  // lighten
    const rgb = hexToRgb(color);

    document.documentElement.style.setProperty('--color-primary', color);
    document.documentElement.style.setProperty('--color-primary-hover', hover);
    document.documentElement.style.setProperty('--color-primary-light', light);
    document.documentElement.style.setProperty('--color-primary-rgb', rgb);
    localStorage.setItem('bt_theme_color', color);
  };

  const handleChange = (e) => {
    const c = e.target.value;
    setThemeColor(c);
    applyTheme(c);
  };

  return (
    <div style={{ position: 'relative', marginTop: 8 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '10px',
          fontSize: 13,
          fontWeight: 600,
          color: colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: 'pointer',
          border: '1px solid ' + colors.border,
          background: 'transparent',
        }}
      >
        <Palette size={14} />
        Theme Color
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '110%',
          left: 0,
          right: 0,
          background: 'white',
          padding: 12,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e5e5e5',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>Pick a Color</div>
          <input 
            type="color" 
            value={themeColor} 
            onChange={handleChange}
            style={{ width: '100%', height: 40, border: 'none', cursor: 'pointer', padding: 0 }}
          />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
            {['#F97316', '#2563EB', '#16A34A', '#9333EA', '#E11D48'].map(c => (
              <div 
                key={c}
                onClick={() => { setThemeColor(c); applyTheme(c); setIsOpen(false); }}
                style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
