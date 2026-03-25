import React, { useState } from 'react';
import { MixColumn } from '../types';
import { SIEVES } from '../constants';
import { optimizeGradation, OptimizationResult } from '../services/aiOptimizer';
import { Sparkles, Loader2, ArrowRight, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface OptimizationPanelProps {
  columns: MixColumn[];
  onApplySuggestion: (gradation: Record<string, string>) => void;
}

const PARAM_OPTIONS = [
  { value: 'vma', label: 'VMA', unit: '%', subLabel: 'Voids in Mineral Aggregate' },
  { value: 'ctIndex', label: 'CTIndex', unit: '', subLabel: 'Cracking Tolerance Index' },
  { value: 'iFit', label: 'FI', unit: '', subLabel: 'Flexibility Index' },
] as const;

type OptParam = typeof PARAM_OPTIONS[number]['value'];

const OptimizationPanel: React.FC<OptimizationPanelProps> = ({ columns, onApplySuggestion }) => {
  const [selectedParam, setSelectedParam] = useState<OptParam>('vma');
  const [threshold, setThreshold] = useState('');
  const [direction, setDirection] = useState<'>=' | '<='>('>=');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Get the first reference column with data as Trial 1
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

    // Validate Trial 1 has measured value for the parameter
    const measuredVal = trial1.values[selectedParam];
    if (!measuredVal || measuredVal.trim() === '') {
      setError(`Trial 1 must have a measured ${paramOption.label} value.`);
      return;
    }

    // Validate Trial 1 has gradation
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

    try {
      const optimResult = await optimizeGradation({
        trial1,
        targetParameter: selectedParam,
        threshold: thresholdNum,
        direction,
      });
      setResult(optimResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Optimization failed.';
      setError(msg);
    } finally {
      setIsOptimizing(false);
    }
  };

  const meetsThreshold = result
    ? direction === '>='
      ? result.predictedValue >= parseFloat(threshold)
      : result.predictedValue <= parseFloat(threshold)
    : false;

  return (
    <div className="bg-white border border-slate-300 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-600" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-violet-900">AI Gradation Optimizer</h2>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Powered by Claude</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Parameter selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Target Parameter
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {PARAM_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setSelectedParam(opt.value); setResult(null); }}
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
            Threshold
          </label>
          <div className="flex gap-2">
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as '>=' | '<=')}
              className="px-2 py-2 text-sm border border-slate-300 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
            >
              <option value=">=">&ge;</option>
              <option value="<=">&le;</option>
            </select>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={selectedParam === 'vma' ? '14.0' : selectedParam === 'ctIndex' ? '80' : '8.0'}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-violet-400 font-mono"
            />
            <span className="flex items-center text-xs text-slate-400 font-medium">
              {paramOption.unit}
            </span>
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

        {/* Results */}
        {result && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Predicted Value Card */}
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
              <p className="text-[10px] text-slate-400 mt-1">Model: {result.modelUsed}</p>
            </div>

            {/* Explanation */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">AI Reasoning</p>
              <p className="text-xs text-slate-700 leading-relaxed">{result.explanation}</p>
            </div>

            {/* Suggested Gradation Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm hover:bg-slate-100 transition-colors"
            >
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Suggested Gradation</span>
              {showDetails ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </button>

            {showDetails && (
              <div className="border border-slate-200 rounded-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]">Sieve</th>
                      <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider text-[10px]">Trial 1</th>
                      <th className="px-3 py-2 text-right font-bold text-violet-600 uppercase tracking-wider text-[10px]">Suggested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {SIEVES.map(sieve => {
                      const t1Val = trial1?.values[sieve.id] || '-';
                      const sugVal = result.suggestedGradation[sieve.id] || '-';
                      const diff = t1Val !== '-' && sugVal !== '-'
                        ? parseFloat(sugVal) - parseFloat(t1Val)
                        : 0;
                      return (
                        <tr key={sieve.id} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-medium text-slate-700">{sieve.label}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-500">{t1Val}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold text-violet-700">
                            {sugVal}
                            {diff !== 0 && (
                              <span className={`ml-1 text-[9px] ${diff > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                ({diff > 0 ? '+' : ''}{diff.toFixed(1)})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Apply button */}
            <button
              onClick={() => onApplySuggestion(result.suggestedGradation)}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-4 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide rounded-sm"
            >
              <Check size={14} />
              Apply to New Trial
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizationPanel;
