/**
 * Report Calculations & Data Mapping Utility
 *
 * Source of Truth: Flutter Reports Implementation
 * (Build-Track-App/lib/screen/reports/report.dart & Build-Track-App/lib/controller/project_provider.dart)
 */

/**
 * Validates if a transaction should be considered an entry in reports.
 * Flutter ProjectProvider:
 *   final rawType = (json['type'] ?? '').toString().toLowerCase();
 *   if (rawType == 'income' || rawType == 'revenue') return false;
 *   final approvalStatus = (json['approvalStatus'] ?? '').toString().toLowerCase().trim();
 *   if (approvalStatus == 'rejected') return false;
 */
export function isReportEntry(tx) {
  if (!tx) return false;
  const rawType = (tx.type || '').toString().toLowerCase();
  if (rawType === 'income' || rawType === 'revenue') return false;

  const approvalStatus = (tx.approvalStatus || '').toString().toLowerCase().trim();
  if (approvalStatus === 'rejected') return false;

  return true;
}

/**
 * Computes payment status label based on Flutter _getPaymentStatusLabel:
 * If amount > 0 and paidAmount is present:
 *   paidAmount >= amount -> 'Fully Paid'
 *   paidAmount > 0 -> 'Partial'
 * Otherwise normalizes status string.
 */
export function getPaymentStatusLabel(status, { amount, paidAmount } = {}) {
  const amt = typeof amount === 'number' ? amount : Number(amount);
  const pAmt = typeof paidAmount === 'number' ? paidAmount : Number(paidAmount);

  if (!isNaN(amt) && !isNaN(pAmt) && amt > 0) {
    if (pAmt >= amt) return 'Fully Paid';
    if (pAmt > 0) return 'Partial';
  }

  switch ((status || '').toLowerCase().trim()) {
    case 'paid':
    case 'fully paid':
    case 'fullypaid':
      return 'Fully Paid';
    case 'partial':
    case 'partially paid':
    case 'partiallypaid':
    case 'partially':
    case 'partpaid':
      return 'Partial';
    case 'pending':
    case 'not paid':
    case 'notpaid':
    case 'unpaid':
    default:
      return 'Not Paid';
  }
}

/**
 * Maps raw backend transaction to standardized Entry object.
 * Mirrors Flutter ProjectProvider._fetchEntriesForProject.
 */
export function mapTransactionToEntry(tx) {
  let parsedType = "material";
  const rawType = (tx.type || '').toLowerCase();
  if (rawType === 'labour' || rawType === 'wages') {
    parsedType = "labour";
  } else if (rawType === 'equipment' || rawType === 'expense') {
    parsedType = "equipment";
  }

  let entryProjectId = '';
  if (tx.project && typeof tx.project === 'object') {
    entryProjectId = tx.project._id || '';
  } else if (tx.project) {
    entryProjectId = tx.project.toString();
  }
  if (!entryProjectId && tx.projectId) {
    if (typeof tx.projectId === 'object') {
      entryProjectId = tx.projectId._id || '';
    } else {
      entryProjectId = tx.projectId.toString();
    }
  }
  entryProjectId = entryProjectId.trim();
  if (!entryProjectId) entryProjectId = 'p1';

  let amount = 0;
  const v = tx.amount;
  if (v !== undefined && v !== null && typeof v === 'number' && v > 0) {
    amount = v;
  } else {
    const qty = tx.quantity;
    const rate = tx.rate;
    if (typeof qty === 'number' && typeof rate === 'number' && qty > 0 && rate > 0) {
      amount = qty * rate;
    }
  }

  const parsedPaidAmount = typeof tx.paidAmount === 'number'
    ? tx.paidAmount
    : (Number(tx.paidAmount) || 0.0);

  const parsedPaymentHistory = Array.isArray(tx.paymentHistory)
    ? tx.paymentHistory
    : [];

  const createdByRaw = tx.createdBy || tx.addedBy || tx.submittedBy || tx.userId || tx.user;
  let createdBy = '';
  if (createdByRaw && typeof createdByRaw === 'object') {
    createdBy = createdByRaw._id || createdByRaw.id || '';
  } else if (createdByRaw) {
    createdBy = createdByRaw.toString();
  }

  const approvalStatusRaw = tx.approvalStatus || 'Pending';
  let paymentStatusRaw = tx.paymentStatus || 'Pending';
  if (amount > 0) {
    if (parsedPaidAmount >= amount) {
      paymentStatusRaw = 'Fully Paid';
    } else if (parsedPaidAmount > 0) {
      paymentStatusRaw = 'Partial';
    }
  }

  const paymentDateRaw = tx.paymentDate ? new Date(tx.paymentDate) : null;

  return {
    id: tx._id || String(new Date().getTime()),
    projectId: entryProjectId,
    type: parsedType,
    amount: amount,
    paidAmount: parsedPaidAmount,
    paymentHistory: parsedPaymentHistory,
    date: tx.date ? new Date(tx.date) : (tx.createdAt ? new Date(tx.createdAt) : new Date()),
    description: String(tx.materialName || tx.title || tx.description || tx.name || 'Entry'),
    brand: String(tx.brand || tx.materialName || tx.name || ''),
    ratePerUnit: typeof tx.rate === 'number' ? tx.rate : 0,
    quantity: typeof tx.quantity === 'number' ? tx.quantity : 0,
    floor: tx.floor ? String(tx.floor) : '',
    phase: tx.phase ? String(tx.phase) : '',
    phaseId: tx.phaseId ? String(tx.phaseId) : '',
    activity: tx.activity ? String(tx.activity) : '',
    activityId: tx.activityId ? String(tx.activityId) : '',
    unit: tx.unit ? String(tx.unit) : '',
    createdBy: createdBy,
    approvalStatus: approvalStatusRaw,
    paymentStatus: paymentStatusRaw,
    paymentDate: paymentDateRaw,
    rejectionReason: tx.rejectionReason || '',
    rawTx: tx
  };
}

/**
 * Calculates Filtered Cost Summary values.
 * Mirrors Flutter report.dart cost calculation loop:
 *   for (final entry in filtered) {
 *     grandTotal += entry.amount;
 *     grandPaid += entry.paidAmount;
 *     switch (entry.type) {
 *       case EntryType.material: materialTotal += entry.amount; break;
 *       case EntryType.labour: labourTotal += entry.amount; break;
 *       case EntryType.equipment: equipmentTotal += entry.amount; break;
 *     }
 *   }
 *   final grandRemaining = (grandTotal - grandPaid).clamp(0.0, double.infinity);
 */
export function calculateFilteredCostSummary(entries = []) {
  let totalBilled = 0;
  let paid = 0;
  let material = 0;
  let labour = 0;
  let equipment = 0;

  for (const entry of entries) {
    const amt = Number(entry.amount) || 0;
    const paidAmt = Number(entry.paidAmount) || 0;

    totalBilled += amt;
    paid += paidAmt;

    const type = (entry.type || '').toLowerCase();
    if (type === 'material') {
      material += amt;
    } else if (type === 'labour') {
      labour += amt;
    } else if (type === 'equipment') {
      equipment += amt;
    }
  }

  const remaining = Math.max(0, totalBilled - paid);

  return {
    totalBilled,
    paid,
    remaining,
    material,
    labour,
    equipment,
  };
}
