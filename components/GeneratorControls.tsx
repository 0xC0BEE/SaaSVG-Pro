import React, { useState } from 'react';
import { type GeneratorOptions, type GeneratorMode } from '../services/types';
import { THEMES, COLORS, NARRATIVES } from '../constants';

interface GeneratorControlsProps {
  onSubmit: (options: GeneratorOptions) => void;
  isLoading: boolean;
}

export const GeneratorControls: React.FC<GeneratorControlsProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('diverse analyst celebrating project success');
  const [mode, setMode] = useState<GeneratorMode>('nano');
  const [theme, setTheme] = useState(THEMES[0]);
  const [colors, setColors] = useState(COLORS[1]);
  const [narrative, setNarrative] = useState(NARRATIVES[0]);
  const [seed, setSeed] = useState(28100);
  const [quickMode, setQuickMode] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ prompt, mode, theme, colors, narrative, seed, quick: quickMode });
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
           <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">Mode</label>
              <div className="flex items-center space-x-2 bg-[#1A1A1A] p-1 rounded-md border border-gray-700">
                <button type="button" onClick={() => setMode('classic')} className={`flex-1 py-1 rounded ${mode === 'classic' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Classic</button>
                <button type="button" onClick={() => setMode('nano')} className={`flex-1 py-1 rounded ${mode === 'nano' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Nano</button>
              </div>
           </div>
          <OptionSelect label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} options={THEMES} />
          <OptionSelect label="Colors" value={colors} onChange={(e) => setColors(e.target.value)} options={COLORS} />
          <OptionSelect label="Narrative" value={narrative} onChange={(e) => setNarrative(e.target.value)} options={NARRATIVES} />
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-400 mb-1">Trace Quality</label>
            <button
              type="button"
              onClick={() => setQuickMode(!quickMode)}
              disabled={mode !== 'nano'}
              className={`w-full h-[42px] relative inline-flex items-center rounded-md border transition-colors ${
                mode !== 'nano' ? 'cursor-not-allowed bg-gray-800 border-gray-700' : 'cursor-pointer bg-[#1A1A1A] border-gray-700'
              }`}
            >
              <span className={`absolute left-1 top-1 h-8 w-1/2 rounded-sm bg-[#00D4AA] transition-transform ${quickMode ? 'translate-x-0' : 'translate-x-[95%]'}`}/>
              <span className={`relative z-10 w-1/2 text-center text-sm font-semibold transition-colors ${quickMode ? 'text-black' : 'text-gray-300'}`}>Fast</span>
              <span className={`relative z-10 w-1/2 text-center text-sm font-semibold transition-colors ${!quickMode ? 'text-black' : 'text-gray-300'}`}>Quality</span>
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#00D4AA] text-black font-bold py-3 rounded-md hover:bg-opacity-90 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? 'Generating...' : 'Generate SVGs'}
        </button>
      </form>
    </div>
  );
};
