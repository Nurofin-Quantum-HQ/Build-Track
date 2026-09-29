import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/audit_logs_page.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix layout issues in audit logs
content = content.replace("fontFamily: \"'Segoe UI', sans-serif\",", "")
content = content.replace("background: \"#f7f7f8\",", "background: 'transparent',")
content = content.replace("height: \"100vh\",", "")
content = content.replace("height: '100vh',", "")

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/audit_logs_page.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed audit logs layout")
