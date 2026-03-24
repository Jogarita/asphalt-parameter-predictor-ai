/**
 * App.tsx — Main orchestrator for the Asphalt Parameter Predictor.
 *
 * Manages the central application state (`columns: MixColumn[]`) and coordinates
 * all top-level operations:
 *   - User input flows through MixMatrix into columns state
 *   - handlePredict() dispatches to runPrediction() in predictionModels.ts
 *   - Prediction results are written back into the target column and displayed
 *     by ResultsDashboard
 *   - File I/O: JSON save/load for session persistence, Excel export via xlsx
 */
import React, { useState, useRef } from 'react';
import { INITIAL_COLUMNS, SIEVES, PROPERTIES } from './constants';
import { MixColumn, PredictionResult } from './types';
import MixMatrix from './components/MixMatrix';
import GradationChart from './components/GradationChart';
import ResultsDashboard from './components/ResultsDashboard';
import { runPrediction, validateGradation } from './services/predictionModels';
import InfoModal from './components/InfoModal';
import Toast from './components/Toast';
import { Calculator, ArrowRight, Loader2, Share2, Save, RotateCcw, Info, Table, FolderUp, Maximize2, X, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import PremiumSelect from './components/PremiumSelect';
import OptimizationPanel from './components/OptimizationPanel';

const cloneColumns = (source: MixColumn[]): MixColumn[] =>
  source.map((col) => ({ ...col, values: { ...col.values }, predictedKeys: col.predictedKeys ? new Set(col.predictedKeys) : undefined }));

// Serialize columns for JSON save — convert Set to array
const serializeColumns = (cols: MixColumn[]): string =>
  JSON.stringify(cols.map(col => ({
    ...col,
    predictedKeys: col.predictedKeys?.size ? Array.from(col.predictedKeys) : undefined,
  })), null, 2);

// Restore predictedKeys from array back to Set when loading
const deserializeColumns = (parsed: any[]): MixColumn[] =>
  parsed.map(col => ({
    ...col,
    predictedKeys: col.predictedKeys ? new Set(col.predictedKeys) : undefined,
  }));

const App: React.FC = () => {
  const [columns, setColumns] = useState<MixColumn[]>(() => cloneColumns(INITIAL_COLUMNS));
  const [isPredicting, setIsPredicting] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<PredictionResult | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'error' | 'success' } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<'chart' | 'results' | null>(null);

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

        // Clear predicted flag when the user manually edits a value
        let predicted = col.predictedKeys;
        if (predicted && predicted.has(rowId)) {
          predicted = new Set(predicted);
          predicted.delete(rowId);
        }

        return {
          ...col,
          values: newValues,
          predictedKeys: predicted,
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
    // Demote the previous target to a reference with the next available trial number
    setColumns((prev) => {
      const refNumbers = new Set(prev.filter(c => c.type === 'reference').map(col => {
        const match = col.name.match(/trial\s+(\d+)/i);
        return match ? parseInt(match[1], 10) : NaN;
      }).filter(n => !isNaN(n)));
      let nextTrialNumber = 1;
      while (refNumbers.has(nextTrialNumber)) nextTrialNumber++;

      const newId = `design_${Date.now()}`;
      const newCol: MixColumn = {
        id: newId,
        name: 'New Trial',
        type: 'target',
        isSelected: true,
        values: {},
      };

      return [
        ...prev.map((col) =>
          col.type === 'target' ? { ...col, type: 'reference' as const, name: `Trial ${nextTrialNumber}` } : col
        ),
        newCol,
      ];
    });
  };

  const handleRemoveColumn = (colId: string) => {
    setColumns((prev) => {
      const removedCol = prev.find((col) => col.id === colId);
      const remaining = prev.filter((col) => col.id !== colId);
      // If we removed the target, promote the last remaining column to target
      if (removedCol?.type === 'target' && remaining.length > 0) {
        const lastIdx = remaining.length - 1;
        return remaining.map((col, i) =>
          i === lastIdx ? { ...col, type: 'target' as const } : col
        );
      }
      return remaining;
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setNotification({ message: 'Link copied to clipboard', type: 'success' });
  };

  const handleSave = async () => {
    try {
      const suggestedName = "asphalt_prediction_data.json";
      const dataStr = serializeColumns(columns);

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

        setColumns(deserializeColumns(parsed));
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

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Instructions sheet
    const instructions = [
      ["Asphalt Mix Template — Instructions"],
      [""],
      ["1. Go to the 'Mix Data' sheet."],
      ["2. Enter your gradation (% passing) values for each sieve size under each trial column."],
      ["3. Enter Gsb and FAA (optional) under Volumetrics & Performance."],
      ["4. For reference trials, enter known measured values for VMA, CTIndex, FI, and/or Rut Depth."],
      ["5. Leave target parameter cells blank for the trial you want to predict."],
      ["6. You can add more trial columns by inserting columns after the existing ones."],
      ["7. Save this file and import it back into the app using the Import Excel button."],
      ["8. The last trial column will be treated as the target; all others become references."],
      [""],
      ["Notes:"],
      ["- Do not rename or reorder the rows in Column A — the app matches by label."],
      ["- You may rename the trial columns (e.g., 'Mix A', 'Mix B')."],
      ["- Empty cells are treated as no data provided."],
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    wsInstructions['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

    // Mix Data sheet — blank template
    const trialHeaders = ["Trial 1", "Trial 2", "Trial 3"];
    const headerRow = ["Design Parameter", "Unit", ...trialHeaders];
    const rows: string[][] = [];

    rows.push(["Gradation (% Passing)", "", ...trialHeaders.map(() => "")]);
    SIEVES.forEach(sieve => {
      rows.push([sieve.label, "%", ...trialHeaders.map(() => "")]);
    });
    rows.push(["", "", ...trialHeaders.map(() => "")]);
    rows.push(["Volumetrics & Performance", "", ...trialHeaders.map(() => "")]);
    PROPERTIES.forEach(prop => {
      rows.push([prop.label, prop.unit || "", ...trialHeaders.map(() => "")]);
    });

    const wsData = XLSX.utils.aoa_to_sheet([headerRow, ...rows]);
    wsData['!cols'] = [
      { wch: 35 },
      { wch: 10 },
      ...trialHeaders.map(() => ({ wch: 20 })),
    ];
    XLSX.utils.book_append_sheet(wb, wsData, "Mix Data");

    XLSX.writeFile(wb, "Asphalt_Mix_Template.xlsx");
    setNotification({ message: 'Template downloaded', type: 'success' });
  };

  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        // Find the data sheet
        const sheetName = wb.SheetNames.includes("Mix Data") ? "Mix Data" : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (aoa.length < 2) {
          setNotification({ message: 'Excel file appears empty', type: 'error' });
          return;
        }

        // Build label → id lookup from constants
        const labelToId: Record<string, string> = {};
        SIEVES.forEach(s => { labelToId[s.label] = s.id; });
        PROPERTIES.forEach(p => { labelToId[p.label] = p.id; });

        // Detect trial columns from header row (index 2+)
        const headerRowData = aoa[0];
        const trialIndices: number[] = [];
        const trialNames: string[] = [];
        for (let i = 2; i < headerRowData.length; i++) {
          const name = String(headerRowData[i] || '').trim();
          if (name) {
            trialIndices.push(i);
            trialNames.push(name);
          }
        }

        if (trialIndices.length < 2) {
          setNotification({ message: 'Template must have at least 2 trial columns', type: 'error' });
          return;
        }

        // Initialize value maps for each trial
        const trialValues: Record<string, string | undefined>[] = trialIndices.map(() => ({}));

        // Parse data rows
        for (let r = 1; r < aoa.length; r++) {
          const row = aoa[r];
          const label = String(row[0] || '').trim();
          const paramId = labelToId[label];
          if (!paramId) continue;

          for (let t = 0; t < trialIndices.length; t++) {
            const cellVal = row[trialIndices[t]];
            if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
              trialValues[t][paramId] = String(cellVal).trim();
            }
          }
        }

        // Build MixColumn[] — last trial is target, others are references
        const newColumns: MixColumn[] = trialValues.map((values, idx) => ({
          id: `design_${Date.now()}_${idx}`,
          name: trialNames[idx],
          type: idx === trialValues.length - 1 ? 'target' as const : 'reference' as const,
          isSelected: true,
          values,
        }));

        setColumns(newColumns);
        setLastPrediction(null);
        setNotification({ message: `Imported ${newColumns.length} trials — ready to run model`, type: 'success' });
      } catch (err) {
        console.error(err);
        setNotification({ message: 'Failed to parse Excel file', type: 'error' });
      } finally {
        if (excelInputRef.current) excelInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleResetAllData = () => {
    setColumns(cloneColumns(INITIAL_COLUMNS));
    setTargetParam('vma');
    setLastPrediction(null);
    setNotification({ message: 'All data reset to default.', type: 'success' });
    setIsResetConfirmOpen(false);
  };

  const handleApplyAISuggestion = (gradation: Record<string, string>) => {
    setColumns((prev) => {
      const targetExists = prev.some(c => c.type === 'target');
      if (!targetExists) return prev;
      return prev.map((col) => {
        if (col.type !== 'target') return col;
        const newValues = { ...col.values };
        // Apply all sieve values from the AI suggestion
        Object.entries(gradation).forEach(([key, value]) => {
          newValues[key] = value;
        });
        return { ...col, values: newValues, predictedKeys: undefined };
      });
    });
    setLastPrediction(null);
    setNotification({ message: 'AI-suggested gradation applied to target trial.', type: 'success' });
  };

  // Prediction flow: validate gradation → select model → run centered deviation regression → display result.
  const handlePredict = async () => {
    if (!targetCol) return;

    // Validate gradation monotonicity on all active columns before running the model.
    const activeCols = [targetCol, ...columns.filter(c => c.type === 'reference' && c.isSelected)];
    const gradationErrors = activeCols.flatMap(col => validateGradation(col));
    if (gradationErrors.length > 0) {
      setNotification({ message: `Gradation error: ${gradationErrors[0]}`, type: 'error' });
      return;
    }

    // Check for optional fields that were toggled on but left empty.
    // An empty FAA or empty reference measured value would silently be ignored by the
    // model (treated as "not provided"), which is confusing. Warn the user instead.
    const paramLabels: Record<string, string> = { vma: 'VMA', rutDepth: 'Rut Depth', ctIndex: 'CTIndex', iFit: 'FI' };
    for (const col of activeCols) {
      if (col.values['faa'] !== undefined && col.values['faa'].trim() === '') {
        setNotification({
          message: `FAA in ${col.name} is enabled but empty. Enter a value or tap the trash icon to remove it.`,
          type: 'error'
        });
        return;
      }
      if (col.type === 'reference' && col.values[targetParam] !== undefined && col.values[targetParam].trim() === '') {
        setNotification({
          message: `${paramLabels[targetParam]} in ${col.name} is enabled but empty. Enter a measured value or tap the trash icon to remove it.`,
          type: 'error'
        });
        return;
      }
    }

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
      };

      // Update the Target Column and mark the value as predicted
      setColumns((prev) =>
        prev.map((col) => {
          if (col.type !== 'target') return col;
          const predicted = new Set(col.predictedKeys || []);
          predicted.add(targetParam);
          return {
            ...col,
            values: {
              ...col.values,
              [targetParam]: rawPrediction.toFixed(1),
            },
            predictedKeys: predicted,
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
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-[15px] md:text-base text-slate-900">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />
      <input
        type="file"
        ref={excelInputRef}
        onChange={handleImportExcel}
        accept=".xlsx,.xls"
        className="hidden"
      />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg shadow-slate-900/10">
        {/* Subtle accent line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-80"></div>
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6 h-auto md:h-20 flex flex-col md:flex-row items-center justify-between py-4 md:py-0 gap-3">
          {/* Branding */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-center md:text-left">
            <h1 className="font-semibold text-xl md:text-lg tracking-tight text-white leading-none">Volumetric & Performance Prediction</h1>
            <div className="hidden md:block h-5 w-px bg-slate-600"></div>
            <p className="text-xs md:text-sm text-slate-400 font-mono font-medium tracking-wide uppercase">VMA &middot; CTIndex &middot; FI &middot; Rut Depth</p>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Template actions — prominent labeled buttons */}
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-400/25 hover:bg-emerald-500/25 hover:border-emerald-400/40 transition-all duration-200"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Excel Template</span>
            </button>

            <button
              onClick={() => excelInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-400/25 hover:bg-blue-500/25 hover:border-blue-400/40 transition-all duration-200"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Import Excel</span>
            </button>

            <div className="h-5 w-px bg-white/10 mx-0.5"></div>

            {/* Icon toolbar */}
            <div className="flex items-center gap-0.5 bg-white/[0.07] backdrop-blur-sm rounded-lg px-1.5 py-1 border border-white/[0.08]">
              <div className="relative group">
                <button
                  onClick={() => setIsInfoOpen(true)}
                  className="p-1.5 md:p-2 rounded-md text-slate-400 hover:text-orange-400 hover:bg-white/10 transition-all duration-200"
                >
                  <Info size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2.5 px-2.5 py-1.5 rounded-md bg-slate-950 text-white text-[11px] font-medium whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 shadow-xl ring-1 ring-white/10 z-50 after:content-[''] after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-slate-950">How it Works</span>
              </div>

              <div className="h-5 w-px bg-white/10 mx-0.5"></div>

              <div className="relative group">
                <button
                  onClick={handleLoadClick}
                  className="p-1.5 md:p-2 rounded-md text-slate-400 hover:text-blue-400 hover:bg-white/10 transition-all duration-200"
                >
                  <FolderUp size={17} />
                </button>
                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2.5 px-2.5 py-1.5 rounded-md bg-slate-950 text-white text-[11px] font-medium whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 shadow-xl ring-1 ring-white/10 z-50 after:content-[''] after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-slate-950">Load Project</span>
              </div>

              <div className="relative group">
                <button
                  onClick={handleSave}
                  className="p-1.5 md:p-2 rounded-md text-slate-400 hover:text-orange-400 hover:bg-white/10 transition-all duration-200"
                >
                  <Save size={17} />
                </button>
                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2.5 px-2.5 py-1.5 rounded-md bg-slate-950 text-white text-[11px] font-medium whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 shadow-xl ring-1 ring-white/10 z-50 after:content-[''] after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-slate-950">Save Project</span>
              </div>

              <div className="relative group">
                <button
                  onClick={handleExportExcel}
                  className="p-1.5 md:p-2 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-white/10 transition-all duration-200"
                >
                  <Table size={17} />
                </button>
                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2.5 px-2.5 py-1.5 rounded-md bg-slate-950 text-white text-[11px] font-medium whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 shadow-xl ring-1 ring-white/10 z-50 after:content-[''] after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-slate-950">Export to Excel</span>
              </div>

              <div className="h-5 w-px bg-white/10 mx-0.5"></div>

              <div className="relative group">
                <button
                  onClick={handleShare}
                  className="p-1.5 md:p-2 rounded-md text-slate-400 hover:text-orange-400 hover:bg-white/10 transition-all duration-200"
                >
                  <Share2 size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2.5 px-2.5 py-1.5 rounded-md bg-slate-950 text-white text-[11px] font-medium whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 shadow-xl ring-1 ring-white/10 z-50 after:content-[''] after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-slate-950">Copy Link</span>
              </div>
            </div>
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
              targetParam={targetParam}
              onUpdateValue={handleUpdateValue}
              onBulkUpdate={handleBulkUpdate}
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
              <h2 className="text-base font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
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
                  { value: 'ctIndex', label: 'CTIndex', subLabel: 'Cracking Tolerance Index' },
                  { value: 'iFit', label: 'FI', subLabel: 'Flexibility Index' },
                  { value: 'rutDepth', label: 'Rut Depth', subLabel: 'Hamburg Wheel Test (mm)' },
                ]}
              />
            </div>

            <button
              onClick={handlePredict}
              disabled={isPredicting}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white font-bold py-2.5 px-4 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 text-base uppercase tracking-wide rounded-sm"
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

            <button
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={isPredicting}
              className="w-full mt-2 border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 font-semibold py-2 px-4 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide rounded-sm"
            >
              <RotateCcw size={14} />
              Reset All Data
            </button>

          </div>

          {/* 2. Results Dashboard */}
          <div className="relative group/panel">
            {lastPrediction && (
              <button
                onClick={() => setExpandedPanel('results')}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-sm bg-white/80 border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all opacity-0 group-hover/panel:opacity-100"
                title="Expand results"
              >
                <Maximize2 size={14} />
              </button>
            )}
            <ResultsDashboard
              result={lastPrediction}
              targetName={targetCol?.name || "Target Design"}
              isLoading={isPredicting}
            />
          </div>

          {/* 3. Visualization */}
          <div className="relative group/panel">
            <button
              onClick={() => setExpandedPanel('chart')}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-sm bg-white/80 border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all opacity-0 group-hover/panel:opacity-100"
              title="Expand chart"
            >
              <Maximize2 size={14} />
            </button>
            <GradationChart columns={columns} />
          </div>

          {/* 4. AI Optimization */}
          <OptimizationPanel
            columns={columns}
            onApplySuggestion={handleApplyAISuggestion}
          />

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 mt-auto">
        <div className="max-w-[1800px] mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/omix_logo_rect.png" alt="OMIX" className="h-8 w-auto object-contain brightness-0 invert opacity-80" />
            <div className="h-5 w-px bg-slate-700"></div>
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Volumetric & Performance Prediction</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-slate-600 font-semibold uppercase tracking-widest">Partners</span>
            <div className="bg-white/90 rounded px-4 py-2">
              <img src="/partner_logos.png" alt="Auburn, NCAT, AAPTP" className="h-10 w-auto object-contain" />
            </div>
          </div>
        </div>
      </footer>

      {/* Expanded Panel Modal */}
      {expandedPanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setExpandedPanel(null)}
        >
          <div
            className="bg-white w-full max-w-5xl max-h-[90vh] border border-slate-200 shadow-2xl rounded-sm overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
                {expandedPanel === 'chart' ? 'Gradation Curve (0.45 Power Chart)' : 'Prediction Results'}
              </h3>
              <button
                onClick={() => setExpandedPanel(null)}
                className="p-1.5 hover:bg-slate-200 rounded-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {expandedPanel === 'chart' && (
                <div className="h-[70vh]">
                  <GradationChart columns={columns} />
                </div>
              )}
              {expandedPanel === 'results' && lastPrediction && (
                <ResultsDashboard
                  result={lastPrediction}
                  targetName={targetCol?.name || "Target Design"}
                  isLoading={false}
                  expanded
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logic Modal */}
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md border border-slate-200 shadow-2xl rounded-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">Reset All Data</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                This will restore the tool to its default values and clear current unsaved entries.
              </p>
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors rounded-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAllData}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors rounded-sm"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

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