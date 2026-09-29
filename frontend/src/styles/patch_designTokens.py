import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/styles/designTokens.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("'#F97316'", "'var(--color-primary, #F97316)'")
content = content.replace("'#EA580C'", "'var(--color-primary-hover, #EA580C)'")
content = content.replace("'#FB923C'", "'var(--color-primary-light, #FB923C)'")

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/styles/designTokens.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated designTokens.js")
