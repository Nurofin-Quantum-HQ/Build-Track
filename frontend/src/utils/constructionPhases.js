let _counter = 0;
const uid = () => `cp_${Date.now()}_${++_counter}`;

const _act = (name) => ({
  id: uid(), name, isCustom: false,
  completed: false, completedAt: null,
  budgetMaterial: 0, budgetLabour: 0, budgetEquipment: 0,
  photos: [], notes: "",
});

export function buildDefaultPhases() {
  return [
    {
      id: uid(), phaseName: "Pre-Construction", isCustom: false,
      activities: [
        _act("Surveying"), _act("Soil Testing"),
        _act("Architectural Designing"), _act("Structural Designing"),
        _act("Planning"), _act("Cost Estimation"),
        _act("BOQ Preparation"), _act("Approvals & Permissions"),
        _act("Site Marking"), _act("Temporary Site Setup"),
      ],
    },
    {
      id: uid(), phaseName: "Site Preparation", isCustom: false,
      activities: [
        _act("Site Clearing"), _act("Excavation"),
        _act("Soil Levelling"), _act("Site Grading"),
        _act("Temporary Power Setup"), _act("Temporary Water Setup"),
        _act("Labour Shed Setup"),
      ],
    },
    {
      id: uid(), phaseName: "Foundation & Plinth Work", isCustom: false,
      activities: [
        _act("Grid Line Marking"), _act("Footing Excavation"),
        _act("Soil Levelling"), _act("PCC Laying"),
        _act("Column Center Marking"),
        _act("Reinforcement - Footing"), _act("Shuttering - Footing"),
        _act("Reinforcement - Column"),
        _act("Concrete Pouring - Footing"),
        _act("Concrete Vibration - Footing"),
        _act("Deshuttering - Footing"), _act("Curing - Footing"),
        _act("Column Starter Preparation"),
        _act("Shuttering - Column"),
        _act("Vertical Alignment Check (Plumb Bob)"),
        _act("Cover Block Placement - Column"),
        _act("Concrete Pouring - Column"),
        _act("Concrete Vibration - Column"),
        _act("Column Casting up to Plinth Beam Level"),
        _act("Deshuttering - Column"), _act("Curing - Column"),
        _act("Soil Backfilling up to Ground Level"),
        _act("Watering & Compaction - Soil"),
        _act("PCC Preparation - Plinth Beam"),
        _act("Reinforcement - Plinth Beam"),
        _act("Shuttering - Plinth Beam"),
        _act("Concrete Pouring - Plinth Beam"),
        _act("Concrete Vibration - Plinth Beam"),
        _act("Deshuttering - Plinth Beam"),
        _act("Soil Backfilling up to Plinth Level"),
        _act("Compaction using Earth Rammer"),
      ],
    },
    {
      id: uid(), phaseName: "Floor Construction", isCustom: false,
      activities: [
        _act("Column Starter Preparation"),
        _act("Reinforcement - Column"), _act("Shuttering - Column"),
        _act("Cover Block Placement - Column"),
        _act("Vertical Alignment Check (Plumb Bob)"),
        _act("Shuttering Oil Application"),
        _act("Concrete Pouring - Column"),
        _act("Concrete Vibration - Column"),
        _act("Deshuttering - Column"), _act("Curing - Column"),
        _act("Wall Layout Marking"), _act("Wall Construction"),
        _act("Door Frame Installation"),
        _act("Window Frame Installation"),
        _act("Lintel Reinforcement"),
        _act("Concrete Pouring - Lintel"),
        _act("Beam Bottom Support using Props"),
        _act("Shuttering - Beam"), _act("Reinforcement - Beam"),
        _act("Reinforcement - Slab"),
        _act("Electrical Conduit Installation"),
        _act("Plumbing Pipe Installation"),
        _act("Slab Opening / Cutout Provision"),
        _act("Crank Bar Preparation"),
        _act("Cover Block Placement - Slab"),
        _act("Concrete Pouring - Slab"),
        _act("Concrete Vibration - Slab"),
        _act("Levelling & Finishing - Slab"),
        _act("Deshuttering - Slab"), _act("Curing - Slab"),
      ],
    },
    {
      id: uid(), phaseName: "Finishing Work", isCustom: false,
      activities: [
        _act("Internal Wall Plastering"),
        _act("External Wall Plastering"),
        _act("Ceiling Plastering"), _act("Putty Application"),
        _act("Primer Application"), _act("Internal Painting"),
        _act("External Painting"),
        _act("Waterproofing - Bathroom"),
        _act("Waterproofing - Terrace"),
        _act("Tile Installation - Floor"),
        _act("Tile Installation - Wall"),
        _act("Granite / Marble Installation"),
        _act("Bathroom Fittings Installation"),
        _act("Sanitary Fittings Installation"),
        _act("Electrical Conduit Finishing"),
        _act("Electrical Wiring"),
        _act("Switch & Socket Installation"),
        _act("Light Fixture Installation"),
        _act("Plumbing Fixture Installation"),
        _act("Kitchen Sink Installation"),
        _act("Door Installation"), _act("Window Installation"),
        _act("Glass Installation"), _act("Railing Installation"),
        _act("False Ceiling Installation"),
        _act("Carpentry Work"),
        _act("Modular Kitchen Installation"),
        _act("Wardrobe Installation"),
        _act("Interior Works"),
        _act("Cleaning & Site Finishing"),
      ],
    },
    {
      id: uid(), phaseName: "External Works", isCustom: false,
      activities: [
        _act("Compound Wall Construction"),
        _act("Gate Installation"), _act("Paving Work"),
        _act("Drainage Work"),
        _act("Septic Tank Construction"),
        _act("Sump Construction"),
        _act("Rainwater Harvesting"), _act("Landscaping"),
        _act("External Electrical Work"),
        _act("External Plumbing Work"),
      ],
    },
    {
      id: uid(), phaseName: "Material Master", isCustom: false,
      activities: [
        _act("Cement"), _act("Steel"), _act("Sand"),
        _act("Aggregate"), _act("Brick"), _act("Blocks"),
        _act("Jelly"), _act("Tiles"), _act("Paint"),
        _act("Putty"), _act("Primer"),
        _act("Electrical Materials"),
        _act("Plumbing Materials"), _act("Pipes"),
        _act("Sanitary Items"), _act("Doors"),
        _act("Windows"), _act("Glass"), _act("Granite"),
        _act("Marble"), _act("Waterproofing Materials"),
      ],
    },
    {
      id: uid(), phaseName: "Labour Master", isCustom: false,
      activities: [
        _act("Mason"), _act("Helper"), _act("Carpenter"),
        _act("Bar Bender"), _act("Electrician"),
        _act("Plumber"), _act("Painter"),
        _act("Tile Worker"), _act("Fabricator"),
        _act("Welder"), _act("False Ceiling Worker"),
        _act("Interior Worker"),
      ],
    },
    {
      id: uid(), phaseName: "Equipment Master", isCustom: false,
      activities: [
        _act("JCB"), _act("Tractor"),
        _act("Concrete Mixer"), _act("Vibrator"),
        _act("Plate Compactor"), _act("Monkey Rammer"),
        _act("Scaffolding"), _act("Cutting Machine"),
        _act("Welding Machine"), _act("Water Tanker"),
      ],
    },
  ];
}

