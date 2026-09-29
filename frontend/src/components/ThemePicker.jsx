import React, { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { colors } from '../styles/designTokens';

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
    // Generate hover and light variants based on the hex
    // Simple logic: we'll just use the same color for now, or you could do tint/shade
    document.documentElement.style.setProperty('--color-primary', color);
    document.documentElement.style.setProperty('--color-primary-hover', color);
    document.documentElement.style.setProperty('--color-primary-light', color);
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
