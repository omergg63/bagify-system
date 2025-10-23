import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, Status } from './types';
import { processReceiptFile } from './services/geminiService';
import { Dashboard } from './components/Dashboard';
import { ReceiptList } from './components/ReceiptList';
import { FileUploader } from './components/FileUpload';
import { Spinner } from './components/Spinner';
import { GoogleDriveSync } from './components/GoogleDriveSync';

interface UserMessage {
  type: 'success' | 'error';
  text: string;
}

const App: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    try {
      const savedReceipts = localStorage.getItem('receipts');
      return savedReceipts ? JSON.parse(savedReceipts) : [];
    } catch (error) {
      console.error("Failed to parse receipts from localStorage", error);
      return [];
    }
  });

  const [processingFiles, setProcessingFiles] = useState<string[]>([]);
  const [userMessage, setUserMessage] = useState<UserMessage | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('receipts', JSON.stringify(receipts));
    } catch (error) {
      console.error("Failed to save receipts to localStorage", error);
      setUserMessage({ type: 'error', text: "Could not save receipt data. Your browser's storage might be full." });
    }
  }, [receipts]);

  const handleFilesProcess = async (files: File[]) => {
    setUserMessage(null);
    const newProcessingFiles = files.map(f => f.name);
    setProcessingFiles(prev => [...prev, ...newProcessingFiles]);

    const newReceipts: Receipt[] = [];
    let hadError = false;
    for (const file of files) {
      try {
        const newReceipt = await processReceiptFile(file);
        newReceipts.push(newReceipt);
      } catch (e) {
        console.error(`Failed to process ${file.name}`, e);
        setUserMessage({ type: 'error', text: `An error occurred while analyzing ${file.name}. Please try again.` });
        hadError = true;
      }
    }
    
    setReceipts(prev => [...newReceipts, ...prev]);
    setProcessingFiles(prev => prev.filter(name => !newProcessingFiles.includes(name)));

    if (newReceipts.length > 0) {
      setUserMessage({ type: 'success', text: `Successfully processed ${newReceipts.length} receipt(s).` });
    } else if (!hadError && files.length > 0) {
      setUserMessage({ type: 'error', text: 'Could not process any of the selected files.' });
    }
    
    setTimeout(() => setUserMessage(null), 5000);
  };

  const updateReceipt = useCallback((id: number, updatedFields: Partial<Receipt>) => {
    setReceipts(prevReceipts =>
      prevReceipts.map(r => (r.id === id ? { ...r, ...updatedFields } : r))
    );
  }, []);

  const deleteReceipt = useCallback((id: number) => {
    setReceipts(prevReceipts => prevReceipts.filter(r => r.id !== id));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wider">Bagify OS</h1>
            <p className="text-cyan-400 text-sm">Order Intelligence Dashboard</p>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard receipts={receipts} />

        <div className="mt-8">
            <div className="max-w-3xl mx-auto">
              <FileUploader onProcess={handleFilesProcess} isProcessing={processingFiles.length > 0} />
              
              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-700"></div>
                <span className="flex-shrink mx-4 text-gray-500 font-bold">OR</span>
                <div className="flex-grow border-t border-gray-700"></div>
              </div>
              
              <GoogleDriveSync onProcess={handleFilesProcess} isProcessing={processingFiles.length > 0} />
            </div>

            {userMessage && (
              <div className={`p-3 rounded-lg text-center my-4 max-w-3xl mx-auto ${userMessage.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                {userMessage.text}
              </div>
            )}

            {processingFiles.length > 0 && (
              <div className="my-4 p-4 bg-gray-800/60 rounded-lg border border-gray-700 max-w-3xl mx-auto">
                <div className="flex items-center gap-3">
                  <Spinner />
                  <span className="font-medium text-cyan-400">Analyzing {processingFiles.length} receipt(s)...</span>
                </div>
                <ul className="list-disc list-inside mt-2 text-sm text-gray-400">
                  {processingFiles.map(name => <li key={name}>{name}</li>)}
                </ul>
              </div>
            )}
            
            <div className="mt-6">
                <ReceiptList 
                    receipts={receipts} 
                    updateReceipt={updateReceipt}
                    deleteReceipt={deleteReceipt}
                />
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;
