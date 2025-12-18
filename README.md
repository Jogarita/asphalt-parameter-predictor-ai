# Asphalt Parameter Predictor

An intelligent engineering tool for Asphalt Mix Design. This application predicts critical asphalt performance parameters based on gradation input and mix properties using advanced "Centered Deviation" regression modeling.

## Features
- **Partial Blind Prediction**: Predict parameters for a "Target" mix design based on known "Reference" trials.
- **Support for Key Parameters**:
  - **VMA**: Voids in Mineral Aggregate
  - **IDEAL-CT**: Cracking Tolerance Index
  - **Rut Depth**: Permanent Deformation (Hamburg Wheel Tracking)
  - **I-FIT**: Flexibility Index
- **Advanced Modeling**:
  - Auto-selects between 10 different regression models based on input characteristics (Gradation shape, FAA availability).
  - Uses Identity Line check (0.45 Power Chart) to classify gradation types.
  - **Centered Deviation Prediction**: Uses a sophisticated reconstruction formula that centers the model around the mean of your provided Reference Trials to ensure high local accuracy.
- **Interactive UI**:
  - Dynamic Mix Matrix input with conditional cell activation.
  - Real-time Gradation Chart visualization (0.45 Power Scale).

## Getting Started
1. **Add Reference Trials**: Click "Add Trial" to input your known lab mix designs (Gradation, Gsb, FAA, and measured properties).
    *   *Note: Only reference trials with a MEASURED value for the target parameter will be used in the calculation.*
2. **Define Target**: Edit the "Prediction Target" column with your proposed gradation.
3. **Select Parameter**: Choose which property you want to predict (VMA, Rut Depth, etc.).
4. **Analyze**: Click "Run Prediction". The app will use your reference data to center the model and predict the target's performance.

## Tech Stack
- React 19
- TypeScript
- Vite
- TailwindCSS
- Recharts
