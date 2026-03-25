import { MixColumn } from '../types';
import { SIEVES } from '../constants';
import { runPrediction } from './predictionModels';

export interface OptimizationRequest {
  trial1: MixColumn;
  targetParameter: 'vma' | 'ctIndex' | 'iFit';
  threshold: number;
  direction: '>=' | '<=';
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

function parseAIResponse(text: string): { gradation: Record<string, string>; explanation: string } {
  let jsonStr = text.trim();

  // Remove markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Extract JSON object if surrounded by other text
  const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonObjMatch) {
    jsonStr = jsonObjMatch[0];
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
  const fixed = { ...gradation };
  fixed['sieve_19_0'] = '100';

  const orderedIds = SIEVE_IDS;
  for (let i = 1; i < orderedIds.length; i++) {
    const prevVal = parseFloat(fixed[orderedIds[i - 1]] || '100');
    const curVal = parseFloat(fixed[orderedIds[i]] || '0');
    if (curVal > prevVal) {
      fixed[orderedIds[i]] = prevVal.toFixed(1);
    }
  }

  return fixed;
}

async function callOptimizeAPI(body: Record<string, unknown>): Promise<string> {
  const res = await fetch('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Server error' }));
    throw new Error(err.error || `API error: ${res.status}`);
  }

  const data = await res.json();
  return data.text;
}

export async function optimizeGradation(req: OptimizationRequest): Promise<OptimizationResult> {
  const maxAttempts = 3;
  let bestResult: OptimizationResult | null = null;
  let bestDistance = Infinity;

  const gsb = req.trial1.values['gsb'] || 'not provided';
  const faa = req.trial1.values['faa'];
  const hasFaa = faa !== undefined && faa !== '';
  const measuredParam = req.trial1.values[req.targetParameter];

  const trial1Values: Record<string, string> = {};
  for (const id of SIEVE_IDS) {
    trial1Values[id] = req.trial1.values[id] || '0';
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const refinementNote = attempt > 0 && bestResult
      ? `\n\nPrevious attempt produced a predicted value of ${bestResult.predictedValue.toFixed(1)}. This ${req.direction === '>=' ? 'did not reach' : 'exceeded'} the threshold of ${req.threshold}. Please adjust the gradation more aggressively in the right direction.`
      : '';

    const text = await callOptimizeAPI({
      trial1Values,
      gsb,
      faa,
      hasFaa,
      measuredParam,
      targetParameter: req.targetParameter,
      direction: req.direction,
      threshold: req.threshold,
      refinementNote,
    });

    const { gradation, explanation } = parseAIResponse(text);
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

    if (hasFaa) {
      trial2.values['faa'] = faa!;
    }

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
        return { suggestedGradation: fixedGradation, predictedValue, explanation, modelUsed };
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        bestResult = { suggestedGradation: fixedGradation, predictedValue, explanation, modelUsed };
      }
    } catch {
      continue;
    }
  }

  if (bestResult) {
    return bestResult;
  }

  throw new Error('Failed to generate a valid gradation after multiple attempts.');
}
