import React, { useCallback, useState } from 'react';
import { UploadIcon } from './Icons';
import { Spinner } from './Spinner';

interface FileUploaderProps {
  onProcess: (files: File[]) => void;
  isProcessing: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onProcess, isProcessing }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const allowedFiles = Array.from(files).filter(file => 
        file.type === 'image/png' || file.type === 'image/jpeg'
      );
      if (allowedFiles.length > 0) {
        onProcess(allowedFiles);
      }
    }
  };

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);
  
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [onProcess]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };
  
  return (
    <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
            ${isDragOver ? 'border-cyan-400 bg-gray-800' : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'}
            ${isProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <input 
        type="file" 
        id="file-upload" 
        className="hidden" 
        accept="image/png, image/jpeg" 
        multiple 
        onChange={onFileChange} 
        disabled={isProcessing}
      />
      <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer">
          {isProcessing ? (
              <Spinner className="w-10 h-10" />
          ) : (
            <UploadIcon className="w-10 h-10 text-gray-400" />
          )}
          <p className="mt-4 text-lg font-semibold text-gray-300">
            {isProcessing ? 'Processing Receipts...' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-500">or click to browse (PNG, JPG)</p>
      </label>
    </div>
  );
};
