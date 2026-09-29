import re

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace('var(--color-primary, "#F97316")', '"var(--color-primary, #F97316)"')
    content = content.replace('var(--color-primary-hover, "#EA580C")', '"var(--color-primary-hover, #EA580C)"')
    content = content.replace('var(--color-primary-light, "#FB923C")', '"var(--color-primary-light, #FB923C)"')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/components/Charts.jsx')
fix_file('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/settings_page.jsx')

print("Fixed JSX syntax")
