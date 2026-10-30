import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { Palette, Check } from 'lucide-react';
import { applyAccent, ACCENT_PRESETS } from '../styles/designTokens';

const PRESETS = [
  { id: 'brass', name: 'Brass', hex: ACCENT_PRESETS.brass },
  { id: 'ember', name: 'Ember', hex: ACCENT_PRESETS.ember },
  { id: 'cobalt', name: 'Cobalt', hex: ACCENT_PRESETS.cobalt },
  { id: 'jade', name: 'Jade', hex: ACCENT_PRESETS.jade },
];

export function ThemePicker({ inline = false }) {
  const { user, updateUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentHex, setCurrentHex] = useState(ACCENT_PRESETS.brass);

  useEffect(() => {
    const pref = user?.themePreference || localStorage.getItem('bt_theme_color') || 'brass';
    const hex = ACCENT_PRESETS[pref.toLowerCase()] || (pref.startsWith('#') ? pref : `#${pref}`);
    setCurrentHex(hex);
    applyAccent(hex);
  }, [user?.themePreference]);

  const handleSelectColor = (colorHex) => {
    setCurrentHex(colorHex);
    applyAccent(colorHex);
    localStorage.setItem('bt_theme_color', colorHex);

    if (user) {
      api
        .put('/auth/profile', { themePreference: colorHex })
        .then((res) => {
          if (updateUser) updateUser(res.data?.user || { ...user, themePreference: colorHex });
        })
        .catch((err) => console.error('Failed to sync theme preference:', err));
    }
  };

  const isPresetSelected = (hex) => currentHex.toLowerCase() === hex.toLowerCase();

  const content = (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '16px',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-raised)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        minWidth: '220px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          ACCENT THEME
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {PRESETS.map((p) => {
          const selected = isPresetSelected(p.hex);
          return (
            <button
              key={p.id}
              onClick={() => handleSelectColor(p.hex)}
              title={p.name}
              style={{
                height: '42px',
                borderRadius: '12px',
                background: p.hex,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: selected ? '2px solid var(--ink)' : '2px solid transparent',
                outline: selected ? '2px solid var(--ground)' : 'none',
                transition: 'transform 120ms ease',
                transform: selected ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              {selected && <Check size={18} color="#FFFFFF" strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px', borderTop: '1px solid var(--line)' }}>
        <span style={{ fontSize: '12px', color: 'var(--ink-2)', flex: 1, fontFamily: 'var(--font-ui)' }}>Custom color</span>
        <label
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: currentHex,
            cursor: 'pointer',
            border: '2px solid #FFFFFF',
            boxShadow: '0 0 0 1px var(--input-border)',
            display: 'inline-block',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <input
            type="color"
            value={currentHex}
            onChange={(e) => handleSelectColor(e.target.value)}
            style={{
              position: 'absolute',
              top: '-10px',
              left: '-10px',
              width: '50px',
              height: '50px',
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </label>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '40px',
          padding: '0 14px',
          borderRadius: '12px',
          background: 'var(--fill)',
          color: 'var(--ink)',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'var(--font-ui)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          border: '1px solid transparent',
          transition: 'background 150ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Palette size={16} color="var(--ink-2)" />
          <span>Theme Color</span>
        </div>
        <div
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: currentHex,
            border: '1px solid rgba(0,0,0,0.1)',
          }}
        />
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: 0,
              zIndex: 95,
            }}
          >
            {content}
          </div>
        </>
      )}
    </div>
  );
}

export default ThemePicker;
