import { Sieve, MixProperty, MixColumn } from './types';

// Standard sieve sizes used in asphalt gradation analysis (ASTM C136).
// Listed coarsest to finest. Values in the data represent "% passing" each sieve.
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

// Mix design properties — inputs and predicted outputs.
// Inputs: Gsb (aggregate bulk specific gravity) and FAA (fine aggregate angularity) describe the aggregate.
// Outputs: VMA, CTIndex, FI, and Rut Depth are performance parameters predicted by the regression models.
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
    label: 'CTIndex',
    isInput: false,
    description: 'Cracking Tolerance Index (ASTM D8225). An index parameter used to evaluate the cracking resistance of asphalt mixtures at intermediate temperatures.'
  },
  {
    id: 'iFit',
    label: 'FI',
    isInput: false,
    description: 'Flexibility Index from Illinois Flexibility Index Test (AASHTO TP124). A measure of the fracture resistance of asphalt mixtures.'
  },
  {
    id: 'rutDepth',
    label: 'Rut Depth (mm)',
    isInput: false,
    unit: 'mm',
    description: 'Predicted rut depth from Hamburg Wheel Tracking Test (AASHTO T324). Indicates resistance to permanent deformation.'
  },
];

// Sample starter data: one reference trial with measured VMA and one target trial to predict.
// Both gradations plot above the 0.45 power identity line, so VMA Model 1 applies and Gsb is
// not needed. Gsb and FAA are intentionally left blank to show they are not always required.
export const INITIAL_COLUMNS: MixColumn[] = [
  {
    id: 'design_1',
    name: 'Trial 1',
    type: 'reference',
    isSelected: true,
    values: {
      sieve_25_0: '100',
      sieve_19_0: '100',
      sieve_12_5: '95',
      sieve_9_5: '85',
      sieve_4_75: '62',
      sieve_2_36: '45',
      sieve_1_18: '33',
      sieve_0_600: '24',
      sieve_0_300: '17',
      sieve_0_150: '12',
      sieve_0_075: '8.5',
      vma: '15.8'
    },
  },
  {
    id: 'target_1',
    name: 'Trial 2',
    type: 'target',
    isSelected: true,
    values: {
      sieve_25_0: '100',
      sieve_19_0: '100',
      sieve_12_5: '93',
      sieve_9_5: '83',
      sieve_4_75: '60',
      sieve_2_36: '43',
      sieve_1_18: '32',
      sieve_0_600: '23',
      sieve_0_300: '16',
      sieve_0_150: '12',
      sieve_0_075: '8.8',
      vma: '',
      ctIndex: '',
      rutDepth: '',
      iFit: ''
    },
  },
];
