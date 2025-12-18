
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    subLabel?: string;
}

interface PremiumSelectProps {
    label: string;
    value: string;
    options: Option[];
    onChange: (value: string) => void;
}

const PremiumSelect: React.FC<PremiumSelectProps> = ({ label, value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                {label}
            </label>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-left bg-white border cursor-pointer transition-all duration-200 ease-in-out flex items-center justify-between p-3 rounded-sm
                    ${isOpen
                        ? 'border-orange-400 ring-1 ring-orange-400 shadow-sm'
                        : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }`}
            >
                <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-slate-800 tracking-tight">
                        {selectedOption?.label}
                    </span>
                    {selectedOption?.subLabel && (
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                            {selectedOption.subLabel}
                        </span>
                    )}
                </div>
                <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-orange-500' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-sm shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="py-1 max-h-[240px] overflow-y-auto">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`w-full text-left px-3 py-2.5 flex items-center justify-between group transition-colors
                                    ${value === option.value
                                        ? 'bg-orange-50/50'
                                        : 'hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex flex-col gap-0.5">
                                    <span className={`text-sm tracking-tight ${value === option.value ? 'font-bold text-orange-900' : 'font-medium text-slate-700 group-hover:text-slate-900'}`}>
                                        {option.label}
                                    </span>
                                    {option.subLabel && (
                                        <span className={`text-[10px] uppercase tracking-wider ${value === option.value ? 'text-orange-400' : 'text-slate-400'}`}>
                                            {option.subLabel}
                                        </span>
                                    )}
                                </div>
                                {value === option.value && (
                                    <Check size={14} className="text-orange-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PremiumSelect;
