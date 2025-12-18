import React from 'react';
import { X, BookOpen, GitMerge, Calculator, Save, Activity } from 'lucide-react';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-2 text-slate-800">
                        <BookOpen className="text-orange-600" size={24} />
                        <h2 className="text-xl font-bold">How it Works</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">

                    {/* Step 1 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">1</div>
                        <div>
                            <h3 className="font-bold text-slate-800 mb-2">Input Reference Data</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Enter gradation and measured volumetric data (Gsb, VMA, etc.) for your existing lab trials in the <span className="font-semibold text-slate-800">Reference Columns</span>.
                                The more historical data you provide, the better the calibration.
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-lg border border-orange-100">2</div>
                        <div>
                            <h3 className="font-bold text-slate-800 mb-2">Define Prediction Target</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Enter the gradation and Gsb for the new mix design you want to analyze in the <span className="font-semibold text-orange-700 bg-orange-50 px-1 rounded">Prediction Target</span> column.
                            </p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg border border-slate-200">
                            <Calculator size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 mb-2">Run Prediction</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Select a parameter (VMA, Rut Depth, etc.) from the Analyze panel and click <strong>Run Prediction</strong>.
                                The system uses your reference data to calibrate the model specifically for your materials.
                            </p>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg border border-slate-200">
                            <Save size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 mb-2">Verify & Refine</h3>
                            <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                Once you are satisfied with a design, click <strong>Save as Trial</strong>. This promotes the target to a Reference Trial.
                            </p>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                                <div className="flex items-start gap-3">
                                    <Activity className="text-slate-400 mt-0.5" size={16} />
                                    <div>
                                        <strong className="text-slate-900">Calibration Loop:</strong><br />
                                        Measure the actual value in the lab and enter it in the "Measured" input field.
                                        The system will now use this <span className="italic">verified</span> data point to improve all future predictions.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 opacity-80">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Powered by</span>
                        <img src="/omix_logo_rect.png" alt="OMIX" className="h-8 w-auto object-contain" />
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
                    >
                        Got it
                    </button>
                </div>

            </div>
        </div>
    );
};

export default InfoModal;
