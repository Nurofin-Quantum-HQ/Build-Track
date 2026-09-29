import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/styles/designTokens.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hex codes inside the gradient strings
content = content.replace('#F97316', 'var(--color-primary, #F97316)')
content = content.replace('#FB923C', 'var(--color-primary-light, #FB923C)')
content = content.replace('#EA580C', 'var(--color-primary-hover, #EA580C)')

# We might have double replaced var(--color-primary, var(--color-primary, #F97316)) 
# if I just did a blind replace. Let's fix that if it happened.
content = content.replace('var(--color-primary, var(--color-primary, #F97316))', 'var(--color-primary, #F97316)')
content = content.replace('var(--color-primary-light, var(--color-primary-light, #FB923C))', 'var(--color-primary-light, #FB923C)')
content = content.replace('var(--color-primary-hover, var(--color-primary-hover, #EA580C))', 'var(--color-primary-hover, #EA580C)')

# For the pageBackground radial gradient, use RGB for glowing effect like Nurofin AI:
pageBg_search = "pageBackground: 'radial-gradient(circle at top right, #FFF1E8, #ffffff)',"
pageBg_replace = "pageBackground: 'radial-gradient(circle at top right, rgba(var(--color-primary-rgb, 249, 115, 22), 0.15), #ffffff)',"
content = content.replace(pageBg_search, pageBg_replace)

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/styles/designTokens.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated gradients in designTokens.js")
