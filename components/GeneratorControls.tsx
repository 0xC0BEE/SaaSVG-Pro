import React, { useState, useMemo, useEffect } from 'react';
import { type GeneratorOptions, type GeneratorMode, type ColorInfo, type VectorizerOptions, type RunMode, type IllustrationMode } from '../services/types';
import { THEMES, NARRATIVES, ART_STYLES, ICON_ART_STYLES, ICON_THEMES, DEFAULT_PALETTE } from '../constants';
import { cmykToHex, hexToCmyk } from '../lib/utils';


interface GeneratorControlsProps {
  onSubmit: (options: Omit<GeneratorOptions, 'apiChoice' | 'vectorizerID' | 'vectorizerSecret' | 'recraftToken'>) => void;
  isLoading: boolean;
}

// Sub-component for a single color editor row
const ColorEditorRow: React.FC<{
    color: ColorInfo;
    onUpdate: (id: number, updatedColor: Partial<ColorInfo>) => void;
    onRemove: (id: number) => void;
}> = ({ color, onUpdate, onRemove }) => {
    const [showPicker, setShowPicker] = useState(false);

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHex = e.target.value;
        onUpdate(color.id, { hex: newHex, cmyk: hexToCmyk(newHex) });
    };

    const handleCmykChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCmyk = e.target.value;
        onUpdate(color.id, { cmyk: newCmyk, hex: cmykToHex(newCmyk) });
    };
    
    return (
        <div className="flex items-center gap-3 p-2 bg-[#2A2A2A] rounded-md">
            <div className="relative">
                <button
                    type="button"
                    className="w-8 h-8 rounded border-2 border-gray-500"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => setShowPicker(!showPicker)}
                />
                {showPicker && (
                    <div className="absolute z-10 top-full mt-1" onMouseLeave={() => setShowPicker(false)}>
                        <input 
                            type="color" 
                            value={color.hex}
                            onChange={handleHexChange}
                            className="w-16 h-10 border-none cursor-pointer"
                        />
                    </div>
                )}
            </div>
            <div className="flex-1">
                <label className="text-xs text-gray-400">CMYK</label>
                <input 
                    type="text"
                    value={color.cmyk}
                    onChange={handleCmykChange}
                    className="w-full bg-[#1A1A1A] border border-gray-600 rounded text-xs px-2 py-1"
                />
            </div>
             <div className="flex-1">
                <label className="text-xs text-gray-400">Category</label>
                <select
                    value={color.category}
                    onChange={(e) => onUpdate(color.id, { category: e.target.value as 'primary' | 'secondary' })}
                    className="w-full bg-[#1A1A1A] border border-gray-600 rounded text-xs px-2 py-1 h-[26px]"
                >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                </select>
            </div>
            <div className="flex-1">
                 <label className="text-xs text-gray-400">Percent ({color.percent}%)</label>
                 <input
                    type="range"
                    min="0"
                    max="100"
                    value={color.percent}
                    onChange={(e) => onUpdate(color.id, { percent: Number(e.target.value) })}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
            </div>
            <button type="button" onClick={() => onRemove(color.id)} className="text-gray-500 hover:text-red-500">&times;</button>
        </div>
    );
};

