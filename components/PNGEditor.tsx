import React, { useRef, useEffect, useState, useCallback } from 'react';
import ImageTracer from 'imagetracerjs';
import { WandIcon } from '../icons/WandIcon';
import { FillIcon } from '../icons/FillIcon';
import { UndoIcon } from '../icons/UndoIcon';
import { RedoIcon } from '../icons/RedoIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { TraceIcon } from '../icons/TraceIcon'; // New icon for tracing
import { downloadFile } from '../lib/utils';

// Let TypeScript know that fabric.js is available globally
declare var fabric: any;


interface PNGEditorProps {
  pngBase64: string;
  seed: number;
}

// --- Flood Fill Utility ---
// This is a simplified flood fill that returns a list of pixel indices to change.
const floodFill = (
    imageData: ImageData,
    startX: number,
    startY: number,
    tolerance: number
) => {
    const { width, height, data } = imageData;
    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const pixelStack = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    const selection = [];
    
    const colorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
        return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
    };
    
    // Tolerance is 0-100, map it to the color distance range (0 to ~441)
    const toleranceThreshold = (tolerance / 100) * 441.67;

    while (pixelStack.length) {
        const [x, y] = pixelStack.pop() as [number, number];
        const currentPos = (y * width + x);
        
        if (x < 0 || x >= width || y < 0 || y >= height || visited[currentPos]) {
            continue;
        }
        
        visited[currentPos] = 1;

        const r = data[currentPos * 4];
        const g = data[currentPos * 4 + 1];
        const b = data[currentPos * 4 + 2];
        
        if (colorDistance(startR, startG, startB, r, g, b) <= toleranceThreshold) {
            selection.push(currentPos);
            pixelStack.push([x + 1, y]);
            pixelStack.push([x - 1, y]);
            pixelStack.push([x, y + 1]);
            pixelStack.push([x, y - 1]);
        }
    }
    return selection;
};
// --- End Flood Fill Utility ---

