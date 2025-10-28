import React, { useState } from 'react';
import { type ApiChoice } from '../services/types';

interface ApiKeyModalProps {
  onSave: (keys: {
    apiChoice: ApiChoice;
    vectorizerID?: string;
    vectorizerSecret?: string;
    recraftToken?: string;
  }) => void;
  initialKeys?: {
    apiChoice: ApiChoice;
    vectorizerID?: string;
    vectorizerSecret?: string;
    recraftToken?: string;
  };
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, initialKeys }) => {
  const [apiChoice, setApiChoice] = useState<ApiChoice>(initialKeys?.apiChoice || 'vectorizer');
  const [vectorizerId, setVectorizerId] = useState(initialKeys?.vectorizerID || '');
  const [vectorizerSecret, setVectorizerSecret] = useState(initialKeys?.vectorizerSecret || '');
  const [recraftToken, setRecraftToken] = useState(initialKeys?.recraftToken || '');

  const isSaveDisabled = () => {
    if (apiChoice === 'vectorizer') {
      return !vectorizerId.trim() || !vectorizerSecret.trim();
    }
    if (apiChoice === 'recraft') {
      return !recraftToken.trim();
    }
    return true;
  };

  const handleSave = () => {
    if (isSaveDisabled()) return;

    onSave({
      apiChoice,
      vectorizerID: vectorizerId,
      vectorizerSecret: vectorizerSecret,
      recraftToken: recraftToken,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#121212] p-8 rounded-lg border border-gray-800 shadow-2xl w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold text-white mb-2">Configure API Provider</h2>
        <p className="text-gray-400 mb-6">
          To use the high-quality "Nano" mode, please choose a provider and enter your API credentials.
          Your keys will be saved in your browser's local storage.
        </p>

        <div className="mb-4">
            <label className="text-sm font-medium text-gray-400 mb-2 block">API Provider</label>
            <div className="flex items-center space-x-2 bg-[#1A1A1A] p-1 rounded-md border border-gray-700">
                <button type="button" onClick={() => setApiChoice('vectorizer')} className={`flex-1 py-1 rounded ${apiChoice === 'vectorizer' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Vectorizer.ai</button>
                <button type="button" onClick={() => setApiChoice('recraft')} className={`flex-1 py-1 rounded ${apiChoice === 'recraft' ? 'bg-[#00D4AA] text-black font-semibold' : 'text-gray-300'}`}>Recraft.ai</button>
            </div>
        </div>

        <div className="space-y-4">
          {apiChoice === 'vectorizer' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-1 block">API Key (Username)</label>
                <input
                  type="password"
                  value={vectorizerId}
                  onChange={(e) => setVectorizerId(e.target.value)}
                  placeholder="Enter your Vectorizer.ai API Key"
                  className="w-full bg-[#1A1A1A] border border-gray-700 rounded-md px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#00D4AA] focus:border-[#00D4AA] outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-1 block">API Secret (Password)</label>
                <input
                  type="password"
                  value={vectorizerSecret}
                  onChange={(e) => setVectorizerSecret(e.target.value)}
                  placeholder="Enter your Vectorizer.ai API Secret"
                  className="w-full bg-[#1A1A1A] border border-gray-700 rounded-md px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#00D4AA] focus:border-[#00D4AA] outline-none"
                />
              </div>
            </>
          )}

          {apiChoice === 'recraft' && (
             <div>
                <label className="text-sm font-medium text-gray-400 mb-1 block">Replicate API Token</label>
                <input
                  type="password"
                  value={recraftToken}
                  onChange={(e) => setRecraftToken(e.target.value)}
                  placeholder="Enter your Replicate API Token"
                  className="w-full bg-[#1A1A1A] border border-gray-700 rounded-md px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#00D4AA] focus:border-[#00D4AA] outline-none"
                />
              </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaveDisabled()}
          className="w-full mt-6 bg-[#00D4AA] text-black font-bold py-3 rounded-md hover:bg-opacity-90 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Save and Continue
        </button>
      </div>
    </div>
  );
};
