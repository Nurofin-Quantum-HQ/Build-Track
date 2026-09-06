import { useState, useRef } from "react";
import { Table, FileDown, FileUp, Loader2 } from "lucide-react";
import { projectAPI } from "../api";
import useProjectStore from "../stores/projectStore";
import { buildDefaultPhases } from "../utils/constructionPhases";

function parseCsvString(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  return lines.map(line => {
    const row = [];
    let insideQuote = false;
    let entry = "";
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(entry.trim());
        entry = "";
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    return row;
  });
}

function parseVal(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const str = String(v).trim();
  if (!str) return null;
  const clean = str.replace(/[^\d.]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

export default function CsvImportExportCard({ project, onProjectUpdated, setToast }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { updateProject } = useProjectStore();

  const handleDownloadTemplate = () => {
    const csvRows = [
      [
        "Phase",
        "Sl.No",
        "Particular",
        "Total_Qty",
        "Unit",
        "Material_Rate",
        "Budget_Material_Amount",
        "Labour_Rate",
        "Budget_Labour_Amount",
        "Equipment_Rate",
        "Budget_Equipment_Amount",
        "Total_Amount",
      ],
    ];

    const phases = project?.selectedPhases && project.selectedPhases.length > 0
      ? project.selectedPhases
      : buildDefaultPhases();

    phases.forEach(phase => {
      let slNo = 1;
      const activities = phase.activities || phase.allActivities || [];
      const phaseName = phase.phaseName || phase.name || "";

      activities.forEach(act => {
        const matAmt = Number(act.budgetMaterial || 0);
        const labAmt = Number(act.budgetLabour || 0);
        const eqAmt = Number(act.budgetEquipment || 0);
        const totAmt = matAmt + labAmt + eqAmt;

        const qty = Number(act.qty || 1.0);
        const unit = act.unit || "";
        const matRate = Number(act.materialRate || 0);
        const labRate = Number(act.labourRate || 0);
        const eqRate = Number(act.equipmentRate || 0);

        csvRows.add ? csvRows.push([
          `"${phaseName.replace(/"/g, '""')}"`,
          slNo++,
          `"${(act.name || "").replace(/"/g, '""')}"`,
          qty > 0 ? qty.toFixed(2) : "",
          `"${unit.replace(/"/g, '""')}"`,
          matRate > 0 ? matRate.toFixed(2) : "",
          matAmt > 0 ? matAmt.toFixed(2) : "",
          labRate > 0 ? labRate.toFixed(2) : "",
          labAmt > 0 ? labAmt.toFixed(2) : "",
          eqRate > 0 ? eqRate.toFixed(2) : "",
          eqAmt > 0 ? eqAmt.toFixed(2) : "",
          totAmt > 0 ? totAmt.toFixed(2) : "",
        ]) : null;
      });
    });

    const csvContent = "\uFEFF" + csvRows.map(r => r.join(",")).join("\n");
    const filename = `${(project?.projectName || project?.name || "project").replace(/\s+/g, "_")}_phases_template.csv`;

    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (setToast) setToast({ msg: "CSV exported successfully!", type: "success" });
    } catch (err) {
      if (setToast) setToast({ msg: `Failed to export CSV: ${err.message}`, type: "error" });
    }
  };

  const handleUploadCsvClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const parsedCsv = parseCsvString(text);

      if (!parsedCsv || parsedCsv.length <= 1) {
        throw new Error("CSV file is empty or missing headers");
      }

      const headers = parsedCsv[0].map(h => h.toString().trim().toLowerCase());
      const phaseIdx = headers.indexOf("phase");
      const particularIdx = headers.indexOf("particular");
      let qtyIdx = headers.indexOf("total_qty");
      if (qtyIdx === -1) qtyIdx = headers.indexOf("qty");
      const matRateIdx = headers.indexOf("material_rate");
      let matAmtIdx = headers.indexOf("budget_material_amount");
      if (matAmtIdx === -1) matAmtIdx = headers.indexOf("material_amount");
      const labRateIdx = headers.indexOf("labour_rate");
      let labAmtIdx = headers.indexOf("budget_labour_amount");
      if (labAmtIdx === -1) labAmtIdx = headers.indexOf("labour_amount");
      const eqRateIdx = headers.indexOf("equipment_rate");
      let eqAmtIdx = headers.indexOf("budget_equipment_amount");
      if (eqAmtIdx === -1) eqAmtIdx = headers.indexOf("equipment_amount");

      if (phaseIdx === -1 || particularIdx === -1) {
        throw new Error("CSV is missing required 'Phase' or 'Particular' column headers");
      }

      let updatedPhases = [];
      if (project?.selectedPhases && project.selectedPhases.length > 0) {
        updatedPhases = JSON.parse(JSON.stringify(project.selectedPhases));
      } else {
        const defaultPhases = buildDefaultPhases();
        updatedPhases = defaultPhases.map(cp => ({
          id: `phase_${cp.phaseName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
          phaseName: cp.phaseName,
          isCustom: cp.isCustom || false,
          activities: (cp.activities || []).map(ca => ({
            id: ca.id || ca.key || `act_${ca.name.toLowerCase().replace(/\s+/g, "_")}`,
            name: ca.name,
            isCustom: ca.isCustom || false,
            completed: false,
            budgetMaterial: 0.0,
            budgetLabour: 0.0,
            budgetEquipment: 0.0,
          })),
        }));
      }

      let updatedCount = 0;
      for (let i = 1; i < parsedCsv.length; i++) {
        const row = parsedCsv[i];
        const maxIdx = Math.max(phaseIdx, particularIdx);
        if (row.length <= maxIdx) continue;

        const phaseName = row[phaseIdx]?.trim();
        const activityName = row[particularIdx]?.trim();
        if (!phaseName || !activityName) continue;

        const qty = qtyIdx !== -1 && qtyIdx < row.length ? parseVal(row[qtyIdx]) : null;
        const matRate = matRateIdx !== -1 && matRateIdx < row.length ? parseVal(row[matRateIdx]) : null;
        let matAmt = matAmtIdx !== -1 && matAmtIdx < row.length ? parseVal(row[matAmtIdx]) : null;
        if (matAmt === null && matRate !== null && qty !== null) matAmt = qty * matRate;

        const labRate = labRateIdx !== -1 && labRateIdx < row.length ? parseVal(row[labRateIdx]) : null;
        let labAmt = labAmtIdx !== -1 && labAmtIdx < row.length ? parseVal(row[labAmtIdx]) : null;
        if (labAmt === null && labRate !== null && qty !== null) labAmt = qty * labRate;

        const eqRate = eqRateIdx !== -1 && eqRateIdx < row.length ? parseVal(row[eqRateIdx]) : null;
        let eqAmt = eqAmtIdx !== -1 && eqAmtIdx < row.length ? parseVal(row[eqAmtIdx]) : null;
        if (eqAmt === null && eqRate !== null && qty !== null) eqAmt = qty * eqRate;

        let phaseIndex = updatedPhases.findIndex(p => (p.phaseName || "").trim().toLowerCase() === phaseName.toLowerCase());
        if (phaseIndex === -1) {
          const newPhase = {
            id: `phase_${phaseName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}_${i}`,
            phaseName: phaseName,
            isCustom: true,
            activities: [],
          };
          updatedPhases.push(newPhase);
          phaseIndex = updatedPhases.length - 1;
        }

        const phaseObj = updatedPhases[phaseIndex];
        const activities = Array.isArray(phaseObj.activities) ? [...phaseObj.activities] : [];
        const actIndex = activities.findIndex(a => (a.name || "").trim().toLowerCase() === activityName.toLowerCase());

        if (actIndex !== -1) {
          const currentAct = activities[actIndex];
          activities[actIndex] = {
            ...currentAct,
            budgetMaterial: matAmt !== null ? matAmt : currentAct.budgetMaterial || 0,
            budgetLabour: labAmt !== null ? labAmt : currentAct.budgetLabour || 0,
            budgetEquipment: eqAmt !== null ? eqAmt : currentAct.budgetEquipment || 0,
            qty: qty !== null ? qty : currentAct.qty,
            materialRate: matRate !== null ? matRate : currentAct.materialRate,
            labourRate: labRate !== null ? labRate : currentAct.labourRate,
            equipmentRate: eqRate !== null ? eqRate : currentAct.equipmentRate,
          };
        } else {
          const newAct = {
            id: `act_${activityName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}_${i}`,
            name: activityName,
            isCustom: true,
            completed: false,
            budgetMaterial: matAmt || 0.0,
            budgetLabour: labAmt || 0.0,
            budgetEquipment: eqAmt || 0.0,
            qty: qty,
            materialRate: matRate,
            labourRate: labRate,
            equipmentRate: eqRate,
          };
          activities.push(newAct);
        }

        updatedPhases[phaseIndex] = { ...phaseObj, activities };
        updatedCount++;
      }

      let materialSum = 0;
      let labourSum = 0;
      let equipmentSum = 0;
      updatedPhases.forEach(phase => {
        (phase.activities || []).forEach(act => {
          materialSum += Number(act.budgetMaterial || 0);
          labourSum += Number(act.budgetLabour || 0);
          equipmentSum += Number(act.budgetEquipment || 0);
        });
      });
      const totalSum = materialSum + labourSum + equipmentSum + Number(project?.budgetMisc || 0);

      const pId = project?._id || project?.id;
      const payload = {
        selectedPhases: updatedPhases,
        budgetMaterial: materialSum,
        budgetLabour: labourSum,
        budgetEquipment: equipmentSum,
        totalBudget: totalSum,
      };

      const { data } = await projectAPI.update(pId, payload);
      const updated = data?.project || data || { ...project, ...payload };

      if (updateProject) {
        updateProject(pId, payload);
      }
      if (onProjectUpdated) {
        onProjectUpdated(updated);
      }

      if (setToast) {
        setToast({ msg: `Successfully imported budget for ${updatedCount} activities!`, type: "success" });
      }
    } catch (err) {
      if (setToast) {
        setToast({ msg: `Upload failed: ${err.message}`, type: "error" });
      }
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      border: "1px solid #E5E7EB",
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(16, 185, 129, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "#10B981",
        }}>
          <Table size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10,
            letterSpacing: "1px",
            fontWeight: 800,
            color: "#64748B",
            textTransform: "uppercase",
            marginBottom: 2,
          }}>
            PHASES & BUDGET CONFIGURATION
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#111827",
          }}>
            Import/Export CSV budgets for all phases.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button
          onClick={handleDownloadTemplate}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1.5px solid #F1F1F1",
            background: "#fff",
            color: "#F97316",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.18s ease",
          }}
        >
          <FileDown size={16} />
          <span>Export CSV</span>
        </button>

        <button
          onClick={handleUploadCsvClick}
          disabled={isUploading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "#F97316",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: isUploading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: isUploading ? 0.7 : 1,
            transition: "all 0.18s ease",
          }}
        >
          {isUploading ? (
            <>
              <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <FileUp size={16} />
              <span>Upload CSV</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