export function mergePhasesWithDefaults(savedPhases = []) {
  const defaults = buildDefaultPhases();
  if (!savedPhases || savedPhases.length === 0) return defaults;

  const result = [];
  const processedSavedIds = new Set();

  defaults.forEach(defPhase => {
    const saved = savedPhases.find(
      sp => sp.id === defPhase.id || sp.phaseName.trim().toLowerCase() === defPhase.phaseName.trim().toLowerCase()
    );
    if (saved) {
      processedSavedIds.add(saved.id);
      const mergedActs = [...defPhase.activities];
      (saved.activities || []).forEach(sAct => {
        const existingIdx = mergedActs.findIndex(
          ma => ma.id === sAct.id || ma.name.trim().toLowerCase() === sAct.name.trim().toLowerCase()
        );
        if (existingIdx !== -1) {
          mergedActs[existingIdx] = { ...mergedActs[existingIdx], ...sAct };
        } else {
          mergedActs.push(sAct);
        }
      });
      result.push({ ...defPhase, ...saved, activities: mergedActs });
    } else {
      result.push(defPhase);
    }
  });

  savedPhases.forEach(sp => {
    if (!processedSavedIds.has(sp.id)) {
      const isAlreadyInResult = result.some(
        r => r.id === sp.id || r.phaseName.trim().toLowerCase() === sp.phaseName.trim().toLowerCase()
      );
      if (!isAlreadyInResult) {
        result.push(sp);
      }
    }
  });

  return result;
}

