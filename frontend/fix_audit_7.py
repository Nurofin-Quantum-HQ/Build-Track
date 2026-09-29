import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/audit_logs_page.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

search1 = '''    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        
        
        background: 'transparent',
        overflow: "hidden",
        minHeight: 0,
      }}
    >'''
replace1 = '''    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto', animation: 'fadeUp 300ms ease', display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>'''
content = content.replace(search1, replace1)

content = re.sub(
    r'<div className="tour-header"[\s\S]*?<h1[^>]*>[\s\S]*?Audit Logs[\s\S]*?</h1>[\s\S]*?</p>\s*</div>',
    '''<div className="tour-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', margin: 0, marginBottom: 4 }}>Audit Logs</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#64748B' }}>Recent system activity across projects, transactions, and users.</p>
          </div>''',
    content
)

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/audit_logs_page.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched carefully")
