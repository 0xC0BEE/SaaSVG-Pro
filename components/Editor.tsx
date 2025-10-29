import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WandIcon } from '../icons/WandIcon';
import { FillIcon } from '../icons/FillIcon';
import { UndoIcon } from '../icons/UndoIcon';
import { RedoIcon } from '../icons/RedoIcon';

// Let TypeScript know that SVG.js is available globally
declare var SVG: any;

interface EditorProps {
  svgString: string;
  onUpdate: (newSvgString: string) => void;
}

type Tool = 'wand' | 'fill';
type HistoryEntry = {
    elementId: string;
    oldColor: string;
    newColor: string;
};

// --- Color Utility Functions ---
const hexToRgb = (hex: string): { r: number, g: number, b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const colorDifference = (rgb1: { r: number, g: number, b: number }, rgb2: { r: number, g: number, b: number }): number => {
    return Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    );
};
// --- End Color Utility Functions ---


export const Editor: React.FC<EditorProps> = ({ svgString, onUpdate }) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const drawRef = useRef<any>(null);

    const [activeTool, setActiveTool] = useState<Tool>('wand');
    const [tolerance, setTolerance] = useState(10);
    const [fillColor, setFillColor] = useState('#00D4AA');
    const [selection, setSelection] = useState<any[]>([]);
    
    const [undoStack, setUndoStack] = useState<HistoryEntry[][]>([]);
    const [redoStack, setRedoStack] = useState<HistoryEntry[][]>([]);
    const MAX_HISTORY = 10;

    const pushToUndoStack = (entries: HistoryEntry[]) => {
        setUndoStack(prev => [...prev.slice(prev.length - MAX_HISTORY + 1), entries]);
        setRedoStack([]); // Clear redo stack on new action
    };

    const clearSelection = useCallback(() => {
        selection.forEach(el => el.removeClass('selection-highlight'));
        setSelection([]);
    }, [selection]);

    const handleUndo = useCallback(() => {
        if (undoStack.length === 0) return;

        const lastAction = undoStack[undoStack.length - 1];
        const newUndoStack = undoStack.slice(0, -1);
        
        const redoEntries: HistoryEntry[] = [];
        lastAction.forEach(({ elementId, oldColor }) => {
            const element = drawRef.current.findOne(`#${elementId}`);
            if (element) {
                redoEntries.push({ elementId, oldColor: element.fill(), newColor: oldColor });
                element.fill(oldColor);
            }
        });
        
        setUndoStack(newUndoStack);
        setRedoStack(prev => [...prev, redoEntries]);
        clearSelection();
        onUpdate(drawRef.current.svg());
    }, [undoStack, clearSelection, onUpdate]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;
        
        const nextAction = redoStack[redoStack.length - 1];
        const newRedoStack = redoStack.slice(0, -1);

        const undoEntries: HistoryEntry[] = [];
        nextAction.forEach(({ elementId, newColor }) => {
             const element = drawRef.current.findOne(`#${elementId}`);
             if (element) {
                 undoEntries.push({ elementId, oldColor: newColor, newColor: element.fill() });
                 element.fill(newColor);
             }
        });

        setRedoStack(newRedoStack);
        setUndoStack(prev => [...prev, undoEntries]);
        clearSelection();
        onUpdate(drawRef.current.svg());
    }, [redoStack, clearSelection, onUpdate]);

    // Initialize SVG.js canvas
    useEffect(() => {
        if (canvasRef.current && !drawRef.current) {
            drawRef.current = SVG().addTo(canvasRef.current).size('100%', '100%');
        }
        
        if (drawRef.current && svgString) {
            drawRef.current.clear();
            drawRef.current.svg(svgString);
            
            // Add click handlers for the magic wand
            drawRef.current.find('path, rect, circle, ellipse, polygon').forEach((el: any) => {
                el.on('click', (e: MouseEvent) => {
                    e.stopPropagation();
                    if (activeTool === 'wand') {
                        handleWandSelect(el);
                    }
                });
            });
        }
        
        // Cleanup
        return () => {
            if (drawRef.current) {
                // drawRef.current.remove();
                // drawRef.current = null;
            }
        };
    }, [svgString]); // Re-init if the base SVG string changes

    const handleWandSelect = (clickedElement: any) => {
        clearSelection();
        const clickedColor = clickedElement.attr('fill');
        if (!clickedColor || clickedColor === 'none') return;
        
        const clickedRgb = hexToRgb(clickedColor);
        if (!clickedRgb) return;

        const allPaths = drawRef.current.find('path, rect, circle, ellipse, polygon');
        const newSelection: any[] = [];
        
        // The max distance is sqrt(3 * 255^2) approx 441.67.
        // We scale tolerance (0-100) to this range.
        const toleranceThreshold = (tolerance / 100) * 200; 

        allPaths.forEach((el: any) => {
            const elColor = el.attr('fill');
            if (elColor && elColor !== 'none') {
                const elRgb = hexToRgb(elColor);
                if (elRgb) {
                    const diff = colorDifference(clickedRgb, elRgb);
                    if (diff <= toleranceThreshold) {
                        newSelection.push(el);
                    }
                }
            }
        });

        newSelection.forEach(el => el.addClass('selection-highlight'));
        setSelection(newSelection);
        console.log(`Editor: Wand tolerance ${tolerance}, selected ${newSelection.length} paths`);
    };

    const handleFill = () => {
        if (selection.length === 0) return;

        const historyEntries: HistoryEntry[] = selection.map(el => ({
            elementId: el.id(),
            oldColor: el.attr('fill'),
            newColor: fillColor,
        }));
        pushToUndoStack(historyEntries);
        
        selection.forEach(el => {
            el.fill(fillColor);
        });

        console.log(`Editor: Filled ${selection.length} paths with color ${fillColor}`);
        onUpdate(drawRef.current.svg()); // Notify parent of the change
    };

    return (
        <div className="w-full h-full flex flex-col md:flex-row gap-2">
            {/* Toolbar */}
            <div className="flex-shrink-0 bg-[#1A1A1A] p-3 rounded-lg border border-gray-800 w-full md:w-48 flex flex-row md:flex-col gap-4">
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-300">Tools</h4>
                    <div className="flex flex-col gap-2">
                       <button onClick={() => setActiveTool('wand')} className={`tool-button ${activeTool === 'wand' ? 'active' : ''}`}><WandIcon /> Magic Wand</button>
                    </div>
                </div>
                
                {activeTool === 'wand' && (
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Tolerance: {tolerance}</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={tolerance}
                            onChange={(e) => setTolerance(Number(e.target.value))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                )}
                
                <div className="space-y-2">
                     <h4 className="text-sm font-semibold text-gray-300">Actions</h4>
                     <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <input type="color" value={fillColor} onChange={e => setFillColor(e.target.value)} className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer" />
                            <button onClick={handleFill} className="tool-button flex-1"><FillIcon /> Fill Selection</button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleUndo} disabled={undoStack.length === 0} className="tool-button flex-1"><UndoIcon /> Undo</button>
                            <button onClick={handleRedo} disabled={redoStack.length === 0} className="tool-button flex-1"><RedoIcon /> Redo</button>
                        </div>
                     </div>
                </div>
            </div>
            
            {/* Canvas */}
            <div ref={canvasRef} className="flex-grow bg-transparent rounded-lg w-full h-full min-h-[200px]"></div>

             {/* Dynamic Style for Selection Highlight */}
            <style>{`
                .selection-highlight {
                    stroke: #00D4AA;
                    stroke-width: 2px;
                    stroke-dasharray: 4;
                    animation: dash-flow 1s linear infinite;
                }
                @keyframes dash-flow {
                    from { stroke-dashoffset: 20; }
                    to { stroke-dashoffset: 0; }
                }
                .tool-button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    border: 1px solid #4A4A4A;
                    border-radius: 6px;
                    background-color: #2A2A2A;
                    color: #E0E0E0;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    width: 100%;
                }
                .tool-button:hover {
                    background-color: #3A3A3A;
                    border-color: #6A6A6A;
                }
                .tool-button.active {
                    background-color: #00D4AA;
                    color: #121212;
                    border-color: #00D4AA;
                    font-weight: 600;
                }
                 .tool-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
};
