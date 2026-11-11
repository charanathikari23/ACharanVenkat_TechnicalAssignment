import React from 'react';
import { StockMovement } from '../types';
import { Layers, ArrowDownRight, ArrowUpRight, PlusCircle, RefreshCw } from 'lucide-react';

interface StockLedgerTabProps {
  movements: StockMovement[];
  onRefreshMovements: () => void;
}

export const StockLedgerTab: React.FC<StockLedgerTabProps> = ({
  movements,
  onRefreshMovements,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-serif">Stock Movement Audit Ledger</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log tracking all inventory adjustments, order deductions, and cancellations
          </p>
        </div>
        <button
          onClick={onRefreshMovements}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Movement Type</th>
                <th className="py-3.5 px-4 text-center">Change</th>
                <th className="py-3.5 px-4">Related Order</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
                <th className="py-3.5 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Layers className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    No stock movements logged yet.
                  </td>
                </tr>
              ) : (
                movements.map(m => {
                  const isPositive = m.quantity_change > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {m.timestamp}
                      </td>
                      <td className="py-3.5 px-4 text-slate-200">
                        <span className="font-mono text-amber-400 font-bold mr-2">
                          {m.product_code}
                        </span>
                        <span>{m.product_name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            m.movement_type === 'ORDER_DEDUCT'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                              : m.movement_type === 'ORDER_RESTORE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : m.movement_type === 'OPENING'
                              ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {m.movement_type === 'ORDER_DEDUCT' && <ArrowDownRight className="w-3 h-3 mr-1" />}
                          {m.movement_type === 'ORDER_RESTORE' && <ArrowUpRight className="w-3 h-3 mr-1" />}
                          {m.movement_type === 'OPENING' && <PlusCircle className="w-3 h-3 mr-1" />}
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                          {isPositive ? `+${m.quantity_change}` : m.quantity_change}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {m.related_order_number ? (
                          <span className="text-amber-400/90 hover:underline">{m.related_order_number}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={m.reason}>
                        {m.reason}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {m.created_by_name || `User #${m.created_by}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
