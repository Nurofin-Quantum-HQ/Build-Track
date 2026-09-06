export const MATERIAL_KEYWORDS = [
  'cement', 'sand', 'aggregate', 'bricks', 'brick', 'steel', 'saria', 'sariya',
  'pipes', 'pipe', 'pvc', 'cpvc', 'upvc', 'tiles', 'tile', 'marble', 'granite',
  'paint', 'primer', 'putty', 'plywood', 'ply', 'block', 'blocks',
  'wire', 'wires', 'cable', 'cables', 'switch', 'switches', 'socket', 'sockets',
  'mcb', 'mcb\'s', 'mcbs', 'db', 'distribution board', 'conduit', 'conduits',
  'junction box', 'junction boxes', 'gi', 'gi pipe', 'gi pipes', 'gi sheet',
  'gi sheet', 'scaffold', 'scaffolding', 'shuttering', 'shutter',
  'column', 'beam', 'slab', 'footing', 'foundation', 'rebar', 'reinforcement',
  'binding wire', 'cover block', 'cover blocks',
  'insulation', 'insulation sheet', 'foam', 'thermocol',
  'laminate', 'lamination', 'veneer',
  'adhesive', 'grout', 'sealant', 'silicone', 'epoxy',
  'borewell', 'bore', 'submersible', 'motor', 'pump',
  'fitting', 'fittings', 'coupling', 'couplings', 'elbow', 'elbows',
  'tee', 'tees', 'valve', 'valves', 'tap', 'taps', 'faucet', 'faucets',
  'crane', 'hoist', 'lift',
  'bar', 'bars', 'rod', 'rods', 'angle', 'angles', 'channel', 'channels',
  'beam', 'beams', 'column', 'columns',
  'sheet', 'sheets', 'plate', 'plates',
  'bolts', 'nut', 'nuts', 'washer', 'washers',
  'chemical', 'chemicals', 'admixture', 'admixtures',
  'waterproofing', 'waterproof', 'membrane', 'bitumen',
  'mortar', 'concrete', 'ready mix', 'rmc',
  'wood', 'timber', 'door', 'doors', 'window', 'windows',
  'glass', 'mirrors', 'mirror',
  'ac', 'ac unit', 'ac units', 'air conditioner',
  'geyser', 'heater', 'fan', 'fans', 'light', 'lights', 'led', 'leds',
  'bulb', 'bulbs', 'tube', 'tubes', 'tube light', 'tube lights',
  'inverter', 'battery', 'batteries', 'stabilizer',
  'solar', 'solar panel', 'solar panels',
  'upvc', 'aluminium', 'aluminum',
];

export const LABOUR_KEYWORDS = [
  'worker', 'workers', 'labour', 'labourer', 'labourers', 'manpower',
  'mason', 'masons', 'carpenter', 'carpenters', 'painter', 'painters',
  'plumber', 'plumbers', 'electrician', 'electricians',
  'helper', 'helpers', 'fitter', 'fitters', 'welder', 'welders',
  'bar bender', 'bar benders', 'tiler', 'tilers',
  'mazdoor', 'mazdoors', 'maistry', 'maistries', 'mistri', 'mistris',
  'contractor', 'contractors', 'sub contractor', 'sub contractors',
  'supervisor', 'supervisors', 'foreman', 'foremen',
  'daily wage', 'wages', 'salary', 'salaries',
  'advance', 'advance paid', 'balance',
  'day', 'days', 'hours', 'hrs',
  'night shift', 'overtime', 'ot',
  'skilled', 'unskilled', 'semi skilled',
  'rate', 'rate per day', 'per day',
];

