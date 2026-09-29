import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/audit_logs_page.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove height/flex from root
content = content.replace("display: 'flex', flexDirection: 'column', height: '100%', width: '100%'", "")
content = content.replace("padding: '28px 32px', maxWidth: 1200, margin: '0 auto', animation: 'fadeUp 300ms ease',  }", "padding: '28px 32px', maxWidth: 1200, margin: '0 auto', animation: 'fadeUp 300ms ease' }")

# 2. Remove overflowY and flex: 1 from body
search_body = '''        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >'''
replace_body = '''        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >'''
content = content.replace(search_body, replace_body)

# Wait, if I replaced the body, the log list still has overflow: "hidden" but it grows with content.
with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/audit_logs_page.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched audit_logs scrolling")
