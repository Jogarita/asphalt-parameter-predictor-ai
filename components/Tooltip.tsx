import React, { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement;
    side?: 'top' | 'right' | 'bottom' | 'left';
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();

            let top = 0;
            let left = 0;

            switch (side) {
                case 'top':
                    top = triggerRect.top - tooltipRect.height - 8;
                    left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
                    break;
                case 'right':
                    top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
                    left = triggerRect.right + 8;
                    break;
                case 'bottom':
                    top = triggerRect.bottom + 8;
                    left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
                    break;
                case 'left':
                    top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
                    left = triggerRect.left - tooltipRect.width - 8;
                    break;
            }

            // Prevent overflow (basic) - forcing into view not implemented for brevity but sticky keeps it mostly in view
            // Just adding window scroll offset to make it absolute to document if needed, but fixed is easier

            setPosition({ top, left });
        }
    }, [isVisible, side]);

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            ref={triggerRef}
        >
            {children}
            {isVisible && (
                <div
                    ref={tooltipRef}
                    style={{ top: position.top, left: position.left }}
                    className="fixed z-50 w-64 p-0 bg-white border border-slate-200 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
                >
                    {/* Main Content */}
                    <div className="p-3">
                        <div className="text-xs text-slate-600 leading-relaxed font-medium">
                            {content}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 rounded-b-lg flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Info</span>
                        <div className="flex items-center gap-1.5 opacity-60">
                            <span className="text-[9px] text-slate-400 font-medium tracking-wide">Powered by</span>
                            <img src="/omix_logo_rect.png" alt="OMIX" className="h-3 w-auto object-contain grayscale opacity-80" />
                        </div>
                    </div>

                    {/* Arrow (Visual only, tricky to position perfectly without heavy math, skipping for clean look) */}
                </div>
            )}
        </div>
    );
};

export default Tooltip;
