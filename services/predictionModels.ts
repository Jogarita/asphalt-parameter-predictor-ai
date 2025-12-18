
import { MixColumn, PredictionResult, MixProperty } from '../types';
import { SIEVES } from '../constants';

// --- Types ---
type Coefficients = Record<string, number>;

// --- Constants: Coefficients ---
// Extracted from 'Predicted_Measured VMA.xlsm'

const VMA_MODEL_1_COEFFS: Coefficients = {
    intercept: 0,
    sieve_2_36: 0.2158, // No.8
    new_ca_ratio: 2.32,
    new_fac_ratio: -1.55,
};

const VMA_MODEL_2_COEFFS: Coefficients = {
    intercept: 0.0282,
    sieve_12_5: 0.315, // 1/2 in
    sieve_9_5: -0.0271, // 3/8 in
    sieve_4_75: -0.0037, // No.4
    sieve_2_36: -0.044, // No.8
    sieve_1_18: 0.099, // No.16
    sieve_0_600: -0.324, // No.30
    sieve_0_300: 0.97, // No.50
    sieve_0_150: -0.43, // No.100
    sieve_0_075: -1.074, // No.200
    gsb: 87.7,
    faa: 0.135,
};

const VMA_MODEL_2_NO_FAA_COEFFS: Coefficients = {
    intercept: 0.026,
    sieve_12_5: 0.362,
    sieve_9_5: -0.0477,
    sieve_4_75: 0.0018,
    sieve_2_36: -0.041,
    sieve_1_18: 0.092,
    sieve_0_600: -0.308,
    sieve_0_300: 0.859,
    sieve_0_150: -0.297,
    sieve_0_075: -1.109,
    gsb: 86, // "Gsb: 86" from dump
};

const RUT_DEPTH_COEFFS: Coefficients = {
    intercept: -0.0091,
    sieve_12_5: 0.331,
    sieve_9_5: -0.326,
    sieve_4_75: 0.285,
    sieve_2_36: -0.174,
    sieve_1_18: -0.734,
    sieve_0_600: 1.709,
    sieve_0_300: -0.893,
    sieve_0_150: -0.212,
    sieve_0_075: -0.283,
    gsb: -52,
    faa: 0.58
};

const RUT_DEPTH_NO_FAA_COEFFS: Coefficients = {
    intercept: -0.0136,
    sieve_12_5: 0.603,
    sieve_9_5: -0.444,
    sieve_4_75: 0.378,
    sieve_2_36: -0.192,
    sieve_1_18: -0.989,
    sieve_0_600: 2.113,
    sieve_0_300: -1.37,
    sieve_0_150: 0.378,
    sieve_0_075: -0.668,
    gsb: -35.1
};

const CT_INDEX_COEFFS: Coefficients = {
    intercept: 0.04,
    sieve_12_5: 4.05,
    sieve_9_5: -4.66,
    sieve_4_75: 27.68,
    sieve_2_36: -43.12,
    sieve_1_18: 16.1,
    sieve_0_600: 12.33,
    sieve_0_300: -36.4,
    sieve_0_150: 36.3,
    sieve_0_075: -4.3,
    gsb: -2770,
    faa: 6.6
};

const CT_INDEX_NO_FAA_COEFFS: Coefficients = {
    intercept: 0.057,
    sieve_12_5: 3.33,
    sieve_9_5: -3.37,
    sieve_4_75: 26.23,
    sieve_2_36: -42.84,
    sieve_1_18: 18.06,
    sieve_0_600: 8.4,
    sieve_0_300: -35.2,
    sieve_0_150: 38.3,
    sieve_0_075: -4.8,
    gsb: -2384
};

const IFIT_COEFFS: Coefficients = {
    intercept: 0.016,
    sieve_12_5: 0.625,
    sieve_9_5: -0.431,
    sieve_4_75: 0.044,
    sieve_2_36: -0.985,
    sieve_1_18: -0.18,
    sieve_0_600: 3.22,
    sieve_0_300: -4.61,
    sieve_0_150: 4.34,
    sieve_0_075: -3.01,
    gsb: 44.6,
    faa: 0.03
};

const IFIT_NO_FAA_COEFFS: Coefficients = {
    intercept: 0.017,
    sieve_12_5: 0.637,
    sieve_9_5: -0.434,
    sieve_4_75: 0.049,
    sieve_2_36: -0.986,
    sieve_1_18: -0.2,
    sieve_0_600: 3.25,
    sieve_0_300: -4.64,
    sieve_0_150: 4.38,
    sieve_0_075: -3.04,
    gsb: 45.5
};

// --- Helper Functions ---

