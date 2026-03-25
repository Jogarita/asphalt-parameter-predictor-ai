import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const SIEVE_IDS = [
  'sieve_19_0', 'sieve_12_5', 'sieve_9_5', 'sieve_4_75', 'sieve_2_36',
  'sieve_1_18', 'sieve_0_600', 'sieve_0_300', 'sieve_0_150', 'sieve_0_075',
];

const PARAM_LABELS: Record<string, string> = {
  vma: 'VMA (%)',
  ctIndex: 'CTIndex',
  iFit: 'Flexibility Index (FI)',
  rutDepth: 'Rut Depth (mm)',
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

### Rut Depth Models

**Rut Depth (with FAA)**: intercept=-0.0091, sieve_12_5=0.331, sieve_9_5=-0.326, sieve_4_75=0.285, sieve_2_36=-0.174, sieve_1_18=-0.734, sieve_0_600=1.709, sieve_0_300=-0.893, sieve_0_150=-0.212, sieve_0_075=-0.283, gsb=-52, faa=0.58

**Rut Depth No FAA**: intercept=-0.0136, sieve_12_5=0.603, sieve_9_5=-0.444, sieve_4_75=0.378, sieve_2_36=-0.192, sieve_1_18=-0.989, sieve_0_600=2.113, sieve_0_300=-1.37, sieve_0_150=0.378, sieve_0_075=-0.668, gsb=-35.1

## OPTIMIZATION STRATEGY
CRITICAL: The predicted value MUST meet the threshold. This is the primary objective.
- For VMA, CTIndex, and FI: predicted value MUST be >= threshold. Overshoot is acceptable — failing to meet threshold is NOT.
- For Rut Depth: predicted value MUST be <= threshold. Undershoot is acceptable — exceeding threshold is NOT.
- If the threshold is far from Trial 1's measured value, make AGGRESSIVE changes (5-15% per sieve on high-sensitivity sieves). Do not hold back.
- Use coefficient magnitudes to prioritize: sieves with larger absolute coefficients have more impact. Focus adjustments there.

## CONSTRAINTS FOR GRADATION
1. Values must be monotonically non-increasing (coarse to fine): sieve_19_0 >= sieve_12_5 >= ... >= sieve_0_075
2. sieve_19_0 is typically 100 (keep it at 100)
3. All values are "% passing" between 0 and 100
4. Keep Gsb the same as Trial 1 (do not change it)
5. Keep FAA the same as Trial 1 if provided (do not change it)
6. Adjustments can be 1-15% per sieve depending on how far the threshold is from the current value. Larger gaps require larger changes.

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

function buildUserPrompt(body: any): string {
  const { trial1Values, gsb, faa, hasFaa, measuredParam, targetParameter, direction, threshold, refinementNote } = body;

  const trial1Str = SIEVE_IDS.map(id => `${id}: ${trial1Values[id] || '0'}`).join('\n');

  return `Trial 1 gradation (reference):
${trial1Str}
Gsb: ${gsb}
${hasFaa ? `FAA: ${faa}` : 'FAA: not provided'}
Measured ${PARAM_LABELS[targetParameter]} for Trial 1: ${measuredParam || 'not provided'}

Target: Find a gradation for Trial 2 where the predicted ${PARAM_LABELS[targetParameter]} is ${direction} ${threshold}.
${direction === '>=' ? `The predicted value should be as CLOSE to ${threshold} as possible while being >= ${threshold}. Do not overshoot significantly.` : `The predicted value should be as CLOSE to ${threshold} as possible while being <= ${threshold}. Do not undershoot significantly.`}

Use the regression model coefficients to reason about which sieve values to adjust. Consider the sign and magnitude of each coefficient to determine the direction and size of changes needed. The prediction uses Trial 1 as the reference with its measured value, so the predicted value for Trial 2 depends on the deviation between Trial 2 and Trial 1 gradation values.

Return the optimized Trial 2 gradation as JSON.${refinementNote || ''}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  try {
    const client = new Anthropic({ apiKey });
    const body = req.body;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: buildSystemPrompt(),
      messages: [
        { role: 'user', content: buildUserPrompt(body) },
        { role: 'assistant', content: '{' }
      ],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return res.status(500).json({ error: 'No text response from AI' });
    }

    // Prepend '{' since we used it as assistant prefill to force JSON output
    return res.status(200).json({ text: '{' + textBlock.text });
  } catch (err: any) {
    console.error('Optimization API error:', err);
    return res.status(500).json({ error: err.message || 'AI optimization failed' });
  }
}
