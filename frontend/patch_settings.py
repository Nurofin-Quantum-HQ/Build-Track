import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/settings_page.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'import { ThemePicker }' not in content:
    content = content.replace('import ModuleTour', "import { ThemePicker } from '../components/ThemePicker';\nimport ModuleTour")

content = content.replace('onClick={handleSaveCompany}', "onClick={handleSaveCompany}") # dummy

search = 'onClick={handleSaveCompany}'

lines = content.split('\n')
for i, line in enumerate(lines):
    if 'onClick={handleSaveCompany}' in line:
        insert_idx = i - 3
        break

lines.insert(insert_idx, '''                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, marginTop: 16 }}>
                    <Palette size={14} color="#F97316" />
                    PORTAL THEME COLOR
                  </label>
                  <div style={{ width: 250, marginBottom: 24 }}>
                    <ThemePicker />
                  </div>
                </div>''')

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/settings_page.jsx', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print("Patched settings_page.jsx")
