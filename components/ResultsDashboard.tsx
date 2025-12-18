
import React from 'react';
import { PredictionResult } from '../types';
import { Loader2 } from 'lucide-react';

interface ResultsDashboardProps {
  result: PredictionResult | null;
  targetName: string;
  isLoading?: boolean;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ result, targetName, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-none text-center min-h-[360px] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-slate-50 opacity-50"></div>
        <div className="relative z-10 flex flex-col items-center gap-8">
          <div className="relative animate-pulse duration-[2s]">
            <img src="/omix_logo_rect.png" alt="OMIX" className="h-12 w-auto object-contain opacity-60" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="font-bold text-xs uppercase tracking-[0.2em] text-slate-400">Running Simulation</p>
            <p className="text-[10px] text-slate-300 font-medium italic">Calculating engine logic...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-none text-center min-h-[360px] flex flex-col items-center justify-center p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] opacity-20"></div>

        <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 relative z-10">No Results</h3>
        <p className="text-xs mt-2 text-slate-400 max-w-[200px] leading-relaxed relative z-10">
          Enter mix design data and click <span className="font-bold text-slate-500">Run Model</span>.
        </p>
      </div>
    );
  }

  // Helper to render result items
  const renderItem = (label: string, value: number | undefined, unit: string, isPrimary = false) => {
    if (value === undefined) return null;
    return (
      <div className={`
        relative overflow-hidden border transition-all duration-300 rounded-none
        ${isPrimary
          ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white shadow-md p-5'
          : 'bg-white border-slate-200 hover:border-orange-200 hover:shadow-sm p-4'
        }
      `}>
        <div className="flex flex-col gap-1 relative z-10">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isPrimary ? 'text-slate-400' : 'text-slate-500'}`}>
            {label}
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-3xl font-bold tracking-tight ${isPrimary ? 'text-white' : 'text-slate-900'}`}>
              {value.toFixed(2)}
            </span>
            <span className={`text-xs font-bold ${isPrimary ? 'text-slate-400' : 'text-slate-400'}`}>
              {unit}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-1 rounded-none border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-50/50 p-5 rounded-none border border-slate-100/50">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Prediction For</h3>
            <p className="text-lg font-bold text-slate-800 leading-tight">{targetName}</p>
          </div>
          {result.usedModel && (
            <div className="text-right">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Model Logic</span>
              <span className="inline-flex items-center px-2 py-1 rounded-none bg-white border border-slate-200 text-[10px] font-medium text-slate-600 shadow-sm">
                {result.usedModel}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {renderItem("Estimated VMA", result.vma, "%", true)}
          <div className="grid grid-cols-2 gap-3">
            {renderItem("Rut Depth", result.rutDepth, "mm")}
            {renderItem("IDEAL-CT", result.ctIndex, "")}
          </div>
          {result.iFit !== undefined && renderItem("Estimated I-FIT", result.iFit, "FI")}
        </div>

        {result.explanation && (
          <div className="mt-5 pt-4 border-t border-slate-200/60">
            <div className="flex gap-3">
              <div className="w-1 bg-orange-200 flex-shrink-0"></div>
              <p className="text-xs text-slate-500 leading-relaxed max-prose">
                <span className="font-bold text-slate-700 block mb-0.5">Analysis Note</span>
                {result.explanation}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsDashboard;
