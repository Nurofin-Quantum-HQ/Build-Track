import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/settings_page.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('"#F97316"', 'var(--color-primary, "#F97316")')
content = content.replace('"#EA580C"', 'var(--color-primary-hover, "#EA580C")')
content = content.replace('"#FB923C"', 'var(--color-primary-light, "#FB923C")')

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/settings_page.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched settings_page.jsx")
