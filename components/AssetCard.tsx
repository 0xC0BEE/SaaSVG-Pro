
import React, { useState, useEffect } from 'react';
import { type Asset } from '../services/types';
import { downloadFile, downloadBase64File, removeGreenScreen } from '../lib/utils';
import { DownloadIcon } from '../icons/DownloadIcon';
import { ImageIcon } from '../icons/ImageIcon';
import { VectorIcon } from '../icons/VectorIcon';
import { Spinner } from './Spinner';

interface AssetCardProps {
  asset: Asset;
  previewBackgroundColor: string;
}

type ViewMode = 'svg' | 'png';

export const AssetCard: React.FC<AssetCardProps> = ({ asset, previewBackgroundColor }) => {
  const [viewMode, setViewMode] = useState<ViewMode>(asset.png && !asset.svg ? 'png' : 'svg');
  const [processedPngSrc, setProcessedPngSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (asset.png) {
      setIsProcessing(true);
      removeGreenScreen(asset.png)
        .then(processedDataURL => {
          setProcessedPngSrc(processedDataURL);
        })
        .catch(error => {
          console.error('Failed to remove green screen:', error);
          // Fallback to original image
          setProcessedPngSrc(`data:image/png;base64,${asset.png}`);
        })
        .finally(() => {
          setIsProcessing(false);
        });
    }
  }, [asset.png]);


  const handleDownloadSVG = () => {
    downloadFile(asset.svg, `saasvg-pro-${asset.seed}.svg`, 'image/svg+xml');
  };

  const handleDownloadPNG = () => {
    if (processedPngSrc) {
      const base64Data = processedPngSrc.split(',')[1];
      if (base64Data) {
        downloadBase64File(base64Data, `saasvg-pro-${asset.seed}.png`, 'image/png');
      }
    } else if (asset.png) {
      downloadBase64File(asset.png, `saasvg-pro-${asset.seed}.png`, 'image/png');
    }
  };

  return (
    <div className="bg-[#121212] border border-gray-800 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[#00D4AA]/10 hover:border-[#00D4AA]/30">
      <div className="aspect-square w-full flex items-center justify-center p-2 relative">
        <div 
          className="absolute inset-0"
          style={{ backgroundColor: previewBackgroundColor }}
        />
        <div className="w-full h-full p-6 flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-105 relative">
          {viewMode === 'svg' && asset.svg ? (
            <div 
              className="w-full h-full text-white [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: asset.svg }} 
            />
          ) : (
            isProcessing 
              ? <Spinner /> 
              : (processedPngSrc && <img src={processedPngSrc} alt={`Generated asset ${asset.seed}`} className="max-w-full max-h-full object-contain" />)
          )}
        </div>
      </div>

      <div className="p-4 bg-[#1A1A1A]/50 border-t border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
             {asset.png && asset.svg && (
                 <div className="flex items-center space-x-1 bg-[#0A0A0A] p-1 rounded-md border border-gray-700">
                    <button onClick={() => setViewMode('svg')} className={`px-2 py-1 rounded flex items-center gap-1 text-xs ${viewMode === 'svg' ? 'bg-[#00D4AA] text-black' : 'text-gray-400 hover:bg-gray-700'}`}><VectorIcon /> SVG</button>
                    <button onClick={() => setViewMode('png')} className={`px-2 py-1 rounded flex items-center gap-1 text-xs ${viewMode === 'png' ? 'bg-[#00D4AA] text-black' : 'text-gray-400 hover:bg-gray-700'}`}><ImageIcon /> PNG</button>
                </div>
            )}
        </div>
        <div className="flex items-center gap-2">
            {asset.svg && (
              <button onClick={handleDownloadSVG} className="p-2 text-gray-400 hover:text-[#00D4AA] transition-colors rounded-full hover:bg-gray-700" title="Download SVG">
                  <DownloadIcon />
                  <span className="sr-only">Download SVG</span>
              </button>
            )}
            {asset.png && (
                <button onClick={handleDownloadPNG} className="p-2 text-gray-400 hover:text-[#00D4AA] transition-colors rounded-full hover:bg-gray-700" title="Download PNG">
                    <DownloadIcon />
                    <span className="sr-only">Download PNG</span>
                </button>
            )}
        </div>
      </div>
    </div>
  );
};
