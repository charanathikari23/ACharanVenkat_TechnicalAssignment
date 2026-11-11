import React, { useState } from 'react';
import { api } from '../api';
import { Bug, CheckCircle2, Play, AlertCircle, Plus, Trash2, ArrowRight } from 'lucide-react';

export const DebuggingTab: React.FC = () => {
  const [items, setItems] = useState([
    { qty: 2, rate: 100 },
    { qty: 3, rate: 50 },
  ]);
  const [buggyResult, setBuggyResult] = useState<number | null>(null);
  const [buggyError, setBuggyError] = useState<string | null>(null);
  const [correctedResult, setCorrectedResult] = useState<number | null>(null);
  const [correctedError, setCorrectedError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleAddItem = () => {
    setItems([...items, { qty: 1, rate: 10 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'qty' | 'rate', value: string) => {
    const updated = [...items];
    const num = parseFloat(value);
    updated[index] = { ...updated[index], [field]: isNaN(num) ? 0 : num };
    setItems(updated);
  };

  const handleRunExecution = async () => {
    setIsRunning(true);
    setBuggyError(null);
    setCorrectedError(null);
    try {
      const res = await api.calculateTotalDebug(items);
      setBuggyResult(res.buggy_result);
      setBuggyError(res.buggy_error);
      setCorrectedResult(res.corrected_result);
      setCorrectedError(res.corrected_error);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 font-serif">Part 11: Debugging Exercise &amp; Technical Analysis</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Code analysis, root cause diagnosis, edge-case hardening, and test proof for the total calculation routine.
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Code Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buggy Code */}
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
            <span className="font-bold text-rose-400 text-xs font-mono flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>1. Faulty Function (Original)</span>
            </span>
            <span className="text-[10px] bg-rose-950 px-2 py-0.5 rounded text-rose-300 font-bold border border-rose-500/30">
              BUGGY
            </span>
          </div>

          <pre className="text-xs font-mono text-rose-300/90 bg-slate-950 p-4 rounded-xl border border-rose-900/50 leading-relaxed overflow-x-auto">
{`def calculate_total(items):
    total = 0
    for item in items:
        amount = item["qty"] * item["rate"]
        total = amount  # <-- CRITICAL BUG: Overwrites total on each step!
    return total`}
          </pre>

          <div className="text-xs text-slate-300 space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <p className="font-semibold text-rose-300">Failure Analysis for Sample Input:</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When given <code className="text-amber-400">[&#123;"qty": 2, "rate": 100&#125;, &#123;"qty": 3, "rate": 50&#125;]</code>, iteration 1 sets <code className="text-slate-300">total = 200</code>. Iteration 2 overwrites <code className="text-slate-300">total = 150</code>. The function erroneously returns <strong className="text-rose-400">150</strong> instead of the expected <strong className="text-emerald-400">350</strong>.
            </p>
          </div>
        </div>

        {/* Corrected Code */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
            <span className="font-bold text-emerald-400 text-xs font-mono flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>2. Corrected &amp; Hardened Function (Production)</span>
            </span>
            <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-300 font-bold border border-emerald-500/30">
              VERIFIED
            </span>
          </div>

          <pre className="text-xs font-mono text-emerald-300/90 bg-slate-950 p-4 rounded-xl border border-emerald-900/50 leading-relaxed overflow-x-auto">
{`from decimal import Decimal

def calculate_total(items):
    if not isinstance(items, (list, tuple)):
        raise TypeError("Items must be a list or tuple")
    total = Decimal("0.00")
    for idx, item in enumerate(items, 1):
        if "qty" not in item or "rate" not in item:
            raise ValueError(f"Item {idx} missing 'qty' or 'rate'")
        qty = float(item["qty"])
        if not qty.is_integer() or qty <= 0:
            raise ValueError(f"Item {idx} qty must be positive integer")
        rate = Decimal(str(item["rate"]))
        if rate < Decimal("0.00"):
            raise ValueError(f"Item {idx} rate cannot be negative")
        total += Decimal(int(qty)) * rate  # <-- ACCUMULATES CORRECTLY
    return float(round(total, 2))`}
          </pre>

          <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <p className="font-semibold text-emerald-300">Key Enhancements Added:</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Accumulates with <code className="text-emerald-400">total += amount</code>; uses Decimal arithmetic to avoid float drift; gracefully returns <code className="text-slate-300">0.00</code> on empty list; validates positive whole number quantity and non-negative rate.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Live Verification Sandbox */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-100 font-serif text-sm">Interactive Sandbox: Test with Custom Items</h3>
            <p className="text-xs text-slate-400">
              Run both functions simultaneously on the inputs below to observe the differential outputs.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddItem}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
            <button
              onClick={handleRunExecution}
              disabled={isRunning}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Both Functions</span>
            </button>
          </div>
        </div>

        {/* Input Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((it, idx) => (
            <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2 relative">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono font-bold text-amber-400">Item #{idx + 1}</span>
                {items.length > 1 && (
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="text-slate-500 hover:text-rose-400 p-0.5"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Quantity (qty):</label>
                  <input
                    type="number"
                    value={it.qty}
                    onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Unit Rate ($):</label>
                  <input
                    type="number"
                    value={it.rate}
                    onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparative Output Box */}
        {(buggyResult !== null || correctedResult !== null) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-rose-950/40 border border-rose-500/40 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-rose-300 block">Buggy Function Output:</span>
                <span className="text-[11px] text-rose-400/80">Returns only the last item amount</span>
              </div>
              <span className="text-2xl font-mono font-bold text-rose-400">
                ${buggyResult !== null ? buggyResult.toFixed(2) : 'Error'}
              </span>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-300 block">Corrected Function Output:</span>
                <span className="text-[11px] text-emerald-400/80">Accurately accumulates all item amounts</span>
              </div>
              <span className="text-2xl font-mono font-bold text-emerald-400">
                ${correctedResult !== null ? correctedResult.toFixed(2) : 'Error'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Part 11 Requirement Checklist Explanation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
        <h3 className="font-bold text-slate-100 font-serif text-sm">
          Technical Assignment Response Guide (Part 11 Deliverable)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <p className="font-bold text-amber-400">1. Cause of the Incorrect Result</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Assignment statement <code className="text-rose-400">total = amount</code> overwrote the accumulated sum on each step of the loop, thereby ignoring all previous items and returning solely the last item.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <p className="font-bold text-amber-400">2. Behaviour for an Empty List</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              For an empty list <code className="text-emerald-400">[]</code>, the loop does not run and the function safely returns <code className="text-slate-200">0.00</code>.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <p className="font-bold text-amber-400">3. Behaviour for Missing Keys</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              The buggy code raised an unhandled <code className="text-rose-400">KeyError</code>. The corrected code intercepts missing keys and raises a clear <code className="text-amber-300">ValueError("Item X missing 'qty' or 'rate'")</code>.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <p className="font-bold text-amber-400">4. Validation of Invalid Quantities &amp; Rates</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Enforces whole-number integer constraints for quantities (&gt; 0) and non-negative numbers for rates (&ge; 0.00), preventing invalid financial computations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
