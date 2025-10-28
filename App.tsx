import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { GeneratorControls } from './components/GeneratorControls';
import { ResultsGrid } from './components/ResultsGrid';
import { Spinner } from './components/Spinner';
// FIX: `VectorizerOptions` is a type and should be imported with `type`.
import { type GeneratorOptions, type Asset, type ApiChoice, type VectorizerOptions } from './services/types';
import { generateSVGs } from './services/geminiService';
import { ApiKeyModal } from './components/ApiKeyModal';

interface ApiKeys {
  apiChoice: ApiChoice;
  vectorizerID?: string;
  vectorizerSecret?: string;
  recraftToken?: string;
}

const App: React.FC = () => {
  const [results, setResults] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  useEffect(() => {
    const choice = (localStorage.getItem('apiChoice') as ApiChoice) || 'vectorizer';
    const vectorizerID = localStorage.getItem('vectorizerID') || undefined;
    const vectorizerSecret = localStorage.getItem('vectorizerSecret') || undefined;
    const recraftToken = localStorage.getItem('recraftToken') || undefined;

    const loadedKeys: ApiKeys = {
      apiChoice: choice,
      vectorizerID,
      vectorizerSecret,
      recraftToken
    };
    
    setApiKeys(loadedKeys);
  }, []);

  const handleSaveKeys = (savedKeys: ApiKeys) => {
    localStorage.setItem('apiChoice', savedKeys.apiChoice);

    if (savedKeys.apiChoice === 'vectorizer') {
      localStorage.setItem('vectorizerID', savedKeys.vectorizerID || '');
      localStorage.setItem('vectorizerSecret', savedKeys.vectorizerSecret || '');
      localStorage.removeItem('recraftToken');
    } else if (savedKeys.apiChoice === 'recraft') {
      localStorage.setItem('recraftToken', savedKeys.recraftToken || '');
      localStorage.removeItem('vectorizerID');
      localStorage.removeItem('vectorizerSecret');
    }
    
    setApiKeys(savedKeys);
    setShowKeyModal(false);
  };


  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleGenerate = useCallback(async (options: Omit<GeneratorOptions, 'apiChoice' | 'vectorizerID' | 'vectorizerSecret' | 'recraftToken'>) => {
    if (options.mode === 'nano' && options.generateSvg) {
      const keysAreSet = (apiKeys?.apiChoice === 'vectorizer' && apiKeys.vectorizerID && apiKeys.vectorizerSecret) ||
                         (apiKeys?.apiChoice === 'recraft' && apiKeys.recraftToken);
      if (!keysAreSet) {
        setShowKeyModal(true);
        return;
      }
    }
    
    setIsLoading(true);
    setResults([]);
    setToastMessage(`Generating with ${options.mode} mode...`);

    try {
      const fullOptions: GeneratorOptions = {
        ...options,
        ...apiKeys,
        apiChoice: apiKeys?.apiChoice || 'vectorizer',
      };
      const assets = await generateSVGs(fullOptions, (status) => {
        setToastMessage(status);
      });
      
      const svgFailed = options.mode === 'nano' && options.generateSvg && assets.some(a => a.png && !a.svg);
      if (svgFailed) {
        showToast('SVG conversion failed—showing PNG fallback.');
      }

      setResults(assets);
    } catch (error) {
      console.error('Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      showToast(errorMessage);
    } finally {
      setIsLoading(false);
      // Don't clear toast immediately if it's a failure message
      if (!toastMessage?.includes('failed')) {
        setToastMessage(null);
      }
    }
  }, [apiKeys, toastMessage]);

  if (showKeyModal) {
    return <ApiKeyModal onSave={handleSaveKeys} initialKeys={apiKeys || undefined} />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100 font-sans">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <GeneratorControls onSubmit={handleGenerate} isLoading={isLoading} />
        
        {isLoading && !results.length && (
          <div className="flex flex-col items-center justify-center text-center mt-16">
            <Spinner />
            {toastMessage && <p className="mt-4 text-lg text-gray-400">{toastMessage}</p>}
          </div>
        )}

        {!isLoading && !results.length && (
            <div className="text-center mt-16 text-gray-500">
                <p className="text-2xl mb-2">Welcome to SaaSVG Pro</p>
                <p>Select your mode and enter a prompt to start generating.</p>
            </div>
        )}
        
        {results.length > 0 && <ResultsGrid assets={results} />}
      </main>

      {toastMessage && (isLoading || toastMessage.includes('failed')) && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border ${toastMessage.includes('failed') ? 'border-yellow-400/30 text-yellow-400' : 'border-[#00D4AA]/30 text-[#00D4AA]'} px-6 py-3 rounded-lg shadow-2xl animate-pulse`}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;
