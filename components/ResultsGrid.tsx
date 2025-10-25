
import React from 'react';
import { type Asset } from '../services/types';
import { AssetCard } from './AssetCard';

interface ResultsGridProps {
  assets: Asset[];
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({ assets }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
      {assets.map((asset, index) => (
        <AssetCard key={`${asset.seed}-${index}`} asset={asset} />
      ))}
    </div>
  );
};
