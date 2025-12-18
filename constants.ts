import { Sieve, MixProperty, MixColumn } from './types';

export const SIEVES: Sieve[] = [
  { id: 'sieve_25_0', label: '25.0 mm (1")', sizeMm: 25.0 },
  { id: 'sieve_19_0', label: '19.0 mm (3/4")', sizeMm: 19.0 },
  { id: 'sieve_12_5', label: '12.5 mm (1/2")', sizeMm: 12.5 },
  { id: 'sieve_9_5', label: '9.5 mm (3/8")', sizeMm: 9.5 },
  { id: 'sieve_4_75', label: '4.75 mm (#4)', sizeMm: 4.75 },
  { id: 'sieve_2_36', label: '2.36 mm (#8)', sizeMm: 2.36 },
  { id: 'sieve_1_18', label: '1.18 mm (#16)', sizeMm: 1.18 },
  { id: 'sieve_0_600', label: '0.600 mm (#30)', sizeMm: 0.6 },
  { id: 'sieve_0_300', label: '0.300 mm (#50)', sizeMm: 0.3 },
  { id: 'sieve_0_150', label: '0.150 mm (#100)', sizeMm: 0.15 },
  { id: 'sieve_0_075', label: '0.075 mm (#200)', sizeMm: 0.075 },
];

export const PROPERTIES: MixProperty[] = [
  {
    id: 'gsb',
    label: 'Gsb (Bulk Specific Gravity)',
    isInput: true,
    description: 'Bulk Specific Gravity of the combined aggregate. A critical input for volumetric calculations.'
  },
  {
    id: 'faa',
    label: 'FAA (Fine Agg. Angularity)',
    isInput: true,
    isOptional: true,
    description: 'Fine Aggregate Angularity. Measures the un-compacted void content of fine aggregate, affecting stability and workability.'
  },

  // Outputs
  {
    id: 'vma',
    label: 'VMA (%)',
    isInput: false,
    unit: '%',
    description: 'Voids in Mineral Aggregate. The volume of inter-granular void space between the aggregate particles of a compacted paving mixture.'
  },
  {
    id: 'ctIndex',
    label: 'IDEAL-CT (Index)',
    isInput: false,
    description: 'Cracking Tolerance Index (ASTM D8225). An index parameter used to evaluate the cracking resistance of asphalt mixtures at intermediate temperatures.'
  },
  {
    id: 'rutDepth',
    label: 'Rut Depth (mm)',
    isInput: false,
    unit: 'mm',
    description: 'Predicted rut depth from Hamburg Wheel Tracking Test (AASHTO T324). Indicates resistance to permanent deformation.'
  },
  {
    id: 'iFit',
    label: 'I-FIT (FI)',
    isInput: false,
    description: 'Flexibility Index from Illinois Flexibility Index Test (AASHTO TP124). A measure of the fracture resistance of asphalt mixtures.'
  },
];

export const INITIAL_COLUMNS: MixColumn[] = [
  {
    id: 'design_1',
    name: 'Lab Trial 1',
    type: 'reference',
    isSelected: true,
    values: {
      sieve_25_0: '100',
      sieve_19_0: '98',
      sieve_12_5: '88',
      sieve_9_5: '75',
      sieve_4_75: '52',
      sieve_2_36: '34',
      sieve_1_18: '24',
      sieve_0_600: '16',
      sieve_0_300: '10',
      sieve_0_150: '6',
      sieve_0_075: '4.2',
      gsb: '2.650',
      faa: '44.5',
      vma: '14.2'
    },
  },
  {
    id: 'target_1',
    name: 'Prediction Target',
    type: 'target',
    isSelected: true,
    values: {
      sieve_25_0: '100',
      sieve_19_0: '99',
      sieve_12_5: '90',
      sieve_9_5: '78',
      sieve_4_75: '55',
      sieve_2_36: '36',
      sieve_1_18: '25',
      sieve_0_600: '17',
      sieve_0_300: '11',
      sieve_0_150: '7',
      sieve_0_075: '5.0',
      gsb: '2.650',
      faa: '44.5',
      vma: '',
      ctIndex: '',
      rutDepth: '',
      iFit: ''
    },
  },
];
