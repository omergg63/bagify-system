import React from 'react';
import { Receipt } from '../types';
import { ReceiptRow } from './ReceiptRow';

interface ReceiptListProps {
  receipts: Receipt[];
  updateReceipt: (id: number, updatedFields: Partial<Receipt>) => void;
  deleteReceipt: (id: number) => void;
}

export const ReceiptList: React.FC<ReceiptListProps> = ({ receipts, updateReceipt, deleteReceipt }) => {
  if (receipts.length === 0) {
    return (
      <div className="text-center py-24 bg-gray-800/50 rounded-lg border border-gray-700">
        <h3 className="text-xl font-medium text-gray-300">No receipts have been scanned.</h3>
        <p className="mt-2 text-gray-500">Upload receipt images to begin analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        {receipts.map(receipt => (
            <ReceiptRow 
              key={receipt.id} 
              receipt={receipt} 
              updateReceipt={updateReceipt} 
              deleteReceipt={deleteReceipt}
            />
        ))}
    </div>
  );
};
