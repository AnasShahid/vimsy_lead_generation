import { Download } from 'lucide-react';
import { api } from '../../lib/api';

interface CSVExportProps {
  filters?: Record<string, string>;
  label?: string;
}

export function CSVExport({ filters = {}, label = 'Export CSV' }: CSVExportProps) {
  const handleExport = () => {
    const url = api.exportCsvUrl(filters);
    window.open(url, '_blank');
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
    >
      <Download size={16} />
      {label}
    </button>
  );
}
