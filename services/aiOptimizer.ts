import Anthropic from '@anthropic-ai/sdk';
import { MixColumn } from '../types';
import { SIEVES } from '../constants';
import { runPrediction } from './predictionModels';

export interface OptimizationRequest {
  trial1: MixColumn;
  targetParameter: 'vma' | 'ctIndex' | 'iFit';
  threshold: number;
  direction: '>=' | '<=';
  apiKey: string;
}

export interface OptimizationResult {
  suggestedGradation: Record<string, string>;
  predictedValue: number;
  explanation: string;
  modelUsed: string;
}

const SIEVE_IDS = SIEVES.map(s => s.id);

const PARAM_LABELS: Record<string, string> = {
  vma: 'VMA (%)',
  ctIndex: 'CTIndex',
  iFit: 'Flexibility Index (FI)',
};

function buildSystemPrompt(): string {
  return `You are an asphalt mix design optimization agent. You modify sieve gradation values to achieve a target performance parameter using regression models.

## REGRESSION MODELS

The app uses "Centered Deviation" regression. The prediction formula is:
P_final = ((intercept + Σ(dev_i × coeff_i)) × N + Σ(measured_refs)) / (N - 1)
where dev_i = target_value_i - mean_value_i across all trials, N = number of trials.

When there is 1 reference (Trial 1 with measured value) and 1 target (Trial 2):
- N = 2
- mean_i = (trial1_value_i + trial2_value_i) / 2
- dev_i = trial2_value_i - mean_i = (trial2_value_i - trial1_value_i) / 2
- P_final = ((intercept + Σ(dev_i × coeff_i)) × 2 + measured_ref) / 1
- P_final = 2 × (intercept + Σ((trial2_i - trial1_i)/2 × coeff_i)) + measured_ref

### VMA Models

**VMA Model 1** (used when gradation is ABOVE the Maximum Density Line on 0.45 power chart):
- Inputs: sieve_2_36 (No.8), new_ca_ratio = (P16-P30)/(P8-P16), new_fac_ratio = P100/P30
- Coefficients: intercept=0, sieve_2_36=0.2158, new_ca_ratio=2.32, new_fac_ratio=-1.55

**VMA Model 2** (below MDL, with FAA):
- Coefficients: intercept=0.0282, sieve_12_5=0.315, sieve_9_5=-0.0271, sieve_4_75=-0.0037, sieve_2_36=-0.044, sieve_1_18=0.099, sieve_0_600=-0.324, sieve_0_300=0.97, sieve_0_150=-0.43, sieve_0_075=-1.074, gsb=87.7, faa=0.135

**VMA Model 2 No FAA**:
- Coefficients: intercept=0.026, sieve_12_5=0.362, sieve_9_5=-0.0477, sieve_4_75=0.0018, sieve_2_36=-0.041, sieve_1_18=0.092, sieve_0_600=-0.308, sieve_0_300=0.859, sieve_0_150=-0.297, sieve_0_075=-1.109, gsb=86

### Identity Line Check (determines VMA Model 1 vs 2)
For each sieve (excluding 19.0mm anchor and 0.075mm), check if % passing >= 100 × (sizeMm/19.0)^0.45. If ALL sieves are above → Model 1; otherwise → Model 2.

### CTIndex Models

**CTIndex (with FAA)**: intercept=0.04, sieve_12_5=4.05, sieve_9_5=-4.66, sieve_4_75=27.68, sieve_2_36=-43.12, sieve_1_18=16.1, sieve_0_600=16.5, sieve_0_300=-32.2, sieve_0_150=29.1, sieve_0_075=-17, gsb=3050, faa=-15.22

**CTIndex No FAA**: intercept=-0.13, sieve_12_5=-1.9, sieve_9_5=-3.18, sieve_4_75=29.73, sieve_2_36=-47.35, sieve_1_18=26.1, sieve_0_600=2.3, sieve_0_300=-16, sieve_0_150=10.3, sieve_0_075=-6.7, gsb=2726

### I-FIT (FI) Models

**IFIT (with FAA)**: intercept=0.016, sieve_12_5=0.625, sieve_9_5=-0.431, sieve_4_75=0.044, sieve_2_36=-0.985, sieve_1_18=-0.18, sieve_0_600=3.22, sieve_0_300=-4.61, sieve_0_150=4.34, sieve_0_075=-3.01, gsb=44.6, faa=0.03

**IFIT No FAA**: intercept=0.017, sieve_12_5=0.637, sieve_9_5=-0.434, sieve_4_75=0.049, sieve_2_36=-0.986, sieve_1_18=-0.2, sieve_0_600=3.25, sieve_0_300=-4.64, sieve_0_150=4.38, sieve_0_075=-3.04, gsb=45.5

## CONSTRAINTS FOR GRADATION
1. Values must be monotonically non-increasing (coarse to fine): sieve_19_0 >= sieve_12_5 >= ... >= sieve_0_075
2. sieve_19_0 is typically 100 (keep it at 100)
3. All values are "% passing" between 0 and 100
4. Keep Gsb the same as Trial 1 (do not change it)
5. Keep FAA the same as Trial 1 if provided (do not change it)
6. Changes should be realistic — avoid extreme jumps from Trial 1 values. Adjustments of 1-5% per sieve are typical.

## RESPONSE FORMAT
You MUST respond with ONLY a valid JSON object (no markdown, no backticks, no explanation outside JSON):
{
  "sieve_19_0": "100",
  "sieve_12_5": "<value>",
  "sieve_9_5": "<value>",
  "sieve_4_75": "<value>",
  "sieve_2_36": "<value>",
  "sieve_1_18": "<value>",
  "sieve_0_600": "<value>",
  "sieve_0_300": "<value>",
  "sieve_0_150": "<value>",
  "sieve_0_075": "<value>",
  "explanation": "<2-3 sentences explaining the logic behind the gradation changes>"
}

All sieve values must be numbers as strings (e.g. "45.2"). The explanation should be concise — describe which sieves were adjusted and why based on the coefficient sensitivities.`;
}