export const EQUIPMENT_KEYWORDS = [
  'crane', 'excavator', 'bulldozer', 'backhoe', 'jcb', 'poclain',
  'tipper', 'tippers', 'truck', 'trucks', 'dumper', 'dumpers',
  'roller', 'rollers', 'compactor', 'compactors',
  'mixer', 'mixers', 'concrete mixer', 'concrete mixers',
  'pump', 'pumps', 'water pump', 'water pumps',
  'generator', 'genset', 'dg', 'dg set', 'dg sets',
  'compressor', 'compressors', 'air compressor', 'air compressors',
  'welding machine', 'welding machines',
  'drill', 'drills', 'drill machine', 'drill machines',
  'grinder', 'grinders', 'angle grinder', 'grinding machine',
  'cutter', 'cutters', 'cutting machine', 'cutting machines',
  'saw', 'saws', 'circular saw', 'hand saw',
  'hammer drill', 'jackhammer', 'breaker',
  'scaffolding', 'scaffold', 'ladder', 'ladders',
  'hoist', 'hoists', 'chain pulley', 'chain pulleys',
  'trolley', 'trolleys', 'wheelbarrow', 'wheelbarrows',
  'vibrator', 'vibrators', 'needle vibrator',
  'loader', 'loaders', 'forklift', 'forklifts',
  'diesel', 'petrol', 'fuel',
  'operator', 'operator with machine',
  'machine', 'machines', 'equipment',
  'rent', 'rental', 'hire', 'hiring',
  'hourly', 'daily', 'monthly',
];

export const ACTIVITY_KEYWORDS = [
  'foundation', 'footing', 'column', 'beam', 'slab',
  'brickwork', 'plastering', 'painting', 'plumbing', 'electrical',
  'roofing', 'flooring', 'tiling', 'carpentry', 'welding',
  'excavation', 'backfilling', 'compaction',
  'shuttering', 'de-shuttering', 'centering',
  'waterproofing', 'insulation',
  'finishing', 'fixing', 'installation',
  'dismantling', 'demolition', 'clearing',
  'loading', 'unloading', 'transport',
  'rebar', 'reinforcement', 'binding',
  'concreting', 'pouring', 'curing',
  'alignment', 'leveling', 'grading',
  'borewell', 'boring',
  'solar installation', 'ac installation',
  'door installation', 'window installation',
  'fitting', 'pipe fitting', 'electrical fitting',
];

export const FLOOR_KEYWORDS = [
  'floor', 'floors',
  'level', 'levels',
  'story', 'stories', 'storey', 'storeys',
  'basement',
  'ground floor', 'first floor', 'second floor', 'third floor',
  'fourth floor', 'fifth floor',
];

export const ENTRY_TYPES = [
  { id: 'material', label: 'Material', icon: 'Package', color: '#EA580C' },
  { id: 'labour',   label: 'Labour',   icon: 'Users',    color: '#F97316' },
  { id: 'equipment', label: 'Equipment', icon: 'Cog',     color: '#059669' },
];

export const PAYMENT_MODES = [
  'Cash', 'UPI', 'Bank Transfer', 'NEFT', 'RTGS', 'Cheque', 'Credit', 'Debit Card', 'Online',
];

export const GST_PERCENTAGES = [0, 5, 12, 18, 28];

export const ACTIVITY_OPTIONS = [
  'Foundation', 'Footing', 'Column', 'Beam', 'Slab',
  'Brickwork', 'Plastering', 'Painting', 'Plumbing', 'Electrical',
  'Roofing', 'Flooring', 'Tiling', 'Carpentry', 'Welding',
  'Excavation', 'Backfilling', 'Compaction',
  'Shuttering', 'De-shuttering', 'Centering',
  'Waterproofing', 'Insulation',
  'Finishing', 'Fixing', 'Installation',
  'Dismantling', 'Demolition', 'Clearing',
  'Loading', 'Unloading', 'Transport',
  'Rebar', 'Reinforcement', 'Binding',
  'Concreting', 'Pouring', 'Curing',
  'Alignment', 'Leveling', 'Grading',
  'Borewell', 'Boring',
  'Solar Installation', 'AC Installation',
  'Door Installation', 'Window Installation',
  'Fitting', 'Pipe Fitting', 'Electrical Fitting',
];

import { buildDefaultPhases } from './constructionPhases';

export const PHASE_OPTIONS = buildDefaultPhases().map(p => p.phaseName);
