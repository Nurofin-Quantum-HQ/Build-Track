import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/manual_entry.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace: date: new Date(date).toISOString(),
# With logic that appends the current time.

def replace_date(match):
    return '''date: (() => {
            const d = new Date(date);
            const now = new Date();
            d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
            return d.toISOString();
          })(),'''

content = re.sub(r'date:\s*new\s+Date\(date\)\.toISOString\(\),', replace_date, content)

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/manual_entry.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched manual_entry.jsx date")