export const GeneratorControls: React.FC<GeneratorControlsProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('a diverse analyst celebrating the successful launch of a new feature on their dashboard');
  const [mode, setMode] = useState<GeneratorMode>('nano');
  const [illustrationMode, setIllustrationMode] = useState<IllustrationMode>('illustrations');
  const [runMode, setRunMode] = useState<RunMode>('single');
  const [generateSvg, setGenerateSvg] = useState(false);
  const [theme, setTheme] = useState(THEMES[3]); // Finance
  const [iconTheme, setIconTheme] = useState('Finance');
  const [narrative, setNarrative] = useState('Celebrating Success');
  const [style, setStyle] = useState('undraw');
  const [seed, setSeed] = useState(28100);
  const [palette, setPalette] = useState<ColorInfo[]>(DEFAULT_PALETTE);
  const [simplicityLevel, setSimplicityLevel] = useState(5); // Default to Medium (5)

  const [vectorizerOptions, setVectorizerOptions] = useState<VectorizerOptions>({
      svgVersion: 'Tiny 1.2',
      stacking: 'cut-outs',
      curveTypes: ['C Bézier (cubic)', 'Arcs'],
      gapFiller: true,
      tolerance: 0.01
  });

  const totalPercent = useMemo(() => palette.reduce((sum, color) => sum + color.percent, 0), [palette]);

  // When switching between illustrations and icons, set a default style for the new mode.
  useEffect(() => {
    if (illustrationMode === 'icons') {
      setStyle(Object.keys(ICON_ART_STYLES)[0]);
      setPrompt('3D isometric finance chart icon');
    } else {
      setStyle(Object.keys(ART_STYLES)[1]); // 'undraw'
      setPrompt('a diverse analyst celebrating the successful launch of a new feature on their dashboard');
    }
  }, [illustrationMode]);


  const handleUpdateColor = (id: number, updatedColor: Partial<ColorInfo>) => {
    setPalette(palette.map(c => c.id === id ? { ...c, ...updatedColor } : c));
  };

  const handleRemoveColor = (id: number) => {
    setPalette(palette.filter(c => c.id !== id));
  };
  
  const handleAddColor = () => {
    if (palette.length < 8) {
        const newColor: ColorInfo = {
            id: Date.now(),
            hex: '#CCCCCC',
            cmyk: '0,0,0,20',
            category: 'secondary',
            percent: 10,
        };
        setPalette([...palette, newColor]);
    }
  };
  
  const handleCurveTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setVectorizerOptions(prev => {
        const newCurveTypes = checked 
            ? [...prev.curveTypes, value] 
            : prev.curveTypes.filter(t => t !== value);
        return { ...prev, curveTypes: newCurveTypes };
    });
  };
  
  const getToleranceLabel = (value: number) => {
    if (value <= 0.05) return 'Super Fine';
    if (value <= 0.15) return 'Fine';
    if (value <= 0.25) return 'Medium';
    return 'Coarse';
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ prompt, mode, illustrationMode, runMode, generateSvg, theme, iconTheme, narrative, style, seed, palette, vectorizerOptions, simplicityLevel });
  };

  const OptionSelect: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: string[] | readonly string[]}> = ({ label, value, onChange, options }) => (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="bg-[#1A1A1A] border border-gray-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#00D4AA] focus:border-[#00D4AA] outline-none h-[42px]"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
  
  const getSimplicityLabel = (value: number) => {
    if (value === 3) return 'Low';
    if (value === 5) return 'Medium';
    if (value === 7) return 'High';
    return '';
  }

  const currentArtStyles = illustrationMode === 'illustrations' ? ART_STYLES : ICON_ART_STYLES;

  return (
    <div className="bg-[#121212] p-6 rounded-lg border border-gray-800 mb-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={illustrationMode === 'icons' ? 'Enter icon description...' : 'Enter your SVG prompt...'}
              className="flex-grow bg-[#1A1A1A] border border-gray-700 rounded-md px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#00D4AA] focus:border-[#00D4AA] outline-none"
            />
             <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              placeholder="Seed"
              className="w-32 bg-[#1A1A1A] border border-gray-700 rounded-md px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#00D4AA] focus:border-[#00D4AA] outline-none"
            />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
           <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-sm font-medium text-gray-400 mb-1 block">Engine</label>
                    <div className="flex items-center space-x-1 bg-[#1A1A1A] p-1 rounded-md border border-gray-700 h-[42px]">
                        <button type="button" onClick={() => setMode('classic')} className={`flex-1 py-1 rounded text-xs ${mode === 'classic' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Classic</button>
                        <button type="button" onClick={() => setMode('nano')} className={`flex-1 py-1 rounded text-xs ${mode === 'nano' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Nano</button>
                    </div>
                </div>
                 <div>
                    <label className="text-sm font-medium text-gray-400 mb-1 block">Mode</label>
                    <div className="flex items-center space-x-1 bg-[#1A1A1A] p-1 rounded-md border border-gray-700 h-[42px]">
                        <button type="button" onClick={() => setIllustrationMode('illustrations')} className={`flex-1 py-1 rounded text-xs ${illustrationMode === 'illustrations' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Illustrations</button>
                        <button type="button" onClick={() => setIllustrationMode('icons')} className={`flex-1 py-1 rounded text-xs ${illustrationMode === 'icons' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Icons</button>
                    </div>
                </div>
           </div>
          {illustrationMode === 'illustrations' && (
            <>
                <OptionSelect label="Narrative" value={narrative} onChange={(e) => setNarrative(e.target.value)} options={Object.keys(NARRATIVES)} />
                <OptionSelect label="Art Style" value={style} onChange={(e) => setStyle(e.target.value)} options={Object.keys(currentArtStyles)} />
                <OptionSelect label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} options={THEMES} />
            </>
          )}
          {illustrationMode === 'icons' && (
            <>
              <OptionSelect label="Art Style" value={style} onChange={(e) => setStyle(e.target.value)} options={Object.keys(currentArtStyles)} />
              <OptionSelect label="Industry/Theme" value={iconTheme} onChange={(e) => setIconTheme(e.target.value)} options={Object.keys(ICON_THEMES)} />
              <div className="md:col-span-2">
                <label htmlFor="simplicity" className="text-sm font-medium text-gray-400 mb-1 block">
                    Simplicity Level: <span className="font-semibold text-white">{getSimplicityLabel(simplicityLevel)} ({simplicityLevel} elements max)</span>
                </label>
                <input
                    id="simplicity"
                    type="range"
                    min="3" max="7" step="2"
                    value={simplicityLevel}
                    onChange={(e) => setSimplicityLevel(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb"
                />
                 <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                </div>
              </div>
            </>
          )}

        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="text-sm font-medium text-gray-400 mb-1 block">Run Mode</label>
                <div className="flex items-center space-x-2 bg-[#1A1A1A] p-1 rounded-md border border-gray-700 h-[42px]">
                    <button type="button" onClick={() => setRunMode('single')} className={`flex-1 py-1 rounded ${runMode === 'single' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Single</button>
                    <button type="button" onClick={() => setRunMode('batch')} className={`flex-1 py-1 rounded ${runMode === 'batch' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Batch (4)</button>
                </div>
            </div>
            {mode === 'nano' && (
                <div>
                    <label className="text-sm font-medium text-gray-400 mb-1 block opacity-0">Actions</label>
                    <div className="flex items-center bg-[#1A1A1A] p-2 rounded-md border border-gray-700 h-[42px]">
                         <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={generateSvg} onChange={(e) => setGenerateSvg(e.target.checked)} className="form-checkbox bg-[#2A2A2A] border-gray-600 text-[#00D4AA] focus:ring-[#00D4AA]" />
                            <span>Generate SVG from PNG (via API)</span>
                        </label>
                    </div>
                </div>
            )}
        </div>

        {mode === 'nano' && generateSvg && (
             <fieldset className="border border-gray-800 rounded-lg p-4 space-y-4">
                <legend className="text-sm font-medium text-gray-400 px-2">Vectorizer Options</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* SVG Version & Stacking */}
                    <div className="space-y-4">
                         <OptionSelect label="SVG Version" value={vectorizerOptions.svgVersion} onChange={(e) => setVectorizerOptions(prev => ({...prev, svgVersion: e.target.value as VectorizerOptions['svgVersion']}))} options={['1.1 (Default)', 'Tiny 1.2']} />
                         <div>
                            <label className="text-sm font-medium text-gray-400 mb-2 block">Shape Stacking</label>
                            <div className="flex items-center space-x-2 bg-[#1A1A1A] p-1 rounded-md border border-gray-700">
                                <button type="button" onClick={() => setVectorizerOptions(prev => ({...prev, stacking: 'cut-outs'}))} className={`flex-1 py-1 rounded text-sm ${vectorizerOptions.stacking === 'cut-outs' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Cut-outs</button>
                                <button type="button" onClick={() => setVectorizerOptions(prev => ({...prev, stacking: 'stack on top'}))} className={`flex-1 py-1 rounded text-sm ${vectorizerOptions.stacking === 'stack on top' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Stack on top</button>
                            </div>
                        </div>
                    </div>
                    {/* Curve Types & Gap Filler */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-400 mb-2 block">Curve Types</label>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                {['Lines', 'Q Bézier (quadratic)', 'C Bézier (cubic)', 'Arcs'].map(type => (
                                    <label key={type} className="flex items-center space-x-2 text-gray-300">
                                        <input type="checkbox" value={type} checked={vectorizerOptions.curveTypes.includes(type)} onChange={handleCurveTypeChange} className="form-checkbox bg-[#2A2A2A] border-gray-600 text-[#00D4AA] focus:ring-[#00D4AA]" />
                                        <span>{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                         <div>
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-sm font-medium text-gray-400">Gap Filler</span>
                                <div className="relative">
                                    <input type="checkbox" checked={vectorizerOptions.gapFiller} onChange={(e) => setVectorizerOptions(prev => ({...prev, gapFiller: e.target.checked}))} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00D4AA]"></div>
                                </div>
                            </label>
                             <p className="text-xs text-gray-500 mt-1">Fill gaps w/ non-scaling stroke (1.5px)</p>
                        </div>
                    </div>
                    {/* Tolerance Slider */}
                    <div>
                        <label htmlFor="tolerance" className="text-sm font-medium text-gray-400 mb-2 block">Tolerance</label>
                        <input id="tolerance" type="range" min="0.01" max="0.30" step="0.01" value={vectorizerOptions.tolerance} onChange={(e) => setVectorizerOptions(prev => ({...prev, tolerance: Number(e.target.value)}))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Super Fine</span>
                            <span className="font-bold text-gray-300">{getToleranceLabel(vectorizerOptions.tolerance)} ({vectorizerOptions.tolerance}px)</span>
                             <span>Coarse</span>
                        </div>
                    </div>
                </div>
            </fieldset>
        )}

        {/* Color Palette Editor */}
        <div className="space-y-3">
             <div className="flex justify-between items-center">
                <div>
                    <label className="text-sm font-medium text-gray-400">Color Palette</label>
                    <span className={`ml-3 text-sm font-bold ${totalPercent !== 100 ? 'text-yellow-400' : 'text-green-400'}`}>
                        Total: {totalPercent}% {totalPercent !== 100 && '(Warning: Should be 100%)'}
                    </span>
                </div>
                <button type="button" onClick={handleAddColor} disabled={palette.length >= 8} className="text-sm bg-[#00D4AA] text-black font-semibold px-3 py-1 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed">
                    Add Color
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {palette.map(color => (
                    <ColorEditorRow 
                        key={color.id} 
                        color={color}
                        onUpdate={handleUpdateColor}
                        onRemove={handleRemoveColor}
                    />
                ))}
            </div>
        </div>

        <div className="flex justify-end">
            <button
                type="submit"
                disabled={isLoading}
                className="w-full md:w-auto h-[42px] bg-[#00D4AA] text-black font-bold rounded-md hover:bg-opacity-90 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center px-8"
            >
                {isLoading ? 'Generating...' : 'Generate'}
            </button>
        </div>
      </form>
    </div>
  );
};

// Custom styles for the range slider thumb
const style = document.createElement('style');
style.innerHTML = `
input[type="range"].range-thumb::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #00D4AA;
  border-radius: 50%;
  cursor: pointer;
  margin-top: -5px; /* Adjust to center */
}
input[type="range"].range-thumb::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #00D4AA;
  border-radius: 50%;
  cursor: pointer;
}
`;
document.head.appendChild(style);