import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/layout/DashboardLayout.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { colors, typography } from "../styles/designTokens";', 'import { colors, typography, gradients } from "../styles/designTokens";')

content = content.replace('background: colors.bg', 'background: gradients.pageBackground')

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/layout/DashboardLayout.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched DashboardLayout.jsx")
