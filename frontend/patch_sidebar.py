import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/components/Sidebar.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'ThemePicker' not in content:
    content = content.replace("import { resolveImageUrl", "import { ThemePicker } from './ThemePicker';\nimport { resolveImageUrl")
    
    button_search = '''        <button
          onClick={() => window.open('https://github.com/Nurofin-Quantum-HQ/Build-Track-App/releases/latest/download/app-release.apk', '_blank')}'''
          
    button_replace = '''        <ThemePicker />
        <button
          onClick={() => window.open('https://github.com/Nurofin-Quantum-HQ/Build-Track-App/releases/latest/download/app-release.apk', '_blank')}'''
          
    content = content.replace(button_search, button_replace)

    with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/components/Sidebar.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched Sidebar.jsx")