export const PNGEditor: React.FC<PNGEditorProps> = ({ pngBase64, seed }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<any>(null);
    const selectionOverlayRef = useRef<any>(null);

    const [tolerance, setTolerance] = useState(20);
    const [fillColor, setFillColor] = useState('#00D4AA');
    
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const MAX_HISTORY = 10;

    // Use a ref to hold the latest state for callbacks to prevent stale closures
    const stateRef = useRef({ history, historyIndex, tolerance });
    useEffect(() => {
        stateRef.current = { history, historyIndex, tolerance };
    }, [history, historyIndex, tolerance]);
    
    const saveState = useCallback(() => {
        if (!fabricCanvasRef.current) return;
        const currentState = fabricCanvasRef.current.toDataURL({ format: 'png' });
        const { history, historyIndex } = stateRef.current;
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(currentState);
        
        if (newHistory.length > MAX_HISTORY) {
            newHistory.shift();
        }
        
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, []);
    
    const restoreState = useCallback((index: number) => {
        const { history } = stateRef.current;
        if (!history[index]) return;
        fabric.Image.fromURL(history[index], (img: any) => {
            const originalImage = fabricCanvasRef.current?.getObjects('image').find((o: any) => !o.isSelectionOverlay);
            if (originalImage) {
                 originalImage.setElement(img.getElement());
                 fabricCanvasRef.current.renderAll();
            }
        });
    }, []);
    
    const handleUndo = useCallback(() => {
        const { historyIndex } = stateRef.current;
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            restoreState(newIndex);
            console.log(`PNG Editor: Undo action. Stack count: ${newIndex}`);
        }
    }, [restoreState]);

    const handleRedo = useCallback(() => {
        const { history, historyIndex } = stateRef.current;
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            restoreState(newIndex);
        }
    }, [restoreState]);
    
    // Main useEffect for setup, image loading, and event handling
    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current);
        fabricCanvasRef.current = canvas;
        
        const handleCanvasClick = (options: any) => {
            if (!options.pointer || !fabricCanvasRef.current) return;
            
            const baseImage = fabricCanvasRef.current.getObjects('image').find((o: any) => !o.isSelectionOverlay);
            if (!baseImage) return;

            const inverseMatrix = fabric.util.invertTransform(baseImage.calcTransformMatrix());
            const pointInImage = fabric.util.transformPoint(options.pointer, inverseMatrix);

            const x = Math.floor(pointInImage.x);
            const y = Math.floor(pointInImage.y);

            if (x < 0 || y < 0 || x >= baseImage.width || y >= baseImage.height) return;

            const { tolerance } = stateRef.current;
            console.log(`Editor: Wand clicked [${x},${y}] tolerance [${tolerance}]`);
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = baseImage.width;
            tempCanvas.height = baseImage.height;
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
            tempCtx.drawImage(baseImage.getElement(), 0, 0, baseImage.width, baseImage.height);
            const imageData = tempCtx.getImageData(0, 0, baseImage.width, baseImage.height);
            
            const selectionIndices = floodFill(imageData, x, y, tolerance);
            
            const selectionCanvas = document.createElement('canvas');
            selectionCanvas.width = baseImage.width;
            selectionCanvas.height = baseImage.height;
            const selectionCtx = selectionCanvas.getContext('2d')!;
            const selectionImageData = selectionCtx.createImageData(baseImage.width, baseImage.height);

            for (const index of selectionIndices) {
                selectionImageData.data[index * 4] = 0;
                selectionImageData.data[index * 4 + 1] = 255;
                selectionImageData.data[index * 4 + 2] = 0;
                selectionImageData.data[index * 4 + 3] = 77;
            }
            selectionCtx.putImageData(selectionImageData, 0, 0);

            if (selectionOverlayRef.current) {
                fabricCanvasRef.current.remove(selectionOverlayRef.current);
            }
            
            selectionOverlayRef.current = new fabric.Image(selectionCanvas, {
                left: baseImage.left,
                top: baseImage.top,
                scaleX: baseImage.scaleX,
                scaleY: baseImage.scaleY,
                angle: baseImage.angle,
                originX: baseImage.originX,
                originY: baseImage.originY,
                selectable: false,
                evented: false,
                isSelectionOverlay: true, 
                selectionIndices: selectionIndices
            });
            
            fabricCanvasRef.current.add(selectionOverlayRef.current);
            fabricCanvasRef.current.renderAll();
        };
        canvas.on('mouse:down', handleCanvasClick);
        
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                canvas.setWidth(width).setHeight(height);
                 console.log(`Editor: Canvas sized [${width},${height}]`);
                const image = canvas.getObjects('image').find((o: any) => !o.isSelectionOverlay);
                if (image) {
                    const scale = Math.min(width / image.width, height / image.height) * 0.95;
                    image.scale(scale);
                    canvas.centerObject(image);
                    canvas.renderAll();
                }
            }
        });
        
        resizeObserver.observe(containerRef.current);

        const img = new Image();
        img.src = `data:image/png;base64,${pngBase64}`;
        img.onload = () => {
             if (!containerRef.current) return;
            fabric.Image.fromURL(img.src, (fabricImg: any) => {
                if (!containerRef.current) return;
                const { width, height } = containerRef.current.getBoundingClientRect();
                const scale = Math.min(width / fabricImg.width, height / fabricImg.height) * 0.95;
                fabricImg.scale(scale);
                fabricImg.set({ selectable: false, evented: true }); // Make image evented
                
                canvas.clear();
                canvas.add(fabricImg);
                canvas.centerObject(fabricImg);
                canvas.renderAll();
                
                console.log('Editor: PNG loaded, scaled, and centered');
                const currentState = canvas.toDataURL({ format: 'png' });
                setHistory([currentState]);
                setHistoryIndex(0);
            });
        };
        
        return () => {
            resizeObserver.disconnect();
            canvas.off('mouse:down', handleCanvasClick);
            canvas.dispose();
            fabricCanvasRef.current = null;
        };
    }, [pngBase64]);
    
    const handleFill = () => {
        if (!selectionOverlayRef.current) return;
        
        const indices = selectionOverlayRef.current.selectionIndices;
        if (!indices || indices.length === 0) return;

        const baseImage = fabricCanvasRef.current.getObjects('image').find((o: any) => !o.isSelectionOverlay);
        if (!baseImage) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = baseImage.width;
        tempCanvas.height = baseImage.height;
        const ctx = tempCanvas.getContext('2d')!;
        ctx.drawImage(baseImage.getElement(), 0, 0, baseImage.width, baseImage.height);
        
        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const color = new fabric.Color(fillColor);
        const [r, g, b] = color.getSource();

        indices.forEach((index: number) => {
            imageData.data[index * 4] = r;
            imageData.data[index * 4 + 1] = g;
            imageData.data[index * 4 + 2] = b;
        });
        ctx.putImageData(imageData, 0, 0);
        
        baseImage.setElement(tempCanvas);
        
        fabricCanvasRef.current.remove(selectionOverlayRef.current);
        selectionOverlayRef.current = null;
        fabricCanvasRef.current.renderAll();
        
        saveState();
        console.log(`Editor: Filled selection with ${fillColor}`);
    };
    
    const handleDownload = () => {
        fabricCanvasRef.current.getElement().toBlob((blob: Blob | null) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `saasvg-pro-edited-${seed}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        });
    };

    const handleTrace = () => {
        if (typeof ImageTracer === 'undefined' || !ImageTracer.imageToSVG) {
            console.error("Editor: ImageTracer is not defined or not loaded correctly.");
            return;
        }
        console.log(`Editor: ImageTracer ready for tracing.`);

        const baseImage = fabricCanvasRef.current.getObjects('image').find((o: any) => !o.isSelectionOverlay);
        if (!baseImage) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = baseImage.width;
        tempCanvas.height = baseImage.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(baseImage.getElement(), 0, 0, baseImage.width, baseImage.height);
        const imageData = tempCtx.getImageData(0, 0, baseImage.width, baseImage.height);

        const traceOptions = {
            ltres: 1,
            qtres: 1,
            pathomit: 8,
            rightangleenhance: true,
        };

        const svgString = ImageTracer.imageToSVG(imageData, traceOptions);
        downloadFile(svgString, `saasvg-pro-traced-${seed}.svg`, 'image/svg+xml');
    };

    return (
        <div className="w-full h-full flex flex-col md:flex-row gap-2">
            {/* Toolbar */}
            <div className="flex-shrink-0 bg-[#1A1A1A] p-3 rounded-lg border border-gray-800 w-full md:w-48 flex flex-row md:flex-col gap-4">
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-300">Tools</h4>
                    <div className="flex flex-col gap-2">
                       <button className="tool-button active"><WandIcon /> Magic Wand</button>
                    </div>
                </div>
                
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
                
                <div className="space-y-2">
                     <h4 className="text-sm font-semibold text-gray-300">Actions</h4>
                     <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <input type="color" value={fillColor} onChange={e => setFillColor(e.target.value)} className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer" />
                            <button onClick={handleFill} className="tool-button flex-1"><FillIcon /> Fill Selection</button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleUndo} disabled={historyIndex <= 0} className="tool-button flex-1"><UndoIcon /> Undo</button>
                            <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="tool-button flex-1"><RedoIcon /> Redo</button>
                        </div>
                        <button onClick={handleTrace} className="tool-button"><TraceIcon /> Trace to SVG</button>
                        <button onClick={handleDownload} className="tool-button"><DownloadIcon /> Download PNG</button>
                     </div>
                </div>
            </div>
            
            {/* Canvas Container */}
            <div 
                ref={containerRef} 
                className="items-center justify-center bg-transparent rounded-lg"
                style={{
                    display: 'flex',
                    flex: 1,
                    width: '60vw',
                    height: '60vh',
                    minWidth: '400px',
                    minHeight: '300px',
                }}
            >
                <canvas ref={canvasRef} />
            </div>

            <style>{`
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