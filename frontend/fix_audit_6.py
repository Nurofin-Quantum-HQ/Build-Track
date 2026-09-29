import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/audit_logs_page.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'<div className="tour-header"[\s\S]*?<h1[^>]*>[\s\S]*?Audit Logs[\s\S]*?</h1>[\s\S]*?</p>\s*</div>',
    '''<div className="tour-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', margin: 0, marginBottom: 4 }}>Audit Logs</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#64748B' }}>Recent system activity across projects, transactions, and users.</p>
          </div>''',
    content
)

# Fix middle stats bar layout
content = content.replace('padding: "16px 24px", overflowX: "auto"', 'marginBottom: 24, overflowX: "auto"')

# Fix filters bar layout
content = content.replace('padding: "8px 24px 16px", flexWrap: "wrap"', 'marginBottom: 16, flexWrap: "wrap"')

# Wrap the logs list in a card-like container
content = content.replace('background: "#fff",', 'background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",')

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/audit_logs_page.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched carefully")
