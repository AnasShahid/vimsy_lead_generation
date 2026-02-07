import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface CSVImportProps {
  onImportFile: (file: File) => void;
  onImportText: (text: string) => void;
  loading?: boolean;
}

export function CSVImport({ onImportFile, onImportText, loading }: CSVImportProps) {
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportFile(file);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode('file')}
          className={`px-3 py-1 text-sm rounded ${
            mode === 'file' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => setMode('text')}
          className={`px-3 py-1 text-sm rounded ${
            mode === 'text' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          Paste CSV
        </button>
      </div>

      {mode === 'file' ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 transition-colors"
        >
          <Upload className="mx-auto mb-2 text-gray-400" size={24} />
          <p className="text-sm text-gray-600">Click to upload CSV file</p>
          <p className="text-xs text-gray-400 mt-1">CSV with a "url" column</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste URLs (one per line) or CSV content..."
            className="w-full h-32 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            onClick={() => {
              if (text.trim()) onImportText(text.trim());
            }}
            disabled={!text.trim() || loading}
            className="mt-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Importing...' : 'Import URLs'}
          </button>
        </div>
      )}
    </div>
  );
}
