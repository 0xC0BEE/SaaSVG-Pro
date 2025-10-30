
import React, { useState } from 'react';
import { type Asset } from '../services/types';
import { AssetCard } from './AssetCard';

interface ResultsGridProps {
  assets: Asset[];
}

const BACKGROUND_COLORS = [
  '#ECECFF', // 0
  '#DBDAF8', // 1
  '#CBCBF2', // 2
  '#B8B5E5', // 3
  '#8485D0', // 4
  '#5154B6', // 5
  '#3E39C0', // 6
  '#1E45D0', // 7
  '#181040', // 8
  '#120C30', // 9
];

export const ResultsGrid: React.FC<ResultsGridProps> = ({ assets }) => {
  const [bgColorIndex, setBgColorIndex] = useState(0);

  const handleBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    setBgColorIndex(newIndex);
    const newColor = BACKGROUND_COLORS[newIndex];
    console.log(`BG slider: ${newColor}`);
  };

  const previewBackgroundColor = BACKGROUND_COLORS[bgColorIndex];
  const shouldShowSlider = assets.length > 0 && assets.some(asset => asset.png);

  return (
    <div>
      {shouldShowSlider && (
        <div className="mb-6 bg-[#121212] p-4 rounded-lg border border-gray-800">
          <label htmlFor="bg-slider" className="block text-sm font-medium text-gray-400 mb-2">
            Preview Background
          </label>
          <div className="flex items-center gap-4">
            <input
              id="bg-slider"
              type="range"
              min="0"
              max="9"
              step="1"
              value={bgColorIndex}
              onChange={handleBgColorChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb"
            />
            <div
              className="w-8 h-8 rounded border-2 border-gray-500"
              style={{ backgroundColor: previewBackgroundColor }}
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
        {assets.map((asset, index) => (
          <AssetCard 
            key={`${asset.seed}-${index}`} 
            asset={asset}
            previewBackgroundColor={previewBackgroundColor}
          />
        ))}
      </div>
    </div>
  );
};
