import React, { useEffect, useState } from 'react';
import { Check, Info, AlertCircle, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColors = {
        success: 'bg-slate-900',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };

    return (
        <div className={`fixed bottom-4 right-4 ${bgColors[type]} text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50`}>
            {type === 'success' && <Check size={16} className="text-green-400" />}
            {type === 'error' && <AlertCircle size={16} className="text-red-300" />}
            {type === 'info' && <Info size={16} className="text-blue-300" />}
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity ml-2">
                <X size={14} />
            </button>
        </div>
    );
};

export default Toast;
