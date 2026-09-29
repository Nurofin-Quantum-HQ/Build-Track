import os

directory = 'c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src'
count = 0

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content

            # Replace double-quoted hexes
            content = content.replace('\"#F97316\"', '\"var(--color-primary, #F97316)\"')
            content = content.replace('\"#EA580C\"', '\"var(--color-primary-hover, #EA580C)\"')
            content = content.replace('\"#FB923C\"', '\"var(--color-primary-light, #FB923C)\"')

            # Replace single-quoted hexes
            content = content.replace('\'#F97316\'', '\'var(--color-primary, #F97316)\'')
            content = content.replace('\'#EA580C\'', '\'var(--color-primary-hover, #EA580C)\'')
            content = content.replace('\'#FB923C\'', '\'var(--color-primary-light, #FB923C)\'')
            
            # We must be careful about var(--color-primary, var(--color-primary... if we run this twice.
            # But they should be safely nested if it happens, though let's fix it just in case
            content = content.replace('var(--color-primary, var(--color-primary, #F97316))', 'var(--color-primary, #F97316)')
            content = content.replace('var(--color-primary-hover, var(--color-primary-hover, #EA580C))', 'var(--color-primary-hover, #EA580C)')
            content = content.replace('var(--color-primary-light, var(--color-primary-light, #FB923C))', 'var(--color-primary-light, #FB923C)')

            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                count += 1

print(f"Replaced colors in {count} files")
