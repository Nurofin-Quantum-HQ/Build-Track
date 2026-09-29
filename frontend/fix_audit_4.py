import re

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/audit_logs_page.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Root div (only the one for the main component, after if (!isAdmin))
# We can find eturn ( right after if (!isAdmin) block
parts = content.split('if (!isAdmin) {')
part2 = parts[1].split('return (')
# part2[0] has the return for !isAdmin
# part2[1] has the rest, wait no, there is a eturn ( at the end of the if block, and another eturn ( for the main component.
idx = content.find('return (', content.find('if (!isAdmin) {') + 20)
idx2 = content.find('return (', idx + 10)

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

# 2. Header block
search2 = '''      <div className="tour-header"
        style={{
          flexShrink: 0,
          background: "#fff",
          borderBottom: "1px solid #ebebeb",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>Audit Logs</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>Recent system activity across projects, transactions, and users.</p>
        </div>'''
replace2 = '''      <div className="tour-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', margin: 0, marginBottom: 4 }}>Audit Logs</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#64748B' }}>Recent system activity across projects, transactions, and users.</p>
        </div>'''
content = content.replace(search2, replace2)

# 3. Stats padding
search3 = '''<div className="tour-stats" style={{ display: "flex", gap: 12, padding: "16px 24px", overflowX: "auto", flexShrink: 0 }}>'''
replace3 = '''<div className="tour-stats" style={{ display: "flex", gap: 12, marginBottom: 24, overflowX: "auto", flexShrink: 0 }}>'''
content = content.replace(search3, replace3)

# 4. Filters padding
search4 = '''<div className="tour-filters" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "8px 24px 16px", flexWrap: "wrap", flexShrink: 0 }}>'''
replace4 = '''<div className="tour-filters" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap", flexShrink: 0 }}>'''
content = content.replace(search4, replace4)

# 5. Make the stats boxes look like cards (if they don't already)
# They are currently rendered inside <div key={k} style={{ ... }}>
# They have orderRadius: 12, border: '1px solid #E5E7EB' probably, let's leave them if they are fine.

with open('c:/Users/Muneesha/Desktop/build-track/Build-Track/frontend/src/screens/audit_logs_page.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched carefully")
