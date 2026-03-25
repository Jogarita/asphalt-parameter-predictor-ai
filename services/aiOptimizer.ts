import { MixColumn } from '../types';
import { SIEVES } from '../constants';
import { runPrediction } from './predictionModels';

export interface OptimizationRequest {
  trial1: MixColumn;
  targetParameter: 'vma' | 'ctIndex' | 'iFit' | 'rutDepth';
  threshold: number;
}

// Direction is fixed per parameter: rutDepth uses <=, everything else uses >=
function getDirection(param: string): '>=' | '<=' {
  return param === 'rutDepth' ? '<=' : '>=';
}

export interface OptimizationResult {
  suggestedGradation: Record<string, string>;
  predictedValue: number;
  explanation: string;
  modelUsed: string;
}

const SIEVE_IDS = SIEVES.map(s => s.id);

function parseAIResponse(text: string): { gradation: Record<string, string>; explanation: string } {
  let jsonStr = text.trim();

  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

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

  for (let i = 1; i < SIEVE_IDS.length; i++) {
    const prevVal = parseFloat(fixed[SIEVE_IDS[i - 1]] || '100');
    const curVal = parseFloat(fixed[SIEVE_IDS[i]] || '0');
    if (curVal > prevVal) {
      fixed[SIEVE_IDS[i]] = prevVal.toFixed(1);
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

function buildTrial2AndPredict(
  fixedGradation: Record<string, string>,
  req: OptimizationRequest,
  hasFaa: boolean,
  faa: string | undefined
): { predictedValue: number; modelUsed: string } {
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

  if (hasFaa && faa) {
    trial2.values['faa'] = faa;
  }

  const ref: MixColumn = {
    ...req.trial1,
    type: 'reference',
    isSelected: true,
  };

  const prediction = runPrediction(trial2, req.targetParameter, [ref]);
  return {
    predictedValue: prediction[req.targetParameter] as number,
    modelUsed: prediction.usedModel || '',
  };
}

export async function optimizeGradation(req: OptimizationRequest): Promise<OptimizationResult> {
  const direction = getDirection(req.targetParameter);
  const maxAttempts = 5;
  const validResults: OptimizationResult[] = [];
  let closestMiss: OptimizationResult | null = null;
  let closestMissDistance = Infinity;

  const gsb = req.trial1.values['gsb'] || 'not provided';
  const faa = req.trial1.values['faa'];
  const hasFaa = faa !== undefined && faa !== '';
  const measuredParam = req.trial1.values[req.targetParameter];

  const trial1Values: Record<string, string> = {};
  for (const id of SIEVE_IDS) {
    trial1Values[id] = req.trial1.values[id] || '0';
  }

  // Track the last attempt's gradation and predicted value for iterative refinement
  let lastGradation: Record<string, string> | null = null;
  let lastPredicted: number | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let refinementNote = '';
    if (attempt > 0 && lastGradation && lastPredicted !== null) {
      const gap = req.threshold - lastPredicted;
      const absGap = Math.abs(gap).toFixed(1);
      const lastGradStr = SIEVE_IDS.map(id => `${id}: ${lastGradation![id] || '0'}`).join(', ');

      if (validResults.length > 0) {
        // Met threshold but want closer
        refinementNote = `\n\nPrevious attempt gradation: ${lastGradStr}\nPredicted value: ${lastPredicted.toFixed(1)} (threshold: ${direction} ${req.threshold}, currently ${absGap} above). Try to get CLOSER to ${req.threshold} with smaller adjustments from the previous gradation.`;
      } else {
        // Didn't meet threshold — be more aggressive
        refinementNote = `\n\nPrevious attempt gradation: ${lastGradStr}\nPredicted value: ${lastPredicted.toFixed(1)} — this is ${absGap} ${direction === '>=' ? 'below' : 'above'} the threshold of ${req.threshold}. You MUST adjust the gradation MORE AGGRESSIVELY. The gap is ${absGap}, so make larger changes to the high-sensitivity sieves to close this gap.`;
      }
    }

    const text = await callOptimizeAPI({
      trial1Values,
      gsb,
      faa,
      hasFaa,
      measuredParam,
      targetParameter: req.targetParameter,
      direction,
      threshold: req.threshold,
      refinementNote,
    });

    const { gradation, explanation } = parseAIResponse(text);
    const fixedGradation = validateAndFixGradation(gradation);
    lastGradation = fixedGradation;

    try {
      const { predictedValue, modelUsed } = buildTrial2AndPredict(fixedGradation, req, hasFaa, faa);
      lastPredicted = predictedValue;

      const meetsThreshold = direction === '>='
        ? predictedValue >= req.threshold
        : predictedValue <= req.threshold;

      const overshoot = direction === '>='
        ? predictedValue - req.threshold
        : req.threshold - predictedValue;

      if (meetsThreshold) {
        validResults.push({ suggestedGradation: fixedGradation, predictedValue, explanation, modelUsed });
      } else {
        const missDistance = Math.abs(overshoot);
        if (missDistance < closestMissDistance) {
          closestMissDistance = missDistance;
          closestMiss = { suggestedGradation: fixedGradation, predictedValue, explanation, modelUsed };
        }
      }

      // If we already have a result that meets threshold, stop early to save API calls
      // (unless first valid result overshoots a lot — try one more to refine)
      if (validResults.length >= 2) break;
    } catch {
      continue;
    }
  }

  // Pick the result closest to threshold among those that meet it
  if (validResults.length > 0) {
    validResults.sort((a, b) =>
      Math.abs(a.predictedValue - req.threshold) - Math.abs(b.predictedValue - req.threshold)
    );
    return validResults[0];
  }

  if (closestMiss) {
    return closestMiss;
  }

  throw new Error('Failed to generate a valid gradation after multiple attempts.');
}
