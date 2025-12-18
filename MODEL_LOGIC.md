# Model Logic & Architecture

This document explains the prediction logic used in the Asphalt Parameter Predictor.

## Overview
The application uses a set of 10 statistical regression models extracted from empirical research. It employs a **"Centered Deviation"** approach where the regression model predicts the *deviation* from a local mean (established by provided Reference Trials) rather than predicting raw values directly.

## Model Selection Logic

### 1. VMA Prediction
The system checks the gradation shape relative to the **Maximum Density Line (Identity Line)** on a 0.45 Power Chart.
*   **Identity Line Check**: Checks if all sieves larger than #200 (0.075mm) are *above* the identity line defined by $P = 100 * (d/D)^{0.45}$.
    *   **Case A (Above Identity Line)**: Uses `VMA-First Model`.
        *   Inputs: Sieve #8, "New CA Ratio", "New FAC Ratio".
        *   Ratios are derived from specific sieve combinations ($P_{100}/P_{30}$ etc).
    *   **Case B (Below Identity Line)**: Uses `VMA-Second Model`.
        *   **Sub-case B1**: If FAA (Fine Aggregate Angularity) is provided, uses coefficients including FAA.
        *   **Sub-case B2**: If no FAA is provided, uses "No FAA" coefficients.

### 2. Performance Tests (Rut Depth, IDEAL-CT, I-FIT)
For these parameters, the model selection depends solely on data availability:
*   **Method A**: If FAA is provided, use the standard model.
*   **Method B**: If FAA is missing, use the "No FAA" model.

## Prediction Method: Centered Deviation

The application uses a specific reconstruction formula to align theoretical predictions with local lab data (References).

### Process
1.  **Valid References**: Identify all inputs (Target + References) and filter for References that have a *measured value* for the target parameter.
2.  **Global Mean**: Calculate the average of all input variables (Sieves, Gsb, FAA) across the Target and all Valid References.
3.  **Centered Regression**:
    *   Calculate the deviation of the Target's inputs from the Global Mean ($Value_{target} - Mean_{global}$).
    *   Apply the regression coefficients to these deviations.
    *   Add the Intercept.
    *   Result ($P_{reg}$) represents the *predicted deviation*.
4.  **Reconstruction**:
    The final value is reconstructed using the weighted regression output and the sum of measured reference values:
    
    $$P_{final} = \frac{(P_{reg} \times N) + \sum P_{measured\_refs}}{N - 1}$$
    
    *Where $N$ is the total count of trials (1 Target + $k$ References).*

This formula essentially uses the regression model to determine how far the Target *should* be from the group average, and centers that prediction around the actual average of the known reference data.

## Coefficient Source
All regression coefficients are hardcoded in `services/predictionModels.ts`. They were extracted from the project's source Excel file (`Predicted_Measured VMA.xlsm`).

### File Locations
*   **Logic Core**: `services/predictionModels.ts`
*   **Constants**: `constants.ts` (Sieve definitions, property limits)
*   **UI Components**: `components/MixMatrix.tsx` (Data Entry), `App.tsx` (Main Orchestration).
