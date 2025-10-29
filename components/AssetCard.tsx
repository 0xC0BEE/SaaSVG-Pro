import React, { useState } from 'react';
import { type Asset } from '../services/types';
import { downloadFile, downloadBase64File } from '../lib/utils';
import { DownloadIcon } from '../icons/DownloadIcon';
import { ImageIcon } from '../icons/ImageIcon';
import { VectorIcon } from '../icons/VectorIcon';
import { Editor as SvgEditor } from './Editor';
import { PNGEditor } from './PNGEditor';
import { EditIcon } from '../icons/EditIcon';
import { PreviewIcon } from '../icons/PreviewIcon';

interface AssetCardProps {
  asset: Asset;
}

type ViewMode = 'svg' | 'png';
type CardMode = 'preview' | 'edit-svg' | 'edit-png';

export const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  const [viewMode, setViewMode] = useState<ViewMode>(asset.png && !asset.svg ? 'png' : 'svg');
  const [cardMode, setCardMode] = useState<CardMode>('preview');
  
  const [editedSvg, setEditedSvg] = useState<string>(asset.svg);

  const handleDownloadSVG = () => {
    const svgToDownload = cardMode === 'edit-svg' ? editedSvg : asset.svg;
    downloadFile(svgToDownload, `saasvg-pro-${asset.seed}.svg`, 'image/svg+xml');
  };

  const handleDownloadPNG = () => {
    if (asset.png) {
      downloadBase64File(asset.png, `saasvg-pro-${asset.seed}.png`, 'image/png');
    }
  };
  
  const handleEditClick = () => {
      if (asset.svg) {
          setCardMode('edit-svg');
      } else if (asset.png) {
          setCardMode('edit-png');
      }
  }

  const isEditable = asset.svg || asset.png;

  return (
    <div className="bg-[#121212] border border-gray-800 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[#00D4AA]/10 hover:border-[#00D4AA]/30">
      <div className="aspect-square w-full bg-grid-pattern flex items-center justify-center p-2">
        {cardMode === 'edit-svg' && asset.svg ? (
           <SvgEditor svgString={editedSvg} onUpdate={setEditedSvg} />
        ) : cardMode === 'edit-png' && asset.png ? (
            <PNGEditor pngBase64={asset.png} seed={asset.seed} />
        ) : (
          <div className="w-full h-full p-6 flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-105">
            {viewMode === 'svg' && asset.svg ? (
              <div 
                className="w-full h-full text-white [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: asset.svg }} 
              />
            ) : (
              asset.png && <img src={`data:image/png;base64,${asset.png}`} alt={`Generated asset ${asset.seed}`} className="max-w-full max-h-full object-contain" />
            )}
          </div>
        )}
      </div>

      <div className="p-4 bg-[#1A1A1A]/50 border-t border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
            {isEditable && (
                 <div className="flex items-center space-x-1 bg-[#0A0A0A] p-1 rounded-md border border-gray-700">
                    <button onClick={() => setCardMode('preview')} className={`px-2 py-1 rounded flex items-center gap-1 text-xs ${cardMode === 'preview' ? 'bg-[#00D4AA] text-black' : 'text-gray-400 hover:bg-gray-700'}`}><PreviewIcon /> Preview</button>
                    <button onClick={handleEditClick} className={`px-2 py-1 rounded flex items-center gap-1 text-xs ${cardMode.startsWith('edit') ? 'bg-[#00D4AA] text-black' : 'text-gray-400 hover:bg-gray-700'}`}><EditIcon /> Editor</button>
                </div>
            )}
             {cardMode === 'preview' && asset.png && asset.svg && (
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
            {asset.png && cardMode === 'preview' && (
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

const style = document.createElement('style');
style.innerHTML = `
  .bg-grid-pattern {
    background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 20px 20px;
  }
`;
document.head.appendChild(style);