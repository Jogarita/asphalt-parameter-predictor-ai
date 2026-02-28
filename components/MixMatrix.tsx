import React from 'react';
import { MixColumn } from '../types';
import { SIEVES, PROPERTIES } from '../constants';
import { Trash2, Plus } from 'lucide-react';

interface MixMatrixProps {
  columns: MixColumn[];
  targetParam: 'vma' | 'rutDepth' | 'ctIndex' | 'iFit';
  onUpdateValue: (colId: string, rowId: string, value: string | undefined) => void;
  onBulkUpdate: (colId: string, updates: Record<string, string>) => void;
  onToggleColumn: (colId: string) => void;
  onAddColumn: () => void;
  onRemoveColumn: (colId: string) => void;
}

const MixMatrix: React.FC<MixMatrixProps> = ({
  columns,
  targetParam,
  onUpdateValue,
  onBulkUpdate,
  onToggleColumn,
  onAddColumn,
  onRemoveColumn,
}) => {

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, colId: string, startSieveId: string) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    if (!text) return;

    const rows = text.split(/\r?\n/).map(row => row.trim()).filter(row => row !== '');
    if (rows.length === 0) return;

    // Find starting index
    const startIndex = SIEVES.findIndex(s => s.id === startSieveId);
    if (startIndex === -1) return;

    const updates: Record<string, string> = {};

    rows.forEach((val, i) => {
      const sieveIndex = startIndex + i;
      if (sieveIndex < SIEVES.length) {
        const sieveId = SIEVES[sieveIndex].id;
        // Basic number cleaning
        const cleanVal = val.split('\t')[0].trim();
        if (cleanVal && !isNaN(parseFloat(cleanVal))) {
          updates[sieveId] = cleanVal;
        }
      }
    });

    if (Object.keys(updates).length > 0) {
      onBulkUpdate(colId, updates);
    }
  };

  return (
    <div className="border border-slate-300 bg-white flex flex-col h-full shadow-sm">
      {/* Mobile Scroll Hint */}
      <div className="md:hidden bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex justify-between items-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mix Data Matrix</span>
        <span className="text-[9px] text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
          Scroll horizontally →
        </span>
      </div>
      {/* Table Header Wrapper to handle horizontal scroll */}
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full h-full text-base text-left border-collapse">
          <thead className="bg-slate-100 text-slate-800 font-semibold sticky top-0 z-30 shadow-[0_1px_0_0_rgba(203,213,225,1)]">
            {/* Group header row */}
            <tr>
              <th className="w-[200px] min-w-[200px] max-w-[200px] sticky left-0 bg-slate-100 border-r border-slate-300 z-40" rowSpan={2}>
                <div className="p-2.5 text-sm font-bold uppercase tracking-widest text-slate-700">
                  Design Parameter
                </div>
              </th>
              {columns.filter(c => c.type === 'reference').length > 0 && (
                <th
                  colSpan={columns.filter(c => c.type === 'reference').length}
                  className="px-3 py-1.5 text-center border-r border-slate-300 border-b border-b-slate-200 bg-slate-50"
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Existing Mix Designs</span>
                </th>
              )}
              {columns.some(c => c.type === 'target') && (
                <th className="px-3 py-1.5 text-center border-r border-slate-300 border-b border-b-orange-200 bg-orange-50/60">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-500">New Trial Design</span>
                </th>
              )}
              <th className="w-[120px] min-w-[120px] border-r border-slate-300 bg-slate-50/50" rowSpan={2}>
                <div className="p-3">
                  <button
                    onClick={onAddColumn}
                    className="w-full flex items-center justify-center gap-1 text-slate-400 hover:text-blue-700 text-[10px] font-bold uppercase tracking-wide bg-transparent hover:bg-blue-50 py-1.5 rounded-sm border border-dashed border-slate-300 hover:border-blue-200 transition-all opacity-60 hover:opacity-100"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
              </th>
            </tr>
            {/* Individual column headers */}
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={`p-2 min-w-[120px] border-r border-slate-300 last:border-r-0 ${col.type === 'target' ? 'bg-orange-50/50 text-orange-900 ring-inset ring-2 ring-orange-200' : ''
                    }`}
                >
                  <div className="flex flex-col gap-2">
                    {col.type === 'reference' ? (
                      <>
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-500 opacity-90">
                            Trial
                          </span>
                          {columns.filter(c => c.type === 'reference').length > 1 && (
                            <button
                              onClick={() => onRemoveColumn(col.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                              title="Remove Design"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => onUpdateValue(col.id, 'name', e.target.value)}
                          className="bg-transparent font-bold text-base focus:outline-none border-b border-transparent focus:border-orange-400 w-full"
                        />
                        <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={col.isSelected}
                            onChange={() => onToggleColumn(col.id)}
                            className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 rounded-none bg-white"
                          />
                          <span className="text-xs font-normal text-slate-500">Include in Model</span>
                        </label>
                      </>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-widest text-orange-500 opacity-90 py-1">
                        To Predict
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {/* Section: Gradation */}
            <tr className="bg-slate-50 h-[48px]">
              <td className="p-0 text-sm font-bold uppercase tracking-widest text-slate-600 sticky left-0 bg-slate-50 border-r border-b border-slate-300 z-20">
                <div className="flex items-center h-full px-2 pl-2">
                  Gradation (% Passing)
                </div>
              </td>
              <td colSpan={columns.length + 1} className="border-b border-slate-300"></td>
            </tr>

            {SIEVES.map((sieve) => (
              <tr key={sieve.id} className="hover:bg-slate-50 transition-colors group h-[48px]">
                <td className="p-0 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-b border-slate-300/50 z-20">
                  <div className="flex items-center h-full px-3 py-1 font-medium text-slate-700 text-xs">
                    {sieve.label}
                  </div>
                </td>
                {columns.map((col) => (
                  <td
                    key={`${col.id}-${sieve.id}`}
                    className={`p-0 border-r border-b border-slate-300/50 ${col.type === 'target' ? 'bg-orange-50/20' : ''
                      }`}
                  >
                    <input
                      type="number"
                      value={col.values[sieve.id] || ''}
                      onChange={(e) => onUpdateValue(col.id, sieve.id, e.target.value)}
                      onPaste={(e) => handlePaste(e, col.id, sieve.id)}
                      className={`w-full h-full py-1.5 px-2 text-right bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-inset font-mono text-base tabular-nums text-slate-900 placeholder-slate-200 ${col.type === 'target' ? 'focus:ring-orange-500' : 'focus:ring-blue-500'
                        }`}
                      placeholder="-"
                    />
                  </td>
                ))}
                <td className="border-r border-b border-slate-300/50 bg-slate-50/30"></td>
              </tr>
            ))}

            {/* Section: Properties */}
            <tr className="bg-slate-50 border-t border-slate-300 h-[48px]">
              <td className="p-0 text-sm font-bold uppercase tracking-widest text-slate-600 sticky left-0 bg-slate-50 border-r border-b border-slate-300 z-20">
                <div className="flex items-center h-full px-2 pl-2">
                  Volumetrics & Performance
                </div>
              </td>
              <td colSpan={columns.length + 1} className="border-b border-slate-300"></td>
            </tr>

            {/* Properties rows: input fields (Gsb, FAA) and the selected output parameter.
                Output parameters that aren't the current prediction target are hidden entirely
                so the matrix only shows what's relevant. Optional fields (FAA, reference
                measured values) show a toggle — the cell starts empty with a "+" button;
                clicking it activates the input. */}
            {PROPERTIES.filter((prop) => prop.isInput || prop.id === targetParam).map((prop) => (
              <tr key={prop.id} className="hover:bg-slate-50 transition-colors group h-[44px]">
                <td className="p-0 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-b border-slate-300/50 z-20">
                  <div className="flex items-center gap-1.5 h-full px-3 py-1 font-medium text-slate-700 text-xs">
                    <span>{prop.label}</span>
                    {prop.id === 'gsb' && (
                      <span className="text-[9px] bg-red-50 border border-red-200 text-red-500 px-1.5 py-0.5 rounded-full font-semibold leading-none">Required</span>
                    )}
                    {prop.isOptional && (
                      <span className="text-[9px] bg-blue-50 border border-blue-200 text-blue-500 px-1.5 py-0.5 rounded-full font-semibold leading-none">Optional</span>
                    )}
                  </div>
                </td>
                {columns.map((col) => {
                  const isOutputProperty = !prop.isInput;
                  const isPredicted = col.predictedKeys?.has(prop.id) ?? false;

                  // Optional Properties Logic
                  const isOptionalProp = prop.id === 'faa' || (col.type === 'reference' && isOutputProperty && prop.id === targetParam);
                  const canToggle = isOptionalProp && (col.type === 'reference' || prop.isInput);
                  const isActive = col.values[prop.id] !== undefined;

                  return (
                    <td
                      key={`${col.id}-${prop.id}`}
                      className={`p-0 border-r border-b border-slate-300/50 h-[36px] ${col.type === 'target' && isOutputProperty ? 'bg-orange-50/20' : ''
                        }`}
                    >
                      <div className="relative h-full flex items-center justify-center">
                        {canToggle && !isActive ? (
                          <button
                            onClick={() => onUpdateValue(col.id, prop.id, '')}
                            className="text-slate-300 hover:text-blue-600 w-full h-full flex flex-col items-center justify-center transition-colors hover:bg-slate-50 gap-0.5"
                            title="Add Value"
                          >
                            <Plus size={12} className="opacity-50" />
                            <span className="text-[8px] opacity-40 leading-none">Tap to add</span>
                          </button>
                        ) : (
                          <>
                            {isPredicted && (
                              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[7px] font-bold uppercase tracking-wider text-orange-400 leading-none pointer-events-none">
                                Pred.
                              </span>
                            )}
                            <input
                              type="number"
                              value={col.values[prop.id] || ''}
                              onChange={(e) => onUpdateValue(col.id, prop.id, e.target.value)}
                              className={`w-full h-full py-1.5 px-2 text-right bg-transparent focus:outline-none rounded-none font-mono text-sm tabular-nums
                                            ${isPredicted
                                  ? 'text-orange-600 font-bold'
                                  : 'text-slate-900'
                                } focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-500`}
                              placeholder="-"
                            />

                            {canToggle && (
                              <button
                                onClick={() => onUpdateValue(col.id, prop.id, undefined)}
                                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 hover:opacity-100 text-slate-300 hover:text-red-400 p-1 bg-white/80 rounded transition-opacity"
                                title="Remove value"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="border-r border-b border-slate-300/50 bg-slate-50/30"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MixMatrix;
