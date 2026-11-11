import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../api';
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2, Download, AlertTriangle, ShieldAlert } from 'lucide-react';

interface CsvImportTabProps {
  currentUser: User;
  onImportSuccess: () => void;
}

export const CsvImportTab: React.FC<CsvImportTabProps> = ({ currentUser, onImportSuccess }) => {
  const [csvText, setCsvText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<string[]>([]);

  const isAdmin = currentUser.role === 'ADMIN';

  const validSampleCsv = `product_code,product_name,category,price,stock_quantity,status
PRD-101,Noise-Cancelling Headphones,Audio,2499.00,30,Active
PRD-102,USB Condenser Microphone,Audio,1850.50,15,Active
PRD-103,1080p Streaming Webcam,Peripherals,1200.00,45,Active
PRD-104,Aluminum Laptop Stand,Ergonomics,650.00,60,Active
PRD-105,Multi-Port USB-C Hub,Accessories,899.00,25,Active`;

  const invalidSampleCsv = `product_code,product_name,category,price,stock_quantity,status
PRD-201,Valid Test Product 1,Electronics,1200.00,10,Active
PRD-001,Duplicate Code Already in DB,Accessories,1500.00,20,Active
PRD-203,Negative Price Item,Electronics,-450.00,15,Active
PRD-204,Invalid Stock Quantity,Displays,9500.00,-5,Active
PRD-205,Invalid Status Value,Hardware,320.00,40,Archived
PRD-201,Duplicate Product Code Within File,Electronics,1100.00,25,Active`;

  const handleLoadSample = (sampleType: 'valid' | 'invalid') => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setRowErrors([]);
    setCsvText(sampleType === 'valid' ? validSampleCsv : invalidSampleCsv);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setCsvText(content || '');
      setSuccessMessage(null);
      setErrorMessage(null);
      setRowErrors([]);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!csvText.trim()) {
      setErrorMessage('Please provide CSV content to import.');
      return;
    }

    setIsProcessing(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setRowErrors([]);

    try {
      const result = await api.importProductsCsv(csvText);
      setSuccessMessage(result.message);
      onImportSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'CSV Import failed');
      if (err.row_errors && Array.isArray(err.row_errors)) {
        setRowErrors(err.row_errors);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4">
        <div className="w-12 h-12 bg-rose-950/80 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-100 font-serif">Admin Permission Required</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Product bulk CSV import is restricted exclusively to Administrator accounts. Please switch to the Admin profile using the header profile toggle to use this feature.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-serif">CSV Product Bulk Import</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Admin tool with strict all-or-nothing validation, duplicate collision detection, and opening stock ledger recording.
          </p>
        </div>

        {/* Preset sample load buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleLoadSample('valid')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Load Valid Sample</span>
          </button>
          <button
            onClick={() => handleLoadSample('invalid')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold transition"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Load Invalid Sample (Errors)</span>
          </button>
        </div>
      </div>

      {/* Upload Zone & Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>CSV Input (Edit or Paste Directly)</span>
              </label>

              <label className="cursor-pointer inline-flex items-center space-x-1 text-xs text-amber-400 hover:text-amber-300 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload .csv File</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <textarea
              rows={12}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder="product_code,product_name,category,price,stock_quantity,status&#10;PRD-001,Keyboard,Accessories,1500,20,Active"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-xs text-emerald-300/90 font-mono leading-relaxed focus:outline-none focus:border-amber-500 resize-none"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500 font-mono">
                {csvText.trim().split(/\r?\n/).filter(Boolean).length} total line(s) detected
              </span>

              <button
                onClick={handleExecuteImport}
                disabled={isProcessing || !csvText.trim()}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Validating &amp; Importing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Validate &amp; Import Products</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Specifications & Format Reference */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-3">
            <h3 className="font-bold text-slate-200 font-serif">Format Specification</h3>
            <p className="text-slate-400 leading-relaxed">
              Required header columns in exact sequence:
            </p>
            <pre className="bg-slate-950 p-2 rounded-lg font-mono text-[11px] text-amber-300/90 border border-slate-800">
              product_code,product_name,category,price,stock_quantity,status
            </pre>

            <h4 className="font-semibold text-slate-300 pt-1">Strict Validation Rules:</h4>
            <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
              <li>Product code must be non-empty and unique.</li>
              <li>Rejects duplicate codes in file or already in DB.</li>
              <li>Price must be a non-negative decimal.</li>
              <li>Stock must be a non-negative whole number.</li>
              <li>Status must be <strong className="text-slate-200">Active</strong> or <strong className="text-slate-200">Inactive</strong>.</li>
              <li><strong className="text-rose-400">All-or-Nothing Rule:</strong> If even one row fails, 0 records are imported.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Validation Result Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-xs text-emerald-200 flex items-start space-x-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-300 text-sm">Import Successful!</p>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-xs text-rose-200 space-y-2 shadow-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-300 text-sm">Import Aborted (All-or-Nothing Policy Enforced)</p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>

          {rowErrors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-rose-500/30">
              <p className="font-semibold text-rose-300 mb-1.5">Row-level Error Details ({rowErrors.length} issues):</p>
              <div className="bg-slate-950 p-3 rounded-xl border border-rose-500/30 font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto">
                {rowErrors.map((err, i) => (
                  <div key={i} className="text-rose-300 flex items-start space-x-1">
                    <span className="text-rose-500">•</span>
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
