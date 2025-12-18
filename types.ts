export interface Sieve {
  id: string;
  label: string;
  sizeMm: number;
}

export interface MixProperty {
  id: string;
  label: string;
  unit?: string;
  isInput: boolean; // True if input for prediction, False if output (predicted)
  isOptional?: boolean; // True if the model can run without it (or uses a different model)
  description?: string;
}

export interface MixColumn {
  id: string;
  name: string;
  type: 'reference' | 'target';
  isSelected: boolean; // If true, used in model training/prediction context
  values: { [key: string]: string | undefined }; // Storing as strings to handle partial inputs/decimals easily
}

export interface PredictionResult {
  vma?: number;
  ctIndex?: number;
  rutDepth?: number;
  iFit?: number;
  usedModel?: string; // For debugging/explanation
  explanation?: string;
}
