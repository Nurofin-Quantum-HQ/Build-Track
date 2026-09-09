import { useState } from "react";
import { FileText, Download, Eye, ExternalLink, Image as ImageIcon, File, Trash2 } from "lucide-react";
import { resolveImageUrl } from "../utils/imageUrl";

export default function DocumentGallery({ documents = [], onDeleteDocument, canManage }) {
  const [selectedDoc, setSelectedDoc] = useState(null);

  if (!documents || documents.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", color: "#64748B", fontSize: 13 }}>
        <FileText size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
        <div>No blueprints or attachments uploaded for this project.</div>
      </div>
    );
  }

  const isImage = (filename) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <FileText size={18} color="#F97316" />
        Blueprints & Documents ({documents.length})
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {documents.map((doc, idx) => {
          const fileUrl = resolveImageUrl(doc);
          const fileName = doc.split("/").pop() || `Document ${idx + 1}`;
          const img = isImage(fileName);

          return (
            <div key={idx} style={{ border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden", background: "#F8FAFC", display: "flex", flexDirection: "column" }}>
              <div style={{ height: 110, background: "#FFF5F0", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                {img ? (
                  <img src={fileUrl} alt={fileName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <FileText size={36} color="#F97316" />
                )}
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", opacity: 0, transition: "opacity 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                  <a href={fileUrl} target="_blank" rel="noreferrer" title="View / Open" style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#111827" }}>
                    <ExternalLink size={15} />
                  </a>
                  <a href={fileUrl} download title="Download" style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#111827" }}>
                    <Download size={15} />
                  </a>
                </div>
              </div>

              <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={fileName}>
                  {fileName}
                </span>
                {canManage && onDeleteDocument && (
                  <button onClick={() => onDeleteDocument(doc)} title="Delete document" style={{ border: "none", background: "none", color: "#DC2626", cursor: "pointer", padding: 2 }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
