import React, { useState } from 'react';
import { MixColumn } from '../types';
import { SIEVES } from '../constants';
import { optimizeGradation, OptimizationResult } from '../services/aiOptimizer';
import { Sparkles, Loader2, ArrowRight, Check, AlertCircle, RotateCcw } from 'lucide-react';

interface OptimizationPanelProps {
  columns: MixColumn[];
  onApplySuggestion: (gradation: Record<string, string>, predictedValue: number, paramId: string) => void;
}

const PARAM_OPTIONS = [
  { value: 'vma', label: 'VMA', unit: '%', dirLabel: 'Minimum', direction: '>=' },
  { value: 'ctIndex', label: 'IDEAL-CT', unit: '', dirLabel: 'Minimum', direction: '>=' },
  { value: 'iFit', label: 'FI', unit: '', dirLabel: 'Minimum', direction: '>=' },
  { value: 'rutDepth', label: 'Rut Depth', unit: 'mm', dirLabel: 'Maximum', direction: '<=' },
] as const;

type OptParam = typeof PARAM_OPTIONS[number]['value'];

const OptimizationPanel: React.FC<OptimizationPanelProps> = ({ columns, onApplySuggestion }) => {
  const [selectedParam, setSelectedParam] = useState<OptParam>('vma');
  const [threshold, setThreshold] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const trial1 = columns.find(c => c.type === 'reference' && c.isSelected);
  const paramOption = PARAM_OPTIONS.find(p => p.value === selectedParam)!;

  const handleOptimize = async () => {
    if (!trial1) {
      setError('No reference trial found. Enter Trial 1 data first.');
      return;
    }

    const thresholdNum = parseFloat(threshold);
    if (isNaN(thresholdNum)) {
      setError('Enter a valid threshold value.');
      return;
    }

    const measuredVal = trial1.values[selectedParam];
    if (!measuredVal || measuredVal.trim() === '') {
      setError(`Trial 1 must have a measured ${paramOption.label} value.`);
      return;
    }

    const hasGradation = SIEVES.some(s => {
      const v = trial1.values[s.id];
      return v !== undefined && v !== '';
    });
    if (!hasGradation) {
      setError('Trial 1 must have gradation values entered.');
      return;
    }

    setIsOptimizing(true);
    setError(null);
    setResult(null);
    setApplied(false);

    try {
      const optimResult = await optimizeGradation({
        trial1,
        targetParameter: selectedParam,
        threshold: thresholdNum,
      });
      setResult(optimResult);
      // Auto-apply the suggested gradation to the target column
      onApplySuggestion(optimResult.suggestedGradation, optimResult.predictedValue, selectedParam);
      setApplied(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Optimization failed.';
      setError(msg);
    } finally {
      setIsOptimizing(false);
    }
  };

  const meetsThreshold = result
    ? paramOption.direction === '>='
      ? result.predictedValue >= parseFloat(threshold)
      : result.predictedValue <= parseFloat(threshold)
    : false;

  const handleReset = () => {
    setResult(null);
    setError(null);
    setApplied(false);
  };

  return (
    <div className="bg-white border border-slate-300 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-violet-600" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-violet-900">AI Gradation Optimizer</h2>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">Powered by Claude</p>
          </div>
          {result && (
            <button
              onClick={handleReset}
              className="p-1.5 rounded-sm text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
              title="New optimization"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Show inputs only when no result */}
        {!result ? (
          <>
            {/* Parameter selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Target Parameter
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {PARAM_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSelectedParam(opt.value); setError(null); }}
                    disabled={isOptimizing}
                    className={`px-2 py-2 text-xs font-semibold rounded-sm border transition-all ${
                      selectedParam === opt.value
                        ? 'bg-violet-50 border-violet-300 text-violet-800 ring-1 ring-violet-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Threshold */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {paramOption.dirLabel} {paramOption.label}
              </label>
              <div className="flex gap-2 items-center">
                <span className="text-sm font-semibold text-slate-500 shrink-0">
                  {paramOption.direction === '>=' ? '\u2265' : '\u2264'}
                </span>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleOptimize(); }}
                  placeholder={selectedParam === 'vma' ? '14.0' : selectedParam === 'ctIndex' ? '80' : selectedParam === 'iFit' ? '8.0' : '5.0'}
                  disabled={isOptimizing}
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-violet-400 font-mono disabled:bg-slate-50"
                />
                {paramOption.unit && (
                  <span className="flex items-center text-xs text-slate-400 font-medium">
                    {paramOption.unit}
                  </span>
                )}
              </div>
            </div>

            {/* Optimize button */}
            <button
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold py-2.5 px-4 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide rounded-sm"
            >
              {isOptimizing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Optimize Gradation
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-sm">
                <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700 leading-relaxed">{error}</p>
              </div>
            )}
          </>
        ) : (
          /* Result view */
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Status badge */}
            <div className={`p-4 rounded-sm border-2 ${meetsThreshold ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-300 bg-amber-50/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Predicted {paramOption.label}
                </span>
                {meetsThreshold ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Check size={10} /> Threshold Met
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <AlertCircle size={10} /> Closest Result
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{result.predictedValue.toFixed(1)}</span>
                <span className="text-sm text-slate-400 font-medium">{paramOption.unit}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-slate-400">
                  Target: {paramOption.direction === '>=' ? '\u2265' : '\u2264'} {threshold}{paramOption.unit ? ` ${paramOption.unit}` : ''}
                </p>
                <span className="text-[9px] text-slate-300">|</span>
                <p className="text-[10px] text-slate-400">Model: {result.modelUsed}</p>
              </div>
            </div>

            {/* Explanation */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">AI Reasoning</p>
              <p className="text-xs text-slate-700 leading-relaxed">{result.explanation}</p>
            </div>

            {/* Applied confirmation */}
            {applied && (
              <div className="flex items-center gap-2 p-2.5 bg-violet-50 border border-violet-200 rounded-sm">
                <Check size={14} className="text-violet-600 shrink-0" />
                <p className="text-xs text-violet-700 font-medium">
                  Suggested gradation applied to the target trial column. You can review and edit the values in the matrix above.
                </p>
              </div>
            )}

            {/* Run new optimization */}
            <button
              onClick={handleReset}
              className="w-full border border-violet-300 text-violet-700 hover:bg-violet-50 font-semibold py-2 px-4 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wide rounded-sm"
            >
              <RotateCcw size={12} />
              New Optimization
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizationPanel;
