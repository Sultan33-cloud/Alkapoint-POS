import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { exportCSV } from '../../utils/csv';

export default function ExportButton({ filename, rows, headers, label = 'Export CSV' }) {
  const handle = () => {
    if (!rows || rows.length === 0) return;
    exportCSV(filename, rows, headers);
  };
  return (
    <button onClick={handle} className="ap-btn-secondary">
      <ArrowDownTrayIcon className="w-4 h-4" /> {label}
    </button>
  );
}