import os
import re

directory = 'c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src'
count = 0

pattern1 = re.compile(r'(?i)(?<!var\(--color-primary, )#F97316')
pattern2 = re.compile(r'(?i)(?<!var\(--color-primary-hover, )#EA580C')
pattern3 = re.compile(r'(?i)(?<!var\(--color-primary-light, )#FB923C')

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js') or file.endswith('.css'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content
            
            content = pattern1.sub('var(--color-primary, #F97316)', content)
            content = pattern2.sub('var(--color-primary-hover, #EA580C)', content)
            content = pattern3.sub('var(--color-primary-light, #FB923C)', content)
            
            # fix broken syntax like color="var(--color-primary, var(--color-primary, #F97316))" if it happened
            content = content.replace('var(--color-primary, var(--color-primary, #F97316))', 'var(--color-primary, #F97316)')
            content = content.replace('var(--color-primary-hover, var(--color-primary-hover, #EA580C))', 'var(--color-primary-hover, #EA580C)')
            content = content.replace('var(--color-primary-light, var(--color-primary-light, #FB923C))', 'var(--color-primary-light, #FB923C)')
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                count += 1

print(f"Regex replaced colors in {count} files")