export function addCustomPhase(phases, phaseName) {
  return [...phases, {
    id: uid(), phaseName, isCustom: true, activities: [],
  }];
}

export function addActivityToPhase(phases, phaseId, activityName) {
  return phases.map(p => {
    if (p.id !== phaseId) return p;
    return {
      ...p,
      activities: [...p.activities, {
        id: uid(), name: activityName, isCustom: true,
        completed: false, completedAt: null,
        budgetMaterial: 0, budgetLabour: 0, budgetEquipment: 0,
        photos: [], notes: "",
      }],
    };
  });
}

export function isActivityCompleted(act, phase = null, project = null) {
  if (!act) return false;
  if (act.completed === true || act.completed === "true" || act.completed === 1) return true;
  if (act.isCompleted === true || act.isCompleted === "true" || act.isCompleted === 1) return true;
  const statusStr = String(act.status || "").toLowerCase().trim();
  if (statusStr === "completed" || statusStr === "done") return true;
  if (project) {
    const keys = project.completedActivityKeys || project.completedActivities || project.completed_activity_keys || [];
    if (Array.isArray(keys)) {
      if (keys.includes(act.id) || keys.includes(act.name)) return true;
      if (phase && (keys.includes(`${phase.phaseName}_${act.name}`) || keys.includes(`${phase.id}_${act.id}`))) return true;
    }
  }
  return false;
}

export function toggleActivity(phases, phaseId, activityId, project = null) {
  return phases.map(p => {
    if (p.id !== phaseId) return p;
    return {
      ...p,
      activities: (p.activities || []).map(a => {
        if (a.id === activityId) {
          const currentlyDone = isActivityCompleted(a, p, project);
          const nextDone = !currentlyDone;
          return {
            ...a,
            completed: nextDone,
            isCompleted: nextDone,
            status: nextDone ? "Completed" : "Pending",
            completedAt: nextDone ? (a.completedAt || new Date().toISOString()) : null,
          };
        }
        return a;
      }),
    };
  });
}

export function calcProgress(phases, project = null) {
  let total = 0;
  let completed = 0;
  (phases || []).forEach(p => {
    (p.activities || []).forEach(a => {
      total++;
      if (isActivityCompleted(a, p, project)) completed++;
    });
  });
  if (total === 0) {
    if (project && project.progress !== undefined && project.progress !== null) {
      return project.progress > 1 ? Math.round(project.progress) : Math.round(project.progress * 100);
    }
    return 0;
  }
  return Math.round((completed / total) * 100);
}

export function getPhaseProgress(phase, project = null) {
  const acts = phase?.activities || [];
  const total = acts.length;
  if (total === 0) return 0;
  const completed = acts.filter(a => isActivityCompleted(a, phase, project)).length;
  return Math.round((completed / total) * 100);
}

export const BUILDING_TYPES = [
  { main: "Residential", subs: ["Individual House", "Apartment / Flat", "Villa", "Row House", "Duplex", "Studio Apartment"] },
  { main: "Commercial", subs: ["Office Building", "Retail Store", "Shopping Mall", "Warehouse", "Hotel", "Restaurant"] },
  { main: "Industrial", subs: ["Factory", "Workshop", "Godown / Storage", "Plant Unit"] },
  { main: "Institutional", subs: ["School", "College", "Hospital", "Temple / Religious", "Community Hall"] },
  { main: "Educational", subs: ["Primary School", "High School", "College Building", "Training Center", "Library"] },
];

export const FLOOR_OPTIONS = [
  "Ground Floor", "First Floor", "Second Floor", "Third Floor",
  "Fourth Floor", "Fifth Floor", "Basement",
];

export const FEATURE_OPTIONS = [
  "Balcony", "Car Parking", "Lift", "Terrace Access", "Interior Work",
  "Compound Wall", "Parapet Wall", "Terrace Waterproofing", "Bathroom Waterproofing",
  "Wall Putty Work", "False Ceiling", "Modular Kitchen", "Wardrobe Work",
  "Sump", "Septic Tank", "Rainwater Harvesting", "Borewell",
  "Solar Provision", "Generator Provision", "CCTV Provision", "Intercom Provision",
  "Landscaping", "Paving Blocks", "Overhead Water Tank", "Underground Water Tank",
  "External Staircase", "Security Room", "Terrace Tile Work", "Exterior Cladding",
  "Elevation Work", "Gate Installation", "Grill Work", "Aluminium Work", "Glass Work",
];
