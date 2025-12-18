
import React, { useState, useRef } from 'react';
import { INITIAL_COLUMNS, SIEVES, PROPERTIES } from './constants';
import { MixColumn, PredictionResult } from './types';
import MixMatrix from './components/MixMatrix';
import GradationChart from './components/GradationChart';
import ResultsDashboard from './components/ResultsDashboard';
import { runPrediction } from './services/predictionModels';
import InfoModal from './components/InfoModal';
import Toast from './components/Toast';
import { Calculator, ArrowRight, Loader2, Share2, Save, Menu, Info, Table, FolderUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import PremiumSelect from './components/PremiumSelect';

const App: React.FC = () => {
  const [columns, setColumns] = useState<MixColumn[]>(INITIAL_COLUMNS);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<PredictionResult | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  // New State for Parameter Selection
  const [targetParam, setTargetParam] = useState<'vma' | 'rutDepth' | 'ctIndex' | 'iFit'>('vma');

  const targetCol = columns.find((c) => c.type === 'target');

  const handleUpdateValue = (colId: string, rowId: string, value: string | undefined) => {
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id !== colId) return col;
        if (rowId === 'name' && value !== undefined) return { ...col, name: value };

        // Create new values object
        const newValues = { ...col.values };
        if (value === undefined) {
          delete newValues[rowId];
        } else {
          newValues[rowId] = value;
        }

        return {
          ...col,
          values: newValues,
        };
      })
    );
  };

  const handleBulkUpdate = (colId: string, updates: Record<string, string>) => {
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id !== colId) return col;
        return {
          ...col,
          values: { ...col.values, ...updates },
        };
      })
    );
  };

  const handleToggleColumn = (colId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === colId ? { ...col, isSelected: !col.isSelected } : col
      )
    );
  };

  const handleAddColumn = () => {
    const newId = `design_${Date.now()}`;
    const newCol: MixColumn = {
      id: newId,
      name: `Lab Trial ${columns.length}`,
      type: 'reference',
      isSelected: true,
      values: {},
    };

    // Insert before the Target column (which is usually last)
    const targetIndex = columns.findIndex(c => c.type === 'target');
    const newColumns = [...columns];
    if (targetIndex !== -1) {
      newColumns.splice(targetIndex, 0, newCol);
    } else {
      newColumns.push(newCol);
    }
    setColumns(newColumns);
  };

  const handleRemoveColumn = (colId: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== colId));
  };

  const handlePromoteTarget = () => {
    setColumns((prev) => {
      // Find current target
      const targetIdx = prev.findIndex(c => c.type === 'target');
      if (targetIdx === -1) return prev; // Should not happen

      const oldTarget = prev[targetIdx];

      // Convert to Reference
      const promotedCol: MixColumn = {
        ...oldTarget,
        id: `trial_${Date.now()}`, // Unique ID
        type: 'reference',
        name: `${oldTarget.name} (Verified)`, // Suffix to indicate change
        isSelected: true,
        values: {
          ...oldTarget.values,
          // Store the predicted value separately so we can display it alongside the input for "Measured"
          [`${targetParam}_predicted`]: oldTarget.values[targetParam]
        }
      };

      // Create New Target
      const newTarget: MixColumn = {
        ...oldTarget, // Copy properties to keep user context if desired
        id: `target_${Date.now()}`,
        type: 'target',
        name: 'New Prediction Target',
        isSelected: true,
        // Deep copy values to avoid ref issues
        values: { ...oldTarget.values }
      };

      // Remove old target, Insert Promoted, Insert New Target
      const newCols = [...prev];
      newCols.splice(targetIdx, 1, promotedCol, newTarget);

      return newCols;
    });

    setNotification({ message: "Target saved as Reference Trial. Please verify measured values.", type: 'success' });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setNotification({ message: 'Link copied to clipboard', type: 'success' });
  };

  const handleSave = async () => {
    try {
      const suggestedName = "asphalt_prediction_data.json";
      const dataStr = JSON.stringify(columns, null, 2);

      // Try File System Access API
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: suggestedName,
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(dataStr);
        await writable.close();
        setNotification({ message: 'Project saved successfully', type: 'success' });
      } else {
        // Fallback
        const fileName = window.prompt("Enter file name:", suggestedName);
        if (!fileName) return; // User cancelled

        const finalName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", finalName);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        URL.revokeObjectURL(url);
        setNotification({ message: 'Project saved successfully', type: 'success' });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') { // Don't show error if user cancelled picker
        console.error(err);
        setNotification({ message: 'Failed to save project', type: 'error' });
      }
    }
  };

  // Hidden input ref for loading
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Basic Validation
        if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].id || !parsed[0].type) {
          throw new Error("Invalid format");
        }

        setColumns(parsed);
        setNotification({ message: 'Project loaded successfully', type: 'success' });
      } catch (err) {
        console.error(err);
        setNotification({ message: 'Invalid project file', type: 'error' });
      } finally {
        // Reset input so same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExportExcel = () => {
    // 1. Prepare Header Row
    const headerRow = ["Design Parameter", "Unit", ...columns.map(c => c.name)];

    // 2. Prepare Data Rows
    const rows: (string | number)[][] = [];

    // Gradation Section
    rows.push(["Gradation (% Passing)", "", ...columns.map(() => "")]);

    SIEVES.forEach(sieve => {
      const row = [
        sieve.label,
        "%",
        ...columns.map(col => col.values[sieve.id] || "")
      ];
      rows.push(row);
    });

    // Spacer
    rows.push(["", "", ...columns.map(() => "")]);

    // Properties Section
    rows.push(["Volumetrics & Performance", "", ...columns.map(() => "")]);

    PROPERTIES.forEach(prop => {
      const row = [
        prop.label,
        prop.unit || "",
        ...columns.map(col => col.values[prop.id] || "")
      ];
      rows.push(row);
    });

    // 3. Create Workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...rows]);

    // Set column widths
    const wscols = [
      { wch: 35 }, // Parameter name
      { wch: 10 }, // Unit
      ...columns.map(() => ({ wch: 20 })) // Data cols
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Mix Matrix");
    XLSX.writeFile(wb, "Asphalt_Mix_Matrix.xlsx");
    setNotification({ message: 'Exported to Excel successfully', type: 'success' });
  };

  const handlePredict = async () => {
    if (!targetCol) return;

    setIsPredicting(true);
    setNotification(null);
    setLastPrediction(null);

    try {
      // simulate delay for UX
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Collect valid reference columns (must be Type=Reference AND Selected)
      const refCols = columns.filter(c => c.type === 'reference' && c.isSelected);

      // 1. Predict Target using Centered Deviation Logic (if references exist)
      // The model uses deviations from the Global Mean (Target + References) to predict deviation of the parameter.
      const targetResult = runPrediction(targetCol, targetParam, refCols);
      let rawPrediction = targetResult[targetParam] as number;

      const finalResult: PredictionResult = {
        ...targetResult,
        [targetParam]: rawPrediction,
        explanation: `Prediction based on ${targetResult.usedModel}. Using ${refCols.length} reference trial(s) for centering calibration.`
      };

      // Update the Target Column
      setColumns((prev) =>
        prev.map((col) => {
          if (col.type !== 'target') return col;
          return {
            ...col,
            values: {
              ...col.values,
              [targetParam]: rawPrediction.toFixed(1),
            },
          };
        })
      );
      setLastPrediction(finalResult);
      setNotification({ message: "Prediction complete!", type: 'success' });

    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Prediction failed. Check inputs.";
      setNotification({ message: errMsg, type: 'error' });
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-slate-900">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />
      {/* Header */}
      <header className="bg-white border-b border-slate-300 sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6 h-auto md:h-20 flex flex-col md:flex-row items-center justify-between py-4 md:py-0 gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-center md:text-left">
            <h1 className="font-bold text-lg md:text-xl tracking-tight text-slate-900 leading-none">Asphalt Parameter Predictor</h1>
            <div className="hidden md:block h-6 w-px bg-slate-300"></div>
            <p className="text-[10px] md:text-sm text-slate-500 font-mono font-medium">Predict VMA, IDEAL-CT, Rut Depth, I-FIT</p>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {/* Standard App Toolkit */}
            <button
              onClick={() => setIsInfoOpen(true)}
              className="p-1.5 md:p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-orange-600 transition-colors"
              title="How it Works"
            >
              <Info size={18} className="md:w-5 md:h-5" />
            </button>
            <div className="h-6 w-px bg-slate-300 mx-1"></div>

            <button
              onClick={handleLoadClick}
              className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors"
              title="Load Project (JSON)"
            >
              <FolderUp size={20} />
            </button>

            <button
              onClick={handleSave}
              className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-orange-600 transition-colors"
              title="Save Project (JSON)"
            >
              <Save size={20} />
            </button>

            <button
              onClick={handleExportExcel}
              className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-green-600 transition-colors"
              title="Export to Excel"
            >
              <Table size={20} />
            </button>

            <div className="h-6 w-px bg-slate-300 mx-1"></div>

            <button
              onClick={handleShare}
              className="p-1.5 md:p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-orange-600 transition-colors"
              title="Share Project"
            >
              <Share2 size={18} className="md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1800px] mx-auto w-full p-3 md:p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch overflow-x-hidden">

        {/* Left Column: Data Matrix */}
        <div className="xl:col-span-8 flex flex-col h-full min-w-0">
          <div className="flex-1 flex flex-col">
            <MixMatrix
              columns={columns}
              onUpdateValue={handleUpdateValue}
              onBulkUpdate={handleBulkUpdate}
              onPromoteTarget={handlePromoteTarget}
              onToggleColumn={handleToggleColumn}
              onAddColumn={handleAddColumn}
              onRemoveColumn={handleRemoveColumn}
            />
          </div>
        </div>

        {/* Right Column: Dashboard & Controls */}
        <div className="xl:col-span-4 flex flex-col gap-4 md:gap-6 xl:sticky xl:top-20">

          {/* 1. Action Card */}
          <div className="bg-white p-4 border border-slate-300">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Calculator size={16} className="text-orange-600" />
                Control Panel
              </h2>
            </div>



            <div className="mb-4">
              <PremiumSelect
                label="Target Parameter"
                value={targetParam}
                onChange={(val) => setTargetParam(val as any)}
                options={[
                  { value: 'vma', label: 'VMA', subLabel: 'Voids in Mineral Aggregate (%)' },
                  { value: 'ctIndex', label: 'IDEAL-CT', subLabel: 'Cracking Tolerance Index' },
                  { value: 'rutDepth', label: 'Rut Depth', subLabel: 'Hamburg Wheel Test (mm)' },
                  { value: 'iFit', label: 'I-FIT', subLabel: 'Flexibility Index' },
                ]}
              />
            </div>

            <button
              onClick={handlePredict}
              disabled={isPredicting}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white font-bold py-2 px-4 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide rounded-sm"
            >
              {isPredicting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Run Model
                  <ArrowRight size={16} />
                </>
              )}
            </button>

          </div>

          {/* 2. Results Dashboard */}
          <ResultsDashboard
            result={lastPrediction}
            targetName={targetCol?.name || "Target Design"}
            isLoading={isPredicting}
          />

          {/* 3. Visualization */}
          <GradationChart columns={columns} />

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4">
        <div className="w-full flex items-center justify-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Powered by</span>
          <img src="/omix_logo_rect.png" alt="OMIX" className="h-10 w-auto object-contain" />
        </div>
      </footer>

      {/* Logic Modal */}
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />

      {/* Notifications */}
      {notification && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default App;