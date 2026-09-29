import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/components/Sidebar.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { ThemePicker } from './ThemePicker';\n", "")
content = content.replace("        <ThemePicker />\n", "")

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/components/Sidebar.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed ThemePicker from Sidebar.jsx")