// --- Helper Functions ---

const getVal = (col: MixColumn, key: string): number => {
    const raw = col.values[key];
    if (raw === undefined || raw === '') return 0;
    const val = parseFloat(raw);
    return isNaN(val) ? 0 : val;
};

// HELPER: Compute Mean Column from multiple columns
const computeMeanColumn = (columns: MixColumn[]): MixColumn => {
    // We only care about numerical values 'sieve_*', 'gsb', 'faa'.
    // We'll create a dummy MixColumn with averaged values.
    const keys = Object.keys(columns[0].values);

    const averagedValues: Record<string, string> = {};

    // Collect all unique keys from all columns just in case
    const allKeys = new Set<string>();
    columns.forEach(c => Object.keys(c.values).forEach(k => allKeys.add(k)));

    allKeys.forEach(key => {
        let sum = 0;
        let count = 0;
        columns.forEach(col => {
            const v = parseFloat(col.values[key] || '0');
            if (!isNaN(v)) {
                sum += v;
                count++;
            }
        });
        if (count > 0) {
            averagedValues[key] = (sum / count).toString();
        }
    });

    return {
        id: 'mean_col',
        name: 'Mean',
        type: 'reference', // dummy
        isSelected: false,
        values: averagedValues
    };
};

/*
    HELPER: Create a "Deviation Column"
    Dev_i = Value_i - Mean_i
    
    Verified against User Excel Formula:
    =(($B$17+(D3-AVERAGE(B3:D3))*$B$18+...)*3+C14+B14)/2
    
    Mapping logic implemented below:
    - Target: D (Input Trial for Prediction)
    - Refs: B, C (Reference Trials)
    - Mean: AVERAGE(B3:D3) -> Average of Target + All Refs
    - Deviation (Delta): D3 - Mean
    - Input to Regression: Delta
    - Final Reconstruction: ( (Sum_Deltas_Weighted + Intercept) * N + Sum_Measured_Refs ) / (N - 1)
*/
const applyCenteredModel = (
    target: MixColumn,
    refs: MixColumn[],
    coeffs: Coefficients
): number => {
    const allCols = [...refs, target];

    // 1. Calculate Intercept (Linear Regression Intercept is constant)
    let result = coeffs.intercept || 0;

    // 2. Iterate over all coefficients to apply ( Val - Mean ) * Coeff
    Object.keys(coeffs).forEach(coeffKey => {
        if (coeffKey === 'intercept') return;

        const coeffVal = coeffs[coeffKey];
        if (!coeffVal) return;

        // Get values for this feature across all columns
        const values = allCols.map(col => {
            if (coeffKey === 'new_ca_ratio') return calculateCARatio(col);
            if (coeffKey === 'new_fac_ratio') return calculateFACRatio(col);
            return getVal(col, coeffKey);
        });

        const meanVal = values.reduce((a, b) => a + b, 0) / values.length;
        const targetVal = values[values.length - 1]; // Target is last

        const deviation = targetVal - meanVal;

        result += deviation * coeffVal;
    });

    return result;
};


// Calculate New CA Ratio: (P16 - P30) / (P8 - P16)
const calculateCARatio = (col: MixColumn): number => {
    const p16 = getVal(col, 'sieve_1_18');
    const p30 = getVal(col, 'sieve_0_600');
    const p8 = getVal(col, 'sieve_2_36');

    const numerator = p16 - p30;
    const denominator = p8 - p16;

    if (Math.abs(denominator) < 0.001) return 0; // Avoid division by zero
    return numerator / denominator;
};

// Calculate New FAC Ratio: P100 / P30
const calculateFACRatio = (col: MixColumn): number => {
    const p100 = getVal(col, 'sieve_0_150');
    const p30 = getVal(col, 'sieve_0_600');

    if (Math.abs(p30) < 0.001) return 0;
    return p100 / p30;
};

const IDENTITY_POWER = 0.45;
const IDENTITY_ANCHOR_SIZE = 19.0;

const isAboveIdentityLine = (col: MixColumn): boolean => {
    // Check all sieves > #200 (0.075mm)
    const sievesToCheck = SIEVES.filter(s => s.sizeMm > 0.075 && s.sizeMm < 25);

    return sievesToCheck.every(s => {
        const p = getVal(col, s.id);
        const pIdentity = 100 * Math.pow(s.sizeMm / IDENTITY_ANCHOR_SIZE, IDENTITY_POWER);
        return p >= pIdentity;
    });
};