function buildUserPrompt(req: OptimizationRequest): string {
  const trial1Values = SIEVE_IDS.map(id => `${id}: ${req.trial1.values[id] || '0'}`).join('\n');
  const gsb = req.trial1.values['gsb'] || 'not provided';
  const faa = req.trial1.values['faa'];
  const hasFaa = faa !== undefined && faa !== '';
  const measuredParam = req.trial1.values[req.targetParameter];

  return `Trial 1 gradation (reference):
${trial1Values}
Gsb: ${gsb}
${hasFaa ? `FAA: ${faa}` : 'FAA: not provided'}
Measured ${PARAM_LABELS[req.targetParameter]} for Trial 1: ${measuredParam || 'not provided'}

Target: Find a gradation for Trial 2 where the predicted ${PARAM_LABELS[req.targetParameter]} is ${req.direction} ${req.threshold}.

Use the regression model coefficients to reason about which sieve values to adjust. Consider the sign and magnitude of each coefficient to determine the direction and size of changes needed. The prediction uses Trial 1 as the reference with its measured value, so the predicted value for Trial 2 depends on the deviation between Trial 2 and Trial 1 gradation values.

Return the optimized Trial 2 gradation as JSON.`;
}

function parseAIResponse(text: string): { gradation: Record<string, string>; explanation: string } {
  // Try to extract JSON from the response
  let jsonStr = text.trim();

  // Remove markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);
  const explanation = parsed.explanation || '';

  const gradation: Record<string, string> = {};
  for (const id of SIEVE_IDS) {
    if (parsed[id] !== undefined) {
      gradation[id] = String(parsed[id]);
    }
  }

  return { gradation, explanation };
}

function validateAndFixGradation(gradation: Record<string, string>): Record<string, string> {
  // Ensure monotonically non-increasing
  const fixed = { ...gradation };
  fixed['sieve_19_0'] = '100';

  const orderedIds = SIEVE_IDS; // Already ordered coarsest to finest
  for (let i = 1; i < orderedIds.length; i++) {
    const prevVal = parseFloat(fixed[orderedIds[i - 1]] || '100');
    const curVal = parseFloat(fixed[orderedIds[i]] || '0');
    if (curVal > prevVal) {
      fixed[orderedIds[i]] = prevVal.toFixed(1);
    }
  }

  return fixed;
}

export async function optimizeGradation(req: OptimizationRequest): Promise<OptimizationResult> {
  const client = new Anthropic({ apiKey: req.apiKey, dangerouslyAllowBrowser: true });

  const maxAttempts = 3;
  let bestResult: OptimizationResult | null = null;
  let bestDistance = Infinity;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const refinementNote = attempt > 0 && bestResult
      ? `\n\nPrevious attempt produced a predicted value of ${bestResult.predictedValue.toFixed(1)}. This ${req.direction === '>=' ? 'did not reach' : 'exceeded'} the threshold of ${req.threshold}. Please adjust the gradation more aggressively in the right direction.`
      : '';

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildSystemPrompt(),
      messages: [
        { role: 'user', content: buildUserPrompt(req) + refinementNote }
      ],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from AI');
    }

    const { gradation, explanation } = parseAIResponse(textBlock.text);
    const fixedGradation = validateAndFixGradation(gradation);

    // Build a Trial 2 MixColumn and run the actual prediction model
    const trial2: MixColumn = {
      id: 'ai_trial_2',
      name: 'AI Suggested',
      type: 'target',
      isSelected: true,
      values: {
        ...fixedGradation,
        gsb: req.trial1.values['gsb'] || '',
      },
    };

    // Copy FAA if present
    if (req.trial1.values['faa'] !== undefined && req.trial1.values['faa'] !== '') {
      trial2.values['faa'] = req.trial1.values['faa'];
    }

    // Run actual prediction using the app's model
    const ref: MixColumn = {
      ...req.trial1,
      type: 'reference',
      isSelected: true,
    };

    try {
      const prediction = runPrediction(trial2, req.targetParameter, [ref]);
      const predictedValue = prediction[req.targetParameter] as number;
      const modelUsed = prediction.usedModel || '';

      const meetsThreshold = req.direction === '>='
        ? predictedValue >= req.threshold
        : predictedValue <= req.threshold;

      const distance = req.direction === '>='
        ? req.threshold - predictedValue
        : predictedValue - req.threshold;

      if (meetsThreshold) {
        return {
          suggestedGradation: fixedGradation,
          predictedValue,
          explanation,
          modelUsed,
        };
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        bestResult = {
          suggestedGradation: fixedGradation,
          predictedValue,
          explanation,
          modelUsed,
        };
      }
    } catch {
      // If prediction fails, continue to next attempt
      continue;
    }
  }

  // Return best attempt even if threshold wasn't met
  if (bestResult) {
    return bestResult;
  }

  throw new Error('Failed to generate a valid gradation after multiple attempts.');
}
