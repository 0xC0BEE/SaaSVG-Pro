import React, { useState, useMemo } from 'react';
import { type GeneratorOptions, type GeneratorMode, type ColorInfo } from '../services/types';
import { THEMES, NARRATIVES, STYLES, DEFAULT_PALETTE } from '../constants';
import { cmykToHex, hexToCmyk } from '../lib/utils';


interface GeneratorControlsProps {
  // FIX: Corrected the Omit type to match the expected options from the parent component.
  // This ensures that only UI-related options are passed, and API keys are handled separately.
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
  const [theme, setTheme] = useState(THEMES[3]); // Finance
  const [narrative, setNarrative] = useState('Celebrating Success');
  const [style, setStyle] = useState('undraw');
  const [seed, setSeed] = useState(28100);
  const [palette, setPalette] = useState<ColorInfo[]>(DEFAULT_PALETTE);

  const totalPercent = useMemo(() => palette.reduce((sum, color) => sum + color.percent, 0), [palette]);


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


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ prompt, mode, theme, narrative, style, seed, palette });
  };

  const OptionSelect: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: string[]}> = ({ label, value, onChange, options }) => (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="bg-[#1A1A1A] border border-gray-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[#00D4AA] focus:border-[#00D4AA] outline-none"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  return (
    <div className="bg-[#121212] p-6 rounded-lg border border-gray-800 mb-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your SVG prompt..."
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
           <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">Mode</label>
              <div className="flex items-center space-x-2 bg-[#1A1A1A] p-1 rounded-md border border-gray-700 h-[42px]">
                <button type="button" onClick={() => setMode('classic')} className={`flex-1 py-1 rounded ${mode === 'classic' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Classic</button>
                <button type="button" onClick={() => setMode('nano')} className={`flex-1 py-1 rounded ${mode === 'nano' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Nano</button>
              </div>
           </div>
          <OptionSelect label="Narrative" value={narrative} onChange={(e) => setNarrative(e.target.value)} options={Object.keys(NARRATIVES)} />
          <OptionSelect label="Style" value={style} onChange={(e) => setStyle(e.target.value)} options={Object.keys(STYLES)} />
          <OptionSelect label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} options={THEMES} />
        </div>

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
