import React, { useState } from 'react';
import { Download, FileText, File, Database } from 'lucide-react';

interface ExportButtonProps {
  data: any[];
  filename: string;
  title?: string;
  className?: string;
}

function ExportButton({ data, filename, title = 'Exportera', className = '' }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportToCSV = async () => {
    if (!data || data.length === 0) return;

    setExporting(true);
    try {
      // Get headers from first object
      const headers = Object.keys(data[0]);
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle values that might contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  };

  const exportToJSON = async () => {
    if (!data || data.length === 0) return;

    setExporting(true);
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting JSON:', error);
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  };

  const exportToPDF = async () => {
    // This would require a PDF library like jsPDF or react-pdf
    // For now, we'll show a placeholder
    alert('PDF-export kommer snart!');
    setIsOpen(false);
  };

  if (!data || data.length === 0) {
    return (
      <button
        disabled
        className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed ${className}`}
      >
        <Download className="w-4 h-4 mr-2" />
        {title}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting}
        className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 ${className}`}
      >
        {exporting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {title}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
            <div className="py-1">
              <button
                onClick={exportToCSV}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <FileText className="w-4 h-4 mr-3 text-green-600" />
                Exportera som CSV
              </button>
              <button
                onClick={exportToJSON}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <Database className="w-4 h-4 mr-3 text-blue-600" />
                Exportera som JSON
              </button>
              <button
                onClick={exportToPDF}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <File className="w-4 h-4 mr-3 text-red-600" />
                Exportera som PDF
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ExportButton;