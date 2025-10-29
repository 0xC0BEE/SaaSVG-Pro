import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { GeneratorControls } from './components/GeneratorControls';
import { ResultsGrid } from './components/ResultsGrid';
import { Spinner } from './components/Spinner';
import { type GeneratorOptions, type Asset } from './services/types';
import { generateSVGs } from './services/geminiService';

const App: React.FC = () => {
  const [results, setResults] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleGenerate = useCallback(async (options: Omit<GeneratorOptions, 'apiChoice' | 'vectorizerID' | 'vectorizerSecret' | 'recraftToken'>) => {
    setIsLoading(true);
    setResults([]);
    setToastMessage(`Generating with ${options.mode} mode...`);

    try {
      const assets = await generateSVGs(options, (status) => {
        setToastMessage(status);
      });
      
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
  }, [toastMessage]);

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