/* 
    DEPRECATED: Simple applyModel for raw prediction.
    Kept if needed for un-referenced prediction, but user logic mandates centered approach.
*/
const applyModel = (col: MixColumn, coeffs: Coefficients): number => {
    let result = coeffs.intercept || 0;
    SIEVES.forEach(s => {
        if (coeffs[s.id] !== undefined) result += coeffs[s.id] * getVal(col, s.id);
    });
    if (coeffs.gsb) result += coeffs.gsb * getVal(col, 'gsb');
    if (coeffs.faa) result += coeffs.faa * getVal(col, 'faa');
    if (coeffs.new_ca_ratio) result += coeffs.new_ca_ratio * calculateCARatio(col);
    if (coeffs.new_fac_ratio) result += coeffs.new_fac_ratio * calculateFACRatio(col);
    return result;
};


// --- EXPORTED FUNCTIONS ---

export const getModelType = (grade: MixColumn, hasFaa: boolean): string => {
    if (isAboveIdentityLine(grade)) return 'VMA-First Model';
    return hasFaa ? 'VMA-Second Model' : 'VMA-Second Model (No FAA)';
};

export const runPrediction = (
    target: MixColumn,
    parameter: 'vma' | 'rutDepth' | 'ctIndex' | 'iFit',
    referenceColumns: MixColumn[] = [] // Optional references
): PredictionResult => {

    // 1. Determine Model Type based on Target characteristics
    const hasFaa = !!target.values['faa'] && target.values['faa'] !== '';
    let coeffs: Coefficients | null = null;
    let modelName = '';

    if (parameter === 'vma') {
        const isAbove = isAboveIdentityLine(target);
        if (isAbove) {
            modelName = 'VMA-First Model';
            coeffs = VMA_MODEL_1_COEFFS;
        } else {
            if (hasFaa) {
                modelName = 'VMA-Second Model';
                coeffs = VMA_MODEL_2_COEFFS;
            } else {
                modelName = 'VMA-Second Model (No FAA)';
                coeffs = VMA_MODEL_2_NO_FAA_COEFFS;
            }
        }
    } else if (parameter === 'rutDepth') {
        if (hasFaa) {
            modelName = 'Rut Depth';
            coeffs = RUT_DEPTH_COEFFS;
        } else {
            modelName = 'Rut Depth (No FAA)';
            coeffs = RUT_DEPTH_NO_FAA_COEFFS;
        }
    } else if (parameter === 'ctIndex') {
        if (hasFaa) {
            modelName = 'CTIndex';
            coeffs = CT_INDEX_COEFFS;
        } else {
            modelName = 'CTIndex (No FAA)';
            coeffs = CT_INDEX_NO_FAA_COEFFS;
        }
    } else if (parameter === 'iFit') {
        if (hasFaa) {
            modelName = 'IFIT';
            coeffs = IFIT_COEFFS;
        } else {
            modelName = 'IFIT (No FAA)';
            coeffs = IFIT_NO_FAA_COEFFS;
        }
    }

    if (!coeffs) throw new Error("No model found");

    // 2. Validation: Only require Gsb if the model actually uses it
    if (coeffs.gsb !== undefined) {
        const gsbValue = parseFloat(target.values['gsb'] || '0');
        if (!gsbValue || gsbValue <= 0) {
            throw new Error(`Target specific gravity (Gsb) is required for the ${modelName}.`);
        }
    }

    // 2. Perform Prediction
    let predictedVal = 0;

    // Filter valid references (must have the measured parameter value to be useful in the reconstruction formula)
    // Wait, the formula uses "AVERAGE(B3:D3)" for inputs. Inputs are always present (Gradations).
    // But the reconstruction "(RegOut * 3 + C14 + B14) / 2" uses Measured Outputs (C14, B14).
    // So we need references that have BOTH inputs and the measured Output.
    const validRefs = referenceColumns.filter(r => {
        const val = parseFloat(r.values[parameter] || '');
        return !isNaN(val);
    });

    if (validRefs.length === 0) {
        throw new Error(`Cannot predict: At least one Reference Trial with a measured ${parameter} is required.`);
    } else {
        // Implementation of User's Logic:
        // P_target = ( N * RegOut + Sum(P_ref) ) / (N - 1)

        const N = validRefs.length + 1; // Target + Valid Refs

        // Calculate RegOut using Centered Deviation Logic
        const regOut = applyCenteredModel(target, validRefs, coeffs);

        // Calculate Sum of Measured Reference Values
        const sumMeasured = validRefs.reduce((sum, r) => sum + getVal(r, parameter), 0);

        predictedVal = ((regOut * N) + sumMeasured) / (N - 1);
    }

    return {
        [parameter]: predictedVal,
        usedModel: modelName
    };
};
