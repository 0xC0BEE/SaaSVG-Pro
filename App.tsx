import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { GeneratorControls } from './components/GeneratorControls';
import { ResultsGrid } from './components/ResultsGrid';
import { Spinner } from './components/Spinner';
import { type GeneratorOptions, type Asset, type ApiChoice } from './services/types';
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
    const vectorizerID = localStorage.getItem('vectorizerID');
    const vectorizerSecret = localStorage.getItem('vectorizerSecret');
    const recraftToken = localStorage.getItem('recraftToken');

    const keys: ApiKeys = { apiChoice: choice };
    let keysAreSet = false;

    if (choice === 'vectorizer' && vectorizerID && vectorizerSecret) {
      keys.vectorizerID = vectorizerID;
      keys.vectorizerSecret = vectorizerSecret;
      keysAreSet = true;
    } else if (choice === 'recraft' && recraftToken) {
      keys.recraftToken = recraftToken;
      keysAreSet = true;
    }

    if (keysAreSet) {
      setApiKeys(keys);
      setShowKeyModal(false);
    } else {
      setShowKeyModal(true);
    }
  }, []);

  const handleSaveKeys = (savedKeys: ApiKeys) => {
    localStorage.setItem('apiChoice', savedKeys.apiChoice);
    if (savedKeys.vectorizerID) localStorage.setItem('vectorizerID', savedKeys.vectorizerID);
    if (savedKeys.vectorizerSecret) localStorage.setItem('vectorizerSecret', savedKeys.vectorizerSecret);
    if (savedKeys.recraftToken) localStorage.setItem('recraftToken', savedKeys.recraftToken);
    
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
    if (options.mode === 'nano' && !apiKeys) {
      setShowKeyModal(true);
      showToast('Please configure your API Provider keys to use Nano mode.');
      return;
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
      setResults(assets);
    } catch (error) {
      console.error('Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      showToast(errorMessage);
    } finally {
      setIsLoading(false);
      setToastMessage(null);
    }
  }, [apiKeys]);

  if (showKeyModal) {
    return <ApiKeyModal onSave={handleSaveKeys} />;
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

      {toastMessage && isLoading && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#00D4AA]/30 text-[#00D4AA] px-6 py-3 rounded-lg shadow-2xl animate-pulse">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;
