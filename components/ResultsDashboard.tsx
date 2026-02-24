
import React from 'react';
import { PredictionResult } from '../types';
import { Loader2 } from 'lucide-react';

interface ResultsDashboardProps {
  result: PredictionResult | null;
  targetName: string;
  isLoading?: boolean;
  expanded?: boolean;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ result, targetName, isLoading, expanded }) => {
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
          ? `bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white shadow-md ${expanded ? 'p-8' : 'p-5'}`
          : `bg-white border-slate-200 hover:border-orange-200 hover:shadow-sm ${expanded ? 'p-6' : 'p-4'}`
        }
      `}>
        <div className="flex flex-col gap-1 relative z-10">
          <span className={`font-bold uppercase tracking-widest ${isPrimary ? 'text-slate-400' : 'text-slate-500'} ${expanded ? 'text-xs' : 'text-[10px]'}`}>
            {label}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`font-bold tracking-tight ${isPrimary ? 'text-white' : 'text-slate-900'} ${expanded ? 'text-5xl' : 'text-3xl'}`}>
              {value.toFixed(1)}
            </span>
            <span className={`font-bold ${isPrimary ? 'text-slate-400' : 'text-slate-400'} ${expanded ? 'text-sm' : 'text-xs'}`}>
              {unit}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-none border border-slate-200 shadow-sm ${expanded ? '' : 'p-1 animate-in fade-in slide-in-from-bottom-4 duration-500'}`}>
      <div className={`bg-slate-50/50 rounded-none border border-slate-100/50 ${expanded ? 'p-8' : 'p-5'}`}>
        <div className={`flex items-start justify-between ${expanded ? 'mb-8' : 'mb-6'}`}>
          <div>
            <h3 className={`font-bold uppercase tracking-widest text-slate-400 mb-1 ${expanded ? 'text-xs' : 'text-[10px]'}`}>Prediction For</h3>
            <p className={`font-bold text-slate-800 leading-tight ${expanded ? 'text-2xl' : 'text-lg'}`}>{targetName}</p>
          </div>
          {result.usedModel && (
            <div className="text-right">
              <span className={`font-bold uppercase tracking-wider text-slate-400 block mb-1 ${expanded ? 'text-[10px]' : 'text-[9px]'}`}>Model Used</span>
              <span className={`inline-flex items-center rounded-none bg-white border border-slate-200 font-medium text-slate-600 shadow-sm ${expanded ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[10px]'}`}>
                {result.usedModel}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {renderItem("Estimated VMA", result.vma, "%", true)}
          {renderItem("CTIndex", result.ctIndex, "")}
          {renderItem("FI", result.iFit, "")}
          {renderItem("Rut Depth", result.rutDepth, "mm")}
        </div>

      </div>
    </div>
  );
};

export default ResultsDashboard;
