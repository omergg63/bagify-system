import React, { useState } from 'react';
import { Receipt, Status } from '../types';
import { TrashIcon } from './Icons';

interface ReceiptRowProps {
  receipt: Receipt;
  updateReceipt: (id: number, updatedFields: Partial<Receipt>) => void;
  deleteReceipt: (id: number) => void;
}

export const ReceiptRow: React.FC<ReceiptRowProps> = ({ receipt, updateReceipt, deleteReceipt }) => {
  const [note, setNote] = useState(receipt.note);

  const getUrgencyStyling = () => {
    if (receipt.status === Status.Done) {
      return { border: 'border-l-4 border-gray-600', text: 'text-gray-400' };
    }
    if (receipt.daysPassed > 18) {
      return { border: 'border-l-4 border-red-500', text: 'text-red-400' }; // Overdue
    }
    if (receipt.daysPassed >= 9 && receipt.daysPassed <= 18) {
      return { border: 'border-l-4 border-yellow-500', text: 'text-yellow-400' }; // Due Soon
    }
    return { border: 'border-l-4 border-green-500', text: 'text-green-400' }; // OK
  };

  const { border, text } = getUrgencyStyling();

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateReceipt(receipt.id, { status: e.target.value as Status });
  };
  
  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNote(e.target.value);
  };

  const handleNoteBlur = () => {
    if (receipt.note !== note) {
        updateReceipt(receipt.id, { note });
    }
  };
  
  const handleDelete = () => {
      if(window.confirm(`Are you sure you want to delete the receipt "${receipt.fileName}"? This action cannot be undone.`)) {
          deleteReceipt(receipt.id);
      }
  };

  return (
    <div className={`bg-gray-800/70 rounded-lg shadow-md overflow-hidden transition-all duration-300 ${border} flex flex-col md:flex-row`}>
      {/* Image & Text Column */}
      <div className="p-4 md:w-3/5 lg:w-2/3 flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <img src={receipt.imageSrc} alt="Receipt preview" className="w-full h-40 object-cover rounded-md bg-gray-700" />
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-gray-500 font-mono uppercase">Extracted Text</p>
          <div className="mt-1 h-32 overflow-y-auto p-2 border border-gray-700 rounded-md bg-gray-900/70 text-xs text-gray-400 font-mono">
            <pre className="whitespace-pre-wrap">{receipt.extractedText || 'No text extracted.'}</pre>
          </div>
        </div>
      </div>

      {/* Details & Actions Column */}
      <div className="p-4 md:w-2/5 lg:w-1/3 bg-gray-800/50 md:border-l border-t md:border-t-0 border-gray-700 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-400">Order Date</p>
              <p className="text-lg font-bold text-white">{receipt.orderDate}</p>
            </div>
             <button onClick={handleDelete} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                <TrashIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-2 text-sm">
            <p className={`font-bold ${text}`}>
              {receipt.status === Status.Done ? 'COMPLETED' : (receipt.daysPassed > 18 ? 'OVERDUE' : (receipt.daysPassed >= 9 ? 'DUE SOON' : 'OK'))}
            </p>
            <p className="text-gray-300">
              {receipt.status !== Status.Done && (receipt.daysLeft >= 0 ? `${receipt.daysLeft} days remaining` : `${Math.abs(receipt.daysLeft)} days past due`)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <select 
            value={receipt.status} 
            onChange={handleStatusChange}
            className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
          >
            {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="text"
            placeholder={receipt.status === Status.Delayed ? "Reason for delay..." : "Add a note..."}
            value={note}
            onChange={handleNoteChange}
            onBlur={handleNoteBlur}
            className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-2.5 placeholder-gray-400"
          />
        </div>
      </div>
    </div>
  );
};
