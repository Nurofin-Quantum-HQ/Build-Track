import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We can add the initialization right before the App component definition, or inside App's useEffect.
# Doing it outside the component ensures it runs before first render, avoiding a flash!

init_code = '''
// Initialize Theme before React renders to avoid flash
(function initTheme() {
  const saved = localStorage.getItem('bt_theme_color');
  if (saved) {
    const hexToRgb = (hex) => {
      let r = 0, g = 0, b = 0;
      if (hex.length === 4) { r = parseInt(hex[1]+hex[1],16); g = parseInt(hex[2]+hex[2],16); b = parseInt(hex[3]+hex[3],16); }
      else if (hex.length === 7) { r = parseInt(hex[1]+hex[2],16); g = parseInt(hex[3]+hex[4],16); b = parseInt(hex[5]+hex[6],16); }
      return r + ", " + g + ", " + b;
    };
    const adjustColor = (hex, amount) => {
      let usePound = false;
      if (hex[0] == "#") { hex = hex.slice(1); usePound = true; }
      let num = parseInt(hex, 16);
      let r = (num >> 16) + amount; if (r > 255) r = 255; else if (r < 0) r = 0;
      let g = ((num >> 8) & 0x00FF) + amount; if (g > 255) g = 255; else if (g < 0) g = 0;
      let b = (num & 0x0000FF) + amount; if (b > 255) b = 255; else if (b < 0) b = 0;
      return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    };
    const hover = adjustColor(saved, -20);
    const light = adjustColor(saved, 30);
    const rgb = hexToRgb(saved);

    document.documentElement.style.setProperty('--color-primary', saved);
    document.documentElement.style.setProperty('--color-primary-hover', hover);
    document.documentElement.style.setProperty('--color-primary-light', light);
    document.documentElement.style.setProperty('--color-primary-rgb', rgb);
  }
})();

'''

if 'initTheme' not in content:
    content = content.replace('export default function App() {', init_code + 'export default function App() {')
    with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched App.jsx")
else:
    print("Already patched")